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
    id?: string | null;
    name?: string | null;
    resourceType?: ResourceType;
    status?: ResourceStatus;
    documentTypeIds?: string[] | null;
    detailsUrl?: string | null;
    syncUrl?: string | null;
    asyncUrl?: string | null;
    projectVersion?: number | null;
    projectVersionName?: string | null;
    properties?: ProjectProperties[] | null;
}

export interface DiscoveredDocumentType {
    id?: string | null;
    name?: string | null;
    resourceType?: ResourceType;
    detailsUrl?: string | null;
}

export interface DiscoveredExtractorResourceSummaryResponse {
    id?: string | null;
    name?: string | null;
    resourceType?: ResourceType;
    detailsUrl?: string | null;
    documentTypeId?: string | null;
    documentTypeName?: string | null;
    projectVersion?: number | null;
    projectVersionName?: string | null;
    createdOn?: string | null;
    description?: string | null;
}

export interface DiscoveredProjectVersionResponseV2_0 {
    version?: number;
    versionName?: string | null;
    tags?: string[] | null;
    date?: string;
    deployed?: boolean;
}

export interface DiscoveredResourceSummaryResponse {
    id?: string | null;
    name?: string | null;
    resourceType?: ResourceType;
    detailsUrl?: string | null;
    projectVersion?: number | null;
    projectVersionName?: string | null;
    createdOn?: string | null;
    description?: string | null;
}

export interface Extractor {
    id?: string | null;
    name?: string | null;
    documentTypeId?: string | null;
    resourceType?: ResourceType;
    status?: ResourceStatus;
    detailsUrl?: string | null;
    syncUrl?: string | null;
    asyncUrl?: string | null;
    projectVersion?: number | null;
    projectVersionName?: string | null;
    description?: string | null;
}

export interface GetClassifierDetailsDocumentTypeResponse {
    id?: string | null;
    name?: string | null;
    resourceType?: ResourceType;
    type?: ClassifierDocumentTypeType;
    createdOn?: string | null;
}

export interface GetClassifierDetailsResponse {
    id?: string | null;
    name?: string | null;
    resourceType?: ResourceType;
    status?: ResourceStatus;
    documentTypes?: GetClassifierDetailsDocumentTypeResponse[] | null;
    createdOn?: string | null;
    syncUrl?: string | null;
    asyncUrl?: string | null;
    projectVersion?: number | null;
    projectVersionName?: string | null;
    properties?: ProjectProperties[] | null;
}

export interface GetClassifiersResponse {
    classifiers?: Classifier[] | null;
}

export interface GetDocumentTypeDetailsByTagResponseV2_0 {
    id?: string | null;
    name?: string | null;
    resourceType?: ResourceType;
    createdOn?: string | null;
    documentTaxonomy?: DocumentTaxonomy;
}

export interface GetDocumentTypeDetailsResponseV2_0 {
    id?: string | null;
    name?: string | null;
    resourceType?: ResourceType;
    createdOn?: string | null;
    classifiers?: DiscoveredResourceSummaryResponse[] | null;
    extractors?: DiscoveredResourceSummaryResponse[] | null;
}

export interface GetDocumentTypesResponse {
    documentTypes?: DiscoveredDocumentType[] | null;
}

export interface GetExtractorDetailsResponseV2_0 {
    id?: string | null;
    name?: string | null;
    resourceType?: ResourceType;
    status?: ResourceStatus;
    projectId?: string;
    projectVersion?: number | null;
    projectVersionName?: string | null;
    documentTypeName?: string | null;
    documentTypeId?: string | null;
    createdOn?: string | null;
    syncUrl?: string | null;
    asyncUrl?: string | null;
    description?: string | null;
    documentTaxonomy?: DocumentTaxonomy;
}

export interface GetExtractorsResponse {
    extractors?: Extractor[] | null;
}

export interface GetProjectDetailsResponseV2_0 {
    id?: string;
    name?: string | null;
    description?: string | null;
    type?: ProjectType;
    properties?: ProjectProperties[] | null;
    documentTypes?: DiscoveredResourceSummaryResponse[] | null;
    classifiers?: DiscoveredResourceSummaryResponse[] | null;
    extractors?: DiscoveredExtractorResourceSummaryResponse[] | null;
    projectVersions?: DiscoveredProjectVersionResponseV2_0[] | null;
    createdOn?: string | null;
}

export interface GetProjectsResponse {
    projects?: Project[] | null;
}

export interface GetProjectTaxonomyResponse {
    documentTaxonomy?: DocumentTaxonomy;
}

export interface GetTagsResponse {
    tags?: TagEntity[] | null;
}

export interface Project {
    id?: string;
    name?: string | null;
    type?: ProjectType;
    description?: string | null;
    createdOn?: string | null;
    detailsUrl?: string | null;
    digitizationStartUrl?: string | null;
    classifiersDiscoveryUrl?: string | null;
    extractorsDiscoveryUrl?: string | null;
    properties?: ProjectProperties[] | null;
}

export interface TagEntity {
    name?: string | null;
    projectVersion?: number | null;
    projectVersionName?: string | null;
    extractors?: TaggedExtractor[] | null;
    classifiers?: TaggedClassifier[] | null;
}

export interface TaggedClassifier {
    name?: string | null;
    documentTypes?: DiscoveredDocumentType[] | null;
    syncUrl?: string | null;
    asyncUrl?: string | null;
}

export interface TaggedExtractor {
    name?: string | null;
    documentType?: DiscoveredDocumentType;
    syncUrl?: string | null;
    asyncUrl?: string | null;
}
