export type ParamKind = 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'json';

export interface ParamProperty {
  name: string;
  optional: boolean;
  typeText: string;
}

export interface ParamManifest {
  name: string;
  optional: boolean;
  typeText: string;
  kind: ParamKind;
  enumValues?: (string | number)[];
  properties?: ParamProperty[];
}

export interface MethodManifest {
  name: string;
  description?: string;
  example?: string;
  params: ParamManifest[];
  returnType: string;
}

export interface ServiceManifest {
  name: string;
  className: string;
  subpath: string;
  methods: MethodManifest[];
}

export interface VersionManifest {
  version: string;
  services: ServiceManifest[];
}
