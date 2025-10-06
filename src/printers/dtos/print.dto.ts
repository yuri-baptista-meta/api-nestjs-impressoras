export class PrintDto {
  fileBase64!: string;       // ou troque para fileUrl
  printerName?: string;      // opcional se enviar printerUri
  printerUri?: string;
  copies?: number;
  duplex?: boolean;
}