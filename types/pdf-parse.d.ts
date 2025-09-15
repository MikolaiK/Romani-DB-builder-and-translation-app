/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'pdf-parse' {
  interface PDFInfo {
    PDFFormatVersion?: string;
    IsAcroFormPresent?: boolean;
    IsXFAPresent?: boolean;
    Producer?: string;
    Creator?: string;
    Author?: string;
    Title?: string;
    CreationDate?: string;
    ModDate?: string;
    Pages?: number;
  }
  interface PDFMetadata { metadata?: unknown }
  interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata?: PDFMetadata;
    text: string;
    version: string;
  }
  function pdfParse(dataBuffer: Buffer | Uint8Array | ArrayBuffer | string, options?: unknown): Promise<PDFData>;
  export = pdfParse;
}
