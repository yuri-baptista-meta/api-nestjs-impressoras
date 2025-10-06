import { Injectable } from '@nestjs/common';
import { SmbClientAdapter } from '@/adapters/smbclient.adapter';

@Injectable()
export class PrintersService {
  constructor(private readonly smb: SmbClientAdapter) {}

  list() {
    return this.smb.listPrinters();
  }

  print(dto: { printerName: string; fileBase64: string }) {
    if (!dto?.printerName || !dto?.fileBase64) throw new Error('printerName/fileBase64 obrigatórios');
    return this.smb.printPdf({ printerShare: dto.printerName, fileBase64: dto.fileBase64 });
  }
}
