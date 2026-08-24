/**
 * Access request store.
 *
 * The demo store keeps requests in `localStorage`, which makes the app fully
 * runnable with zero setup — but it is browser-local, so requester and
 * approver must use the same browser. For a real multi-user deployment,
 * implement `RequestStore` against a Data Fabric entity (see the commented
 * sketch at the bottom) so requests are shared and server-side access rules
 * apply.
 */

export type RequestKind = 'group' | 'role';
export type RequestStatus = 'pending' | 'approved' | 'denied';

export interface AccessRequest {
  id: string;
  kind: RequestKind;
  /** GUID of the requested group or role. */
  targetId: string;
  /** Display name of the requested group or role. */
  targetName: string;
  justification: string;
  requestedById: string;
  requestedByName: string;
  status: RequestStatus;
  createdTime: string;
  /** Set when an admin resolves the request. */
  resolvedByName?: string;
  resolvedTime?: string;
}

export interface RequestStore {
  list(): Promise<AccessRequest[]>;
  create(request: AccessRequest): Promise<void>;
  update(request: AccessRequest): Promise<void>;
}

const STORAGE_KEY = 'access-request-portal.requests';

class LocalRequestStore implements RequestStore {
  async list(): Promise<AccessRequest[]> {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AccessRequest[]) : [];
  }

  async create(request: AccessRequest): Promise<void> {
    const all = await this.list();
    all.unshift(request);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }

  async update(request: AccessRequest): Promise<void> {
    const all = await this.list();
    const index = all.findIndex(r => r.id === request.id);
    if (index >= 0) all[index] = request;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
}

export function createRequestStore(): RequestStore {
  return new LocalRequestStore();
}

/*
 * Data Fabric variant (multi-user): create an `AccessRequests` entity with
 * fields matching `AccessRequest`, then:
 *
 *   import { Entities } from '@uipath/uipath-typescript/entities';
 *
 *   class DataFabricRequestStore implements RequestStore {
 *     constructor(private entities: Entities, private entityId: string) {}
 *     list() { return this.entities.getAllRecords(this.entityId).then(r => r.items as AccessRequest[]); }
 *     create(req: AccessRequest) { return this.entities.insertRecordById(this.entityId, req, {}).then(() => undefined); }
 *     update(req: AccessRequest) { return this.entities.updateRecordById(this.entityId, req.id, req, {}).then(() => undefined); }
 *   }
 */
