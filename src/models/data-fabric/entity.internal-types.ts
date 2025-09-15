// SQL Type Interface
interface FieldType {
  name: string;
}

// Field Definition Interface
interface FieldDefinition {
  name: string;
  sqlType: FieldType;
}

// Entity Metadata Response Interface
export interface EntityMetadataResponse {
  fields: FieldDefinition[];
}
