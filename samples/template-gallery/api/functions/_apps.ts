// The calls `uip codedapp publish` and `uip codedapp deploy` make, as a library:
// upload the .nupkg to the tenant feed, register it with Apps, deploy a version into a folder.
// Plus the two lookups the gallery needs: the user's folders and the tenant's name.

export interface PlatformSession {
  baseUrl: string;
  orgId: string;
  tenantId: string;
  accessToken: string;
}

export interface Folder {
  key: string;
  displayName: string;
  fullyQualifiedName: string;
}

const ORIGIN = 'origin=uip&command=codedapp';
const APPS_API = '/apps_/default/api/v1/default';
const PACKAGE_ALREADY_EXISTS = 1004;

export class AppsClient {
  constructor(private readonly s: PlatformSession) {}

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return { Authorization: `Bearer ${this.s.accessToken}`, 'x-uipath-internal-tenantid': this.s.tenantId, ...extra };
  }

  private async ok(res: Response, what: string): Promise<Response> {
    if (res.ok) return res;
    const body = await res.text().catch(() => '');
    throw new Error(`${what}: ${res.status} ${res.statusText} ${body.slice(0, 300)}`);
  }

  /** Tenant name (as shown in URLs) from Orchestrator's current-user lookup; works with any token that can call Orchestrator. */
  async tenantName(): Promise<string> {
    const res = await this.ok(
      await fetch(`${this.s.baseUrl}/${this.s.orgId}/${this.s.tenantId}/orchestrator_/odata/Users/UiPath.Server.Configuration.OData.GetCurrentUserExtended`, {
        headers: this.headers(),
      }),
      'current user',
    );
    const data = (await res.json()) as { TenantDisplayName?: string; TenancyName?: string };
    const name = data.TenantDisplayName ?? data.TenancyName;
    if (!name) throw new Error('tenant name not available from Orchestrator');
    return name;
  }

  /** Folders the caller can see in the tenant (Orchestrator GetAllForCurrentUser, tenant GUID in the path). */
  async folders(): Promise<Folder[]> {
    const out: Folder[] = [];
    for (let skip = 0; ; skip += 100) {
      const res = await this.ok(
        await fetch(`${this.s.baseUrl}/${this.s.orgId}/${this.s.tenantId}/orchestrator_/api/Folders/GetAllForCurrentUser?take=100&skip=${skip}`, {
          headers: this.headers(),
        }),
        'list folders',
      );
      const data = (await res.json()) as { PageItems?: Array<Record<string, unknown>>; pageItems?: Array<Record<string, unknown>> };
      const items = data.PageItems ?? data.pageItems ?? [];
      for (const f of items) {
        out.push({
          key: String(f.Key ?? f.key ?? ''),
          displayName: String(f.DisplayName ?? f.displayName ?? ''),
          fullyQualifiedName: String(f.FullyQualifiedName ?? f.fullyQualifiedName ?? f.DisplayName ?? ''),
        });
      }
      if (items.length < 100) break;
    }
    return out.filter((f) => f.key);
  }

  /** Orchestrator UploadPackage into the tenant feed. An existing identical version is fine. */
  async uploadPackage(nupkg: Uint8Array, fileName: string): Promise<'uploaded' | 'exists'> {
    const form = new FormData();
    form.append('uploads[]', new Blob([nupkg as BlobPart], { type: 'application/octet-stream' }), fileName);
    const res = await fetch(
      `${this.s.baseUrl}/${this.s.orgId}/${this.s.tenantId}/orchestrator_/odata/Processes/UiPath.Server.Configuration.OData.UploadPackage()?${ORIGIN}`,
      { method: 'POST', headers: { Authorization: `Bearer ${this.s.accessToken}` }, body: form },
    );
    if (res.status === 409) {
      const body = (await res.json().catch(() => ({}))) as { errorCode?: number };
      if (body.errorCode === PACKAGE_ALREADY_EXISTS) return 'exists';
    }
    await this.ok(res, 'upload package');
    return 'uploaded';
  }

  /** Apps: register the uploaded package as a coded app version. A version registered earlier is reused. */
  async registerCodedApp(tenantName: string, packageName: string, packageVersion: string, title: string) {
    const res = await fetch(`${this.s.baseUrl}/${this.s.orgId}${APPS_API}/models/apps/codedapp/publish?${ORIGIN}`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ tenantName, packageName, packageVersion, title, schema: {} }),
    });
    if (res.status === 400) {
      // "Published app with package name X and version Y already exists": the body names the existing app.
      const body = (await res.clone().json().catch(() => ({}))) as { appId?: string; deployVersion?: number; errorMessageV2?: string };
      if (body.appId && body.deployVersion !== undefined && /already exists/i.test(body.errorMessageV2 ?? '')) {
        return { systemName: body.appId, deployVersion: body.deployVersion, reused: true };
      }
    }
    await this.ok(res, 'register coded app');
    const data = (await res.json()) as { definition?: { systemName?: string }; deployVersion?: number };
    if (!data.definition?.systemName || data.deployVersion === undefined) {
      throw new Error('register coded app: response has no systemName or deployVersion');
    }
    return { systemName: data.definition.systemName, deployVersion: data.deployVersion, reused: false };
  }

  /** Apps: deploy a registered version into a folder, with the user's external app as the client. */
  async deploy(systemName: string, deployVersion: number, folderKey: string, title: string, routingName: string, clientId: string, environmentVariables?: string) {
    const body: Record<string, unknown> = { title, routingName, clientId };
    if (environmentVariables) body.environmentVariables = environmentVariables;
    const res = await this.ok(
      await fetch(`${this.s.baseUrl}/${this.s.orgId}${APPS_API}/models/${encodeURIComponent(systemName)}/publish/versions/${deployVersion}/deploy?${ORIGIN}`, {
        method: 'POST',
        headers: this.headers({ 'Content-Type': 'application/json', 'x-uipath-folderkey': folderKey }),
        body: JSON.stringify(body),
      }),
      'deploy',
    );
    const data = (await res.json()) as { id?: string; warnings?: unknown };
    return { id: data.id ?? '', warnings: Array.isArray(data.warnings) ? (data.warnings as string[]) : [] };
  }

  /** The deployed app, for its launch URL. */
  async deployedCodedApp(packageName: string, folderKey: string): Promise<{ url?: string; launchUrl?: string }> {
    const res = await fetch(`${this.s.baseUrl}/${this.s.orgId}${APPS_API}/models/deployed/codedapps/${encodeURIComponent(packageName)}?${ORIGIN}`, {
      headers: this.headers({ 'x-uipath-folderkey': folderKey }),
    });
    if (!res.ok) return {};
    const data = (await res.json()) as { definition?: { codedAppMetadata?: { url?: string; launchUrl?: string } } };
    return data.definition?.codedAppMetadata ?? {};
  }
}
