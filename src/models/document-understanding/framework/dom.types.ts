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
    DocumentId?: string | null;
    ContentType?: string | null;
    Length?: number;
    Pages?: Page[] | null;
    DocumentMetadata?: Metadata[] | null;
}

export interface Metadata {
    Key?: string | null;
    Value?: string | null;
}

export interface Page {
    PageIndex?: number;
    Size?: number[];
    Sections?: PageSection[] | null;
    PageMarkups?: PageMarkup[] | null;
    ProcessingSource?: ProcessingSource;
    IndexInText?: number;
    TextLength?: number;
    SkewAngle?: number;
    Rotation?: Rotation;
    PageMetadata?: Metadata[] | null;
}

export interface PageMarkup {
    Box?: number[];
    Polygon?: number[] | null;
    OcrConfidence?: number;
    Text?: string | null;
    MarkupType?: MarkupType;
}

export interface PageSection {
    IndexInText?: number;
    Language?: string | null;
    Length?: number;
    Rotation?: Rotation;
    SkewAngle?: number;
    Type?: SectionType;
    WordGroups?: WordGroup[] | null;
}

export interface Word {
    Box?: number[];
    Polygon?: number[] | null;
    IndexInText?: number;
    OcrConfidence?: number;
    Text?: string | null;
    VisualLineNumber?: number;
    TextType?: TextType;
    MarkupType?: MarkupType[] | null;
}

export interface WordGroup {
    IndexInText?: number;
    Length?: number;
    Type?: WordGroupType;
    Words?: Word[] | null;
}
