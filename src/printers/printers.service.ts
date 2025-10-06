import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { IPrinterAdapter, PRINTER_ADAPTER } from '@/domain/printer-adapter.interface';
import { createHash } from 'crypto';

export interface CachedPrinter {
  id: string;
  name: string;
  uri: string;
  cachedAt: Date;
}

@Injectable()
export class PrintersService {
  private printerCache = new Map<string, CachedPrinter>();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;
  private lastFetchTime: number | null = null;

  /**
   * Injeta a interface IPrinterAdapter.
   * Permite trocar implementação (SMB, IPP, LPD) sem modificar este service.
   * Seguindo Dependency Inversion Principle (SOLID).
   */
  constructor(
    @Inject(PRINTER_ADAPTER) private readonly printerAdapter: IPrinterAdapter
  ) {}

  /**
   * Lista impressoras disponíveis.
   * Usa cache se disponível e válido, caso contrário busca do SMB.
   * @param forceRefresh - Força atualização do cache ignorando TTL
   */
  async list(forceRefresh: boolean = false): Promise<CachedPrinter[]> {
    const now = Date.now();
    
    const shouldFetchFromSmb = 
      forceRefresh || 
      this.lastFetchTime === null || 
      (now - this.lastFetchTime) > this.CACHE_TTL_MS ||
      this.printerCache.size === 0;

    if (!shouldFetchFromSmb) {
      return Array.from(this.printerCache.values());
    }

    const rawPrinters = await this.printerAdapter.listPrinters();
    
    this.printerCache.clear();
    
    const printers = rawPrinters.map((p) => {
      const id = this.generatePrinterId(p.name);
      
      const cached: CachedPrinter = {
        id,
        name: p.name,
        uri: p.uri,
        cachedAt: new Date(),
      };
      
      this.printerCache.set(id, cached);
      
      return cached;
    });

    this.lastFetchTime = now;
    
    return printers;
  }

  /**
   * Imprime usando printerId do cache
   */
  async print(dto: { printerId: string; fileBase64: string }) {
    if (!dto?.printerId || !dto?.fileBase64) {
      throw new Error('printerId e fileBase64 são obrigatórios');
    }

    const printer = this.printerCache.get(dto.printerId);
    
    if (!printer) {
      throw new NotFoundException(
        `Impressora com ID "${dto.printerId}" não encontrada. Execute GET /printers para atualizar a lista.`
      );
    }

    const age = Date.now() - printer.cachedAt.getTime();
    if (age > this.CACHE_TTL_MS) {
      throw new NotFoundException(
        `Cache da impressora "${printer.name}" expirou. Execute GET /printers para atualizar.`
      );
    }

    return this.printerAdapter.printPdf({ 
      printerShare: printer.name, 
      fileBase64: dto.fileBase64 
    });
  }

  /**
   * Gera ID determinístico para uma impressora baseado no nome
   */
  private generatePrinterId(printerName: string): string {
    return createHash('sha256')
      .update(printerName.toLowerCase().trim())
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Retorna informações de uma impressora específica pelo ID
   */
  getPrinterById(printerId: string): CachedPrinter | undefined {
    return this.printerCache.get(printerId);
  }

  /**
   * Limpa todo o cache manualmente e força refresh no próximo list()
   */
  clearCache(): void {
    this.printerCache.clear();
    this.lastFetchTime = null;
  }
}
