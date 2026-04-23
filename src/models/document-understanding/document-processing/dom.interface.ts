// Auto-generated from UiPath.DocumentProcessing.Contracts — do not edit manually.

export interface DuBox {
    Top: number;
    Left: number;
    Width: number;
    Height: number;
}

export interface DuDigitizationOutput {
    Dom?: DuDocument;
    Text: string;
}

export interface DuPolygon {
    Points?: Array<{ X: number; Y: number }>;
}

export enum DuSerializationNamingConvention {
    PascalCase = 0,
    CamelCase = 1,
}

export interface DuSerializationSettings {
    NamingConvention?: DuSerializationNamingConvention;
}

export interface DuDocument {
    DocumentId: string;
    ContentType: string;
    Length: number;
    Pages?: DuPage[];
    DocumentMetadata?: DuMetadata[];
}

export enum DuMarkupType {
    Unknown = 0,
    Circled = 1,
    Underlined = 2,
    Strikethrough = 3,
}

export interface DuMetadata {
    Key: string;
    Value: string;
}

export interface DuPage {
    PageIndex: number;
    Size?: DuBox;
    Sections?: DuPageSection[];
    PageMarkups?: DuPageMarkup[];
    ProcessingSource?: DuProcessingSource;
    IndexInText: number;
    TextLength: number;
    SkewAngle: number;
    Rotation: DuRotation | null;
    PageMetadata?: DuMetadata[];
}

export interface DuPageMarkup {
    Box?: DuBox;
    Polygon?: DuPolygon;
    OcrConfidence: number;
    Text: string;
    MarkupType?: DuMarkupType;
}

export interface DuPageSection {
    IndexInText: number;
    Language: string;
    Length: number;
    Rotation?: DuRotation;
    SkewAngle: number;
    Type?: DuSectionType;
    WordGroups?: DuWordGroup[];
}

export enum DuProcessingSource {
    Unknown = 0,
    Ocr = 1,
    Pdf = 2,
    PlainText = 3,
    PdfAndOcr = 4,
}

export enum DuRotation {
    None = 0,
    Rotated90 = 1,
    Rotated180 = 2,
    Rotated270 = 3,
    Other = 4,
}

export enum DuSectionType {
    Vertical = 0,
    Paragraph = 1,
    Header = 2,
    Footer = 3,
    Table = 4,
}

export enum DuTextType {
    Unknown = 0,
    Text = 1,
    Checkbox = 2,
    Handwriting = 3,
    Barcode = 4,
    QRcode = 5,
    Stamp = 6,
    Logo = 7,
    Circle = 8,
    Underline = 9,
    Cut = 10,
}

export interface DuWord {
    Box?: DuBox;
    Polygon?: DuPolygon;
    IndexInText: number;
    OcrConfidence: number;
    Text: string;
    VisualLineNumber: number;
    TextType?: DuTextType;
    MarkupType?: DuMarkupType[];
}

export interface DuWordGroup {
    IndexInText: number;
    Length: number;
    Type?: DuWordGroupType;
    Words?: DuWord[];
}

export enum DuWordGroupType {
    Sentence = 0,
    TableCell = 1,
    TableRowEnd = 2,
    Heading = 3,
    Other = 4,
}

