import { Body, Controller, Get, Post } from '@nestjs/common';
import { PrintersService } from './printers.service';

class PrintDto {
  printerName!: string;   // Ex.: "HP 9020 - Vila Cristina"
  fileBase64!: string;    // PDF em base64
}

@Controller('printers')
export class PrintersController {
  constructor(private readonly svc: PrintersService) {}

  @Get()
  list() { return this.svc.list(); }

  @Post('print')
  print(@Body() dto: PrintDto) { return this.svc.print(dto); }
}
