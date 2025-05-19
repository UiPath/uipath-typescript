export interface QueryResponse {
    jsonValue: string;
    totalRecordCount: number;
  }

export interface EntityDataQueryRequest {
    filter?: string;
    orderBy?: string[];
    select?: string[];
    skip?: number;
    top?: number;
    count?: boolean;
  } 