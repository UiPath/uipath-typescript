import type { Bindings, BindingResource, PropertyDefinition } from '../webapp-file-handler/types.js';
import type { DetectedResource } from './types.js';

const BINDINGS_VERSION = '2.0';
const BINDINGS_METADATA_VERSION = '2.2';

function makePropDef(value: string, displayName: string): PropertyDefinition {
  return { defaultValue: value, isExpression: false, displayName };
}

const ACTIVITY_NAME_MAP: Record<string, string> = {
  asset: 'retrieve_async',
  process: 'invoke_async',
  bucket: 'retrieve_async',
  queue: 'retrieve_async',
  index: 'retrieve_async',
  app: 'create_async',
  connection: 'retrieve_async',
};

function toBindingResource(detected: DetectedResource): BindingResource | null {
  const { resource, name, id, folder } = detected;

  if (resource === 'connection') {
    const connId = name ?? id;
    if (!connId) return null;
    return {
      resource,
      key: connId,
      value: { ConnectionId: makePropDef(connId, 'Connection') },
      metadata: { BindingsVersion: BINDINGS_METADATA_VERSION, Connector: '', UseConnectionService: 'True' },
    };
  }

  const identifier = name ?? id;
  if (!identifier) return null;
  const folderValue = folder ?? '';
  const key = folderValue ? `${identifier}.${folderValue}` : identifier;
  return {
    resource,
    key,
    value: {
      name: makePropDef(identifier, 'Name'),
      folderPath: makePropDef(folderValue, 'Folder Path'),
    },
    metadata: {
      ActivityName: ACTIVITY_NAME_MAP[resource] ?? 'retrieve_async',
      BindingsVersion: BINDINGS_METADATA_VERSION,
      DisplayLabel: 'FullName',
    },
  };
}

export function formatBindings(detected: DetectedResource[]): Bindings {
  const resources: BindingResource[] = [];
  for (const d of detected) {
    const r = toBindingResource(d);
    if (r) resources.push(r);
  }
  return { version: BINDINGS_VERSION, resources };
}
