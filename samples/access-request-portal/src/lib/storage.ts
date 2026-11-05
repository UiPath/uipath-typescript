/**
 * Access request store — backed by a shared Data Fabric entity.
 *
 * Requests live in the `AccessRequests` entity (name in `./config`), so every
 * user — requester and approver alike — sees the same queue from any browser.
 * Requires the `DataFabric.Data.Read` / `DataFabric.Data.Write` scopes on the
 * app registration, and Data Fabric data access for the signed-in user.
 * The request id is Data Fabric's system `Id`.
 *
 * Two Data Fabric behaviours the store absorbs so the UI does not have to:
 * - A write is not immediately visible to queries. `create()` and `update()`
 *   wait until the queue reflects the change before resolving, so a screen
 *   that reloads right after them shows the new state.
 * - An ISO-8601 string written to a text field comes back re-serialized: wrapped
 *   in literal quotes and with a `+00:00` offset. `readStoredTime()` normalizes it.
 *
 * NOTE: the entity is coordination data, not authority. Anyone with DF data
 * access could edit request rows directly — but a forged "approved" row grants
 * nothing: the actual group/role grant happens only when an admin's own token
 * calls the platform APIs, which re-authorize server-side.
 */

import type { UiPath } from '@uipath/uipath-typescript/core';
import { Entities, QueryFilterOperator } from '@uipath/uipath-typescript/entities';
import type { EntityRecord, EntityRef } from '@uipath/uipath-typescript/entities';
import { ACCESS_REQUESTS_ENTITY_NAME } from './config';

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

/** What callers provide on create — the store assigns the id. */
export type NewAccessRequest = Omit<AccessRequest, 'id'>;

export interface RequestStore {
  list(): Promise<AccessRequest[]>;
  create(request: NewAccessRequest): Promise<AccessRequest>;
  update(request: AccessRequest): Promise<void>;
}

/** DF record shape: the entity's user-defined columns plus the system Id. */
interface AccessRequestRecord extends EntityRecord {
  kind: string;
  targetId: string;
  targetName: string;
  justification: string | null;
  requestedById: string;
  requestedByName: string | null;
  status: string;
  createdTime: string | null;
  resolvedByName?: string | null;
  resolvedTime?: string | null;
}

/** How long a write may take to become visible to queries before we give up waiting. */
const VISIBILITY_ATTEMPTS = 10;
const VISIBILITY_DELAY_MS = 500;

/** Data Fabric hands ISO timestamps written to text fields back quoted; return a clean ISO string. */
function readStoredTime(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value.replace(/^"|"$/g, ''));
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
}

function toAccessRequest(record: AccessRequestRecord): AccessRequest {
  return {
    id: record.Id,
    kind: record.kind as RequestKind,
    targetId: record.targetId,
    targetName: record.targetName,
    justification: record.justification ?? '',
    requestedById: record.requestedById,
    requestedByName: record.requestedByName ?? '',
    status: record.status as RequestStatus,
    createdTime: readStoredTime(record.createdTime) ?? '',
    resolvedByName: record.resolvedByName ?? undefined,
    resolvedTime: readStoredTime(record.resolvedTime),
  };
}

class DataFabricRequestStore implements RequestStore {
  private readonly entity: EntityRef;

  constructor(private entities: Entities, entityName: string) {
    this.entity = { name: entityName };
  }

  async list(): Promise<AccessRequest[]> {
    const result = await this.entities.queryRecords(this.entity);
    return result.items
      .map(record => toAccessRequest(record as AccessRequestRecord))
      .sort((a, b) => b.createdTime.localeCompare(a.createdTime));
  }

  async create(request: NewAccessRequest): Promise<AccessRequest> {
    const inserted = await this.entities.insertRecord(this.entity, { ...request });
    await this.awaitVisible(inserted.Id, () => true);
    return { ...request, id: inserted.Id };
  }

  async update(request: AccessRequest): Promise<void> {
    const { id, ...fields } = request;
    await this.entities.updateRecord(this.entity, id, { ...fields });
    await this.awaitVisible(id, record => record.status === request.status);
  }

  /** Polls the query path until the record is there and `isCurrent` accepts it; gives up quietly after the budget. */
  private async awaitVisible(id: string, isCurrent: (record: AccessRequestRecord) => boolean): Promise<void> {
    for (let attempt = 0; attempt < VISIBILITY_ATTEMPTS; attempt++) {
      const result = await this.entities.queryRecords(this.entity, {
        filterGroup: { queryFilters: [{ fieldName: 'Id', operator: QueryFilterOperator.Equals, value: id }] },
      });
      const record = result.items[0] as AccessRequestRecord | undefined;
      if (record && isCurrent(record)) return;
      await new Promise(resolve => setTimeout(resolve, VISIBILITY_DELAY_MS));
    }
  }
}

export function createRequestStore(sdk: UiPath): RequestStore {
  return new DataFabricRequestStore(new Entities(sdk), ACCESS_REQUESTS_ENTITY_NAME);
}
