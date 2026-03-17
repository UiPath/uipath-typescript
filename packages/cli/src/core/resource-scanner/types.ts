export type ResourceType =
  | 'asset'
  | 'process'
  | 'bucket'
  | 'queue'
  | 'index'
  | 'app'
  | 'connection';

export interface ResourceMethodMetadata {
  resource: ResourceType;
  idParam?: string;
  idParamIndex?: number;
  nameParam?: string;
  nameParamIndex?: number;
  folderIdParam?: string;
  folderIdParamIndex?: number;
  folderParam?: string;
  folderParamIndex?: number;
}

export interface DetectedResource {
  resource: ResourceType;
  name?: string;
  id?: string;
  folder?: string;
  sourceFile: string;
  line: number;
}

export interface ScanWarning {
  sourceFile: string;
  line: number;
  message: string;
}

export interface ScanResult {
  resources: DetectedResource[];
  warnings: ScanWarning[];
}

export function getResourceKey(r: DetectedResource): string {
  const id = r.name ?? r.id ?? '';
  const folder = r.folder ?? '';
  return folder ? `${id}.${folder}` : id;
}
