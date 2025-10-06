import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PrintersService } from './printers.service';

class PrintDto {
  printerId!: string;     // ID da impressora retornado por GET /printers
  fileBase64!: string;    // PDF em base64
}

@Controller('printers')
export class PrintersController {
  constructor(private readonly svc: PrintersService) {}

  /**
   * Lista impressoras disponíveis
   * @param refresh - Query param opcional para forçar atualização do cache
   * @example GET /printers?refresh=true
   */
  @Get()
  list(@Query('refresh') refresh?: string) { 
    const forceRefresh = refresh === 'true';
    return this.svc.list(forceRefresh); 
  }

  /**
   * POST /printers/print
   * Envia PDF para impressão
   */
  @Post('print')
  print(@Body() dto: PrintDto) { 
    return this.svc.print(dto); 
  }

  /**
   * GET /printers/cache-info
   * Retorna informações sobre o cache Redis (debug)
   */
  @Get('cache-info')
  async cacheInfo() {
    return this.svc.getCacheInfo();
  }
}
