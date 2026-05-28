// Auto-generated from the OpenAPI spec — do not edit manually.

import type { ClassifierDocumentTypeType } from './model.types';
import type { DocumentTaxonomy } from './taxonomy.types';

export enum ProjectProperties {
    IsPredefined = 'IsPredefined',
    SupportsTags = 'SupportsTags',
    SupportsVersions = 'SupportsVersions',
    IsSplittingEnabled = 'IsSplittingEnabled',
}

export enum ProjectType {
    Classic = 'Classic',
    Modern = 'Modern',
    IXP = 'IXP',
    Unknown = 'Unknown',
}

export enum ResourceStatus {
    Unknown = 'Unknown',
    NotStarted = 'NotStarted',
    ExportInProgress = 'ExportInProgress',
    ExportCompleted = 'ExportCompleted',
    InProgress = 'InProgress',
    Suspended = 'Suspended',
    Resuming = 'Resuming',
    Available = 'Available',
    Error = 'Error',
    Deleting = 'Deleting',
}

export enum ResourceType {
    Specialized = 'Specialized',
    Generative = 'Generative',
    Custom = 'Custom',
    Unknown = 'Unknown',
}

export interface Classifier {
    Id?: string | null;
    Name?: string | null;
    ResourceType?: ResourceType;
    Status?: ResourceStatus;
    DocumentTypeIds?: string[] | null;
    DetailsUrl?: string | null;
    SyncUrl?: string | null;
    AsyncUrl?: string | null;
    ProjectVersion?: number | null;
    ProjectVersionName?: string | null;
    Properties?: ProjectProperties[] | null;
}

export interface DiscoveredDocumentType {
    Id?: string | null;
    Name?: string | null;
    ResourceType?: ResourceType;
    DetailsUrl?: string | null;
}

export interface DiscoveredExtractorResourceSummaryResponse {
    Id?: string | null;
    Name?: string | null;
    ResourceType?: ResourceType;
    DetailsUrl?: string | null;
    DocumentTypeId?: string | null;
    DocumentTypeName?: string | null;
    ProjectVersion?: number | null;
    ProjectVersionName?: string | null;
    CreatedOn?: string | null;
    Description?: string | null;
}

export interface DiscoveredProjectVersionResponseV2_0 {
    Version?: number;
    VersionName?: string | null;
    Tags?: string[] | null;
    Date?: string;
    Deployed?: boolean;
}

export interface DiscoveredResourceSummaryResponse {
    Id?: string | null;
    Name?: string | null;
    ResourceType?: ResourceType;
    DetailsUrl?: string | null;
    ProjectVersion?: number | null;
    ProjectVersionName?: string | null;
    CreatedOn?: string | null;
    Description?: string | null;
}

export interface Extractor {
    Id?: string | null;
    Name?: string | null;
    DocumentTypeId?: string | null;
    ResourceType?: ResourceType;
    Status?: ResourceStatus;
    DetailsUrl?: string | null;
    SyncUrl?: string | null;
    AsyncUrl?: string | null;
    ProjectVersion?: number | null;
    ProjectVersionName?: string | null;
    Description?: string | null;
}

export interface GetClassifierDetailsDocumentTypeResponse {
    Id?: string | null;
    Name?: string | null;
    ResourceType?: ResourceType;
    Type?: ClassifierDocumentTypeType;
    CreatedOn?: string | null;
}

export interface GetClassifierDetailsResponse {
    Id?: string | null;
    Name?: string | null;
    ResourceType?: ResourceType;
    Status?: ResourceStatus;
    DocumentTypes?: GetClassifierDetailsDocumentTypeResponse[] | null;
    CreatedOn?: string | null;
    SyncUrl?: string | null;
    AsyncUrl?: string | null;
    ProjectVersion?: number | null;
    ProjectVersionName?: string | null;
    Properties?: ProjectProperties[] | null;
}

export interface GetClassifiersResponse {
    Classifiers?: Classifier[] | null;
}

export interface GetDocumentTypeDetailsByTagResponseV2_0 {
    Id?: string | null;
    Name?: string | null;
    ResourceType?: ResourceType;
    CreatedOn?: string | null;
    DocumentTaxonomy?: DocumentTaxonomy;
}

export interface GetDocumentTypeDetailsResponseV2_0 {
    Id?: string | null;
    Name?: string | null;
    ResourceType?: ResourceType;
    CreatedOn?: string | null;
    Classifiers?: DiscoveredResourceSummaryResponse[] | null;
    Extractors?: DiscoveredResourceSummaryResponse[] | null;
}

export interface GetDocumentTypesResponse {
    DocumentTypes?: DiscoveredDocumentType[] | null;
}

export interface GetExtractorDetailsResponseV2_0 {
    Id?: string | null;
    Name?: string | null;
    ResourceType?: ResourceType;
    Status?: ResourceStatus;
    ProjectId?: string;
    ProjectVersion?: number | null;
    ProjectVersionName?: string | null;
    DocumentTypeName?: string | null;
    DocumentTypeId?: string | null;
    CreatedOn?: string | null;
    SyncUrl?: string | null;
    AsyncUrl?: string | null;
    Description?: string | null;
    DocumentTaxonomy?: DocumentTaxonomy;
}

export interface GetExtractorsResponse {
    Extractors?: Extractor[] | null;
}

export interface GetProjectDetailsResponseV2_0 {
    Id?: string;
    Name?: string | null;
    Description?: string | null;
    Type?: ProjectType;
    Properties?: ProjectProperties[] | null;
    DocumentTypes?: DiscoveredResourceSummaryResponse[] | null;
    Classifiers?: DiscoveredResourceSummaryResponse[] | null;
    Extractors?: DiscoveredExtractorResourceSummaryResponse[] | null;
    ProjectVersions?: DiscoveredProjectVersionResponseV2_0[] | null;
    CreatedOn?: string | null;
}

export interface GetProjectsResponse {
    Projects?: Project[] | null;
}

export interface GetProjectTaxonomyResponse {
    DocumentTaxonomy?: DocumentTaxonomy;
}

export interface GetTagsResponse {
    Tags?: TagEntity[] | null;
}

export interface Project {
    Id?: string;
    Name?: string | null;
    Type?: ProjectType;
    Description?: string | null;
    CreatedOn?: string | null;
    DetailsUrl?: string | null;
    DigitizationStartUrl?: string | null;
    ClassifiersDiscoveryUrl?: string | null;
    ExtractorsDiscoveryUrl?: string | null;
    Properties?: ProjectProperties[] | null;
}

export interface TagEntity {
    Name?: string | null;
    ProjectVersion?: number | null;
    ProjectVersionName?: string | null;
    Extractors?: TaggedExtractor[] | null;
    Classifiers?: TaggedClassifier[] | null;
}

export interface TaggedClassifier {
    Name?: string | null;
    DocumentTypes?: DiscoveredDocumentType[] | null;
    SyncUrl?: string | null;
    AsyncUrl?: string | null;
}

export interface TaggedExtractor {
    Name?: string | null;
    DocumentType?: DiscoveredDocumentType;
    SyncUrl?: string | null;
    AsyncUrl?: string | null;
}
