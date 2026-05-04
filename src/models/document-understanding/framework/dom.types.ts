// Auto-generated from the OpenAPI spec — do not edit manually.

export enum MarkupType {
    Unknown = 'Unknown',
    Circled = 'Circled',
    Underlined = 'Underlined',
    Strikethrough = 'Strikethrough',
}

export enum ProcessingSource {
    Unknown = 'Unknown',
    Ocr = 'Ocr',
    Pdf = 'Pdf',
    PlainText = 'PlainText',
    PdfAndOcr = 'PdfAndOcr',
}

export enum Rotation {
    None = 'None',
    Rotated90 = 'Rotated90',
    Rotated180 = 'Rotated180',
    Rotated270 = 'Rotated270',
    Other = 'Other',
}

export enum SectionType {
    Vertical = 'Vertical',
    Paragraph = 'Paragraph',
    Header = 'Header',
    Footer = 'Footer',
    Table = 'Table',
}

export enum TextType {
    Unknown = 'Unknown',
    Text = 'Text',
    Checkbox = 'Checkbox',
    Handwriting = 'Handwriting',
    Barcode = 'Barcode',
    QRcode = 'QRcode',
    Stamp = 'Stamp',
    Logo = 'Logo',
    Circle = 'Circle',
    Underline = 'Underline',
    Cut = 'Cut',
}

export enum WordGroupType {
    Sentence = 'Sentence',
    TableCell = 'TableCell',
    TableRowEnd = 'TableRowEnd',
    Heading = 'Heading',
    Other = 'Other',
}

export interface DocumentEntity {
    documentId?: string | null;
    contentType?: string | null;
    length?: number;
    pages?: Page[] | null;
    documentMetadata?: Metadata[] | null;
}

export interface Metadata {
    key?: string | null;
    value?: string | null;
}

export interface Page {
    pageIndex?: number;
    size?: number[];
    sections?: PageSection[] | null;
    pageMarkups?: PageMarkup[] | null;
    processingSource?: ProcessingSource;
    indexInText?: number;
    textLength?: number;
    skewAngle?: number;
    rotation?: Rotation;
    pageMetadata?: Metadata[] | null;
}

export interface PageMarkup {
    box?: number[];
    polygon?: number[] | null;
    ocrConfidence?: number;
    text?: string | null;
    markupType?: MarkupType;
}

export interface PageSection {
    indexInText?: number;
    language?: string | null;
    length?: number;
    rotation?: Rotation;
    skewAngle?: number;
    type?: SectionType;
    wordGroups?: WordGroup[] | null;
}

export interface Word {
    box?: number[];
    polygon?: number[] | null;
    indexInText?: number;
    ocrConfidence?: number;
    text?: string | null;
    visualLineNumber?: number;
    textType?: TextType;
    markupType?: MarkupType[] | null;
}

export interface WordGroup {
    indexInText?: number;
    length?: number;
    type?: WordGroupType;
    words?: Word[] | null;
}
