import { Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { IPrinterAdapter, PRINTER_ADAPTER } from '@/domain/printer-adapter.interface';
import { REDIS_CLIENT } from '@/redis/redis.module';
import { Redis } from 'ioredis';
import { createHash } from 'crypto';

export interface CachedPrinter {
  id: string;
  name: string;
  uri: string;
  cachedAt: Date;
}

@Injectable()
export class PrintersService {
  private readonly CACHE_TTL_SECONDS = 5 * 60;
  private readonly CACHE_KEY = 'printers:list';
  private readonly logger = new Logger(PrintersService.name);

  /**
   * Injeta a interface IPrinterAdapter e o cliente Redis.
   * Permite trocar implementação (SMB, IPP, LPD) sem modificar este service.
   * Cache agora é distribuído via Redis.
   */
  constructor(
    @Inject(PRINTER_ADAPTER) private readonly printerAdapter: IPrinterAdapter,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /**
   * Lista impressoras disponíveis.
   * Usa cache Redis se disponível e válido, caso contrário busca do SMB.
   * @param forceRefresh - Força atualização do cache ignorando TTL
   */
  async list(forceRefresh: boolean = false): Promise<CachedPrinter[]> {
    // Tenta buscar do cache Redis primeiro
    if (!forceRefresh) {
      const cached = await this.redis.get(this.CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    }    
    const rawPrinters = await this.printerAdapter.listPrinters();
    
    const printers: CachedPrinter[] = rawPrinters.map((p) => ({
      id: this.generatePrinterId(p.name),
      name: p.name,
      uri: p.uri,
      cachedAt: new Date(),
    }));

    await this.redis.setex(
      this.CACHE_KEY,
      this.CACHE_TTL_SECONDS,
      JSON.stringify(printers),
    );    
    return printers;
  }

  /**
   * Imprime usando printerId do cache
   */
  async print(dto: { printerId: string; fileBase64: string }) {
    if (!dto?.printerId || !dto?.fileBase64) {
      throw new Error('printerId e fileBase64 são obrigatórios');
    }

    // Busca lista do cache
    const cached = await this.redis.get(this.CACHE_KEY);
    
    if (!cached) {
      throw new NotFoundException(
        `Cache de impressoras expirou. Execute GET /printers para atualizar a lista.`
      );
    }

    const printers: CachedPrinter[] = JSON.parse(cached);
    const printer = printers.find((p) => p.id === dto.printerId);
    
    if (!printer) {
      throw new NotFoundException(
        `Impressora com ID "${dto.printerId}" não encontrada. Execute GET /printers para atualizar a lista.`
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
  async getPrinterById(printerId: string): Promise<CachedPrinter | undefined> {
    const cached = await this.redis.get(this.CACHE_KEY);
    
    if (!cached) {
      return undefined;
    }

    const printers: CachedPrinter[] = JSON.parse(cached);
    return printers.find((p) => p.id === printerId);
  }

  /**
   * Limpa todo o cache manualmente do Redis
   */
  async clearCache(): Promise<void> {
    await this.redis.del(this.CACHE_KEY);
  }

  /**
   * Retorna informações sobre o cache (útil para debugging)
   */
  async getCacheInfo(): Promise<{ exists: boolean; ttl: number }> {
    const exists = (await this.redis.exists(this.CACHE_KEY)) === 1;
    const ttl = await this.redis.ttl(this.CACHE_KEY);
    
    return { exists, ttl };
  }
}
