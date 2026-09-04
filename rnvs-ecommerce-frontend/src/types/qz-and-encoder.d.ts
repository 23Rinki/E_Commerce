// Neither package ships TypeScript types, so we declare the minimal surface we actually use.

declare module 'qz-tray' {
  interface QzPrinterConfig {
    [key: string]: unknown;
  }

  interface QzConfigsApi {
    create(printer: string, options?: Record<string, unknown>): QzPrinterConfig;
  }

  interface QzPrintersApi {
    find(query?: string): Promise<string | string[]>;
  }

  interface QzWebsocketApi {
    connect(options?: Record<string, unknown>): Promise<void>;
    disconnect(): Promise<void>;
    isActive(): boolean;
  }

  interface QzSecurityApi {
    setCertificatePromise(resolver: (resolve: (cert: string) => void) => void): void;
    setSignatureAlgorithm(algorithm: string): void;
    setSignaturePromise(
      signer: (toSign: string) => (resolve: (sig: string) => void, reject: (err: unknown) => void) => void,
    ): void;
  }

  type QzPrintData = { type: 'raw' | 'pixel'; format?: string; data: string | Uint8Array | number[] }[];

  interface Qz {
    websocket: QzWebsocketApi;
    printers: QzPrintersApi;
    configs: QzConfigsApi;
    security: QzSecurityApi;
    print(config: QzPrinterConfig, data: QzPrintData): Promise<void>;
  }

  const qz: Qz;
  export default qz;
}

declare module '@point-of-sale/receipt-printer-encoder' {
  interface ReceiptPrinterEncoderOptions {
    language?: 'esc-pos' | 'star-line' | 'star-prnt';
    printerModel?: string;
    columns?: number;
  }

  export default class ReceiptPrinterEncoder {
    constructor(options?: ReceiptPrinterEncoderOptions);
    initialize(): this;
    codepage(codepage: string): this;
    text(value: string): this;
    line(value: string): this;
    newline(count?: number): this;
    bold(value?: boolean): this;
    italic(value?: boolean): this;
    underline(value?: boolean): this;
    invert(value?: boolean): this;
    size(width: number, height?: number): this;
    width(width: number): this;
    height(height: number): this;
    align(alignment: 'left' | 'center' | 'right'): this;
    rule(options?: Record<string, unknown>): this;
    table(columns: Record<string, unknown>[], rows: string[][]): this;
    barcode(value: string, symbology: string, height?: number): this;
    qrcode(value: string, model?: number, size?: number, errorlevel?: string): this;
    image(image: unknown, width: number, height: number, algorithm?: string, threshold?: number): this;
    cut(mode?: 'full' | 'partial'): this;
    pulse(device?: number, on?: number, off?: number): this;
    raw(data: number[]): this;
    encode(): Uint8Array;
  }
}
