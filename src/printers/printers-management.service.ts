import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrintersService } from './printers.service';
import { IPrinterAdapter, PrintJob, PrinterStatus, PRINTER_ADAPTER } from '@/domain/printer-adapter.interface';

/**
 * Service para gerenciamento avançado de impressoras.
 * Usa a interface IPrinterAdapter para garantir flexibilidade.
 * 
 * Nota: Operações avançadas (status, queue, etc) só funcionam com adapters
 * que implementam essas funcionalidades (ex: SmbAdvancedAdapter).
 * Adapters básicos (SmbClientAdapter, IppAdapter, LpdAdapter) lançarão erros informativos.
 */
@Injectable()
export class PrintersManagementService {
  constructor(
    private readonly printersService: PrintersService,
    @Inject(PRINTER_ADAPTER) private readonly adapter: IPrinterAdapter,
  ) {}

  /**
   * Obtém status de uma impressora por ID
   */
  async getPrinterStatus(printerId: string): Promise<PrinterStatus> {
    const printer = this.printersService.getPrinterById(printerId);
    
    if (!printer) {
      throw new NotFoundException(`Impressora com ID "${printerId}" não encontrada`);
    }

    return this.adapter.getPrinterStatus(printer.name);
  }

  /**
   * Lista jobs na fila de uma impressora
   */
  async getQueue(printerId: string): Promise<PrintJob[]> {
    const printer = this.printersService.getPrinterById(printerId);
    
    if (!printer) {
      throw new NotFoundException(`Impressora com ID "${printerId}" não encontrada`);
    }

    return this.adapter.listJobs(printer.name);
  }

  /**
   * Cancela um job específico
   */
  async cancelJob(printerId: string, jobId: number): Promise<{ success: boolean; message: string }> {
    const printer = this.printersService.getPrinterById(printerId);
    
    if (!printer) {
      throw new NotFoundException(`Impressora com ID "${printerId}" não encontrada`);
    }

    const success = await this.adapter.cancelJob(printer.name, jobId);
    
    return {
      success,
      message: success 
        ? `Job ${jobId} cancelado com sucesso` 
        : `Falha ao cancelar job ${jobId}`,
    };
  }

  /**
   * Limpa toda a fila de uma impressora
   */
  async clearQueue(printerId: string): Promise<{ canceledCount: number; message: string }> {
    const printer = this.printersService.getPrinterById(printerId);
    
    if (!printer) {
      throw new NotFoundException(`Impressora com ID "${printerId}" não encontrada`);
    }

    const canceledCount = await this.adapter.clearQueue(printer.name);
    
    return {
      canceledCount,
      message: `${canceledCount} job(s) cancelado(s)`,
    };
  }

  /**
   * Pausa uma impressora
   */
  async pausePrinter(printerId: string): Promise<{ success: boolean; message: string }> {
    const printer = this.printersService.getPrinterById(printerId);
    
    if (!printer) {
      throw new NotFoundException(`Impressora com ID "${printerId}" não encontrada`);
    }

    const success = await this.adapter.pausePrinter(printer.name);
    
    return {
      success,
      message: success 
        ? `Impressora "${printer.name}" pausada` 
        : `Falha ao pausar impressora "${printer.name}"`,
    };
  }

  /**
   * Retoma uma impressora pausada
   */
  async resumePrinter(printerId: string): Promise<{ success: boolean; message: string }> {
    const printer = this.printersService.getPrinterById(printerId);
    
    if (!printer) {
      throw new NotFoundException(`Impressora com ID "${printerId}" não encontrada`);
    }

    const success = await this.adapter.resumePrinter(printer.name);
    
    return {
      success,
      message: success 
        ? `Impressora "${printer.name}" retomada` 
        : `Falha ao retomar impressora "${printer.name}"`,
    };
  }

  /**
   * Pausa um job específico
   */
  async pauseJob(printerId: string, jobId: number): Promise<{ success: boolean; message: string }> {
    const printer = this.printersService.getPrinterById(printerId);
    
    if (!printer) {
      throw new NotFoundException(`Impressora com ID "${printerId}" não encontrada`);
    }

    const success = await this.adapter.pauseJob(printer.name, jobId);
    
    return {
      success,
      message: success 
        ? `Job ${jobId} pausado` 
        : `Falha ao pausar job ${jobId}`,
    };
  }

  /**
   * Retoma um job pausado
   */
  async resumeJob(printerId: string, jobId: number): Promise<{ success: boolean; message: string }> {
    const printer = this.printersService.getPrinterById(printerId);
    
    if (!printer) {
      throw new NotFoundException(`Impressora com ID "${printerId}" não encontrada`);
    }

    const success = await this.adapter.resumeJob(printer.name, jobId);
    
    return {
      success,
      message: success 
        ? `Job ${jobId} retomado` 
        : `Falha ao retomar job ${jobId}`,
    };
  }
}
