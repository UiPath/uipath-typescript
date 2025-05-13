export interface Bucket {
    Id: string;
    Name?: string;
    Description?: string;
    FolderKey?: string;
}
export interface BucketUri {
    Uri: string;
    Headers: {
        Keys: string[];
        Values: string[];
    };
    RequiresAuth: boolean;
}
