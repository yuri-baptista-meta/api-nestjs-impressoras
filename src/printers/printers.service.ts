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

interface CacheEntry {
  printers: CachedPrinter[];
  lastUpdated: number; // timestamp em ms
}

@Injectable()
export class PrintersService {
  private readonly CACHE_TTL_SECONDS = 30 * 24 * 60 * 60; 
  private readonly CACHE_STALE_MS = 5 * 60 * 1000;
  private readonly CACHE_KEY = 'printers:list';
  private readonly logger = new Logger(PrintersService.name);
  private isRefreshing = false;

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
   * Usa cache Redis se disponível (mesmo que stale), e atualiza em background se necessário.
   * NUNCA retorna erro por cache expirado - sempre retorna dados (mesmo antigos).
   * @param forceRefresh - Força atualização do cache ignorando stale check
   */
  async list(forceRefresh: boolean = false): Promise<CachedPrinter[]> {
    const cached = await this.redis.get(this.CACHE_KEY);
    
    if (cached) {
      const cacheEntry: CacheEntry = JSON.parse(cached);
      const age = Date.now() - cacheEntry.lastUpdated;
      const isStale = age > this.CACHE_STALE_MS;

      if (isStale && !this.isRefreshing) {
        this.logger.warn(
          `⚠️ Cache stale (${Math.round(age / 1000)}s old) - Atualizando em background...`
        );
        
        this.refreshCacheInBackground().catch(err => {
          this.logger.error(`❌ Erro ao atualizar cache em background: ${err.message}`);
        });
      } else if (!isStale) {
        this.logger.log('✅ Cache HIT - Retornando impressoras do Redis');
      } else {
        this.logger.log('✅ Cache HIT (stale, refresh em andamento)');
      }

      return cacheEntry.printers;
    }

    this.logger.log('❌ Cache MISS - Buscando impressoras do SMB');
    return await this.refreshCache();
  }

  /**
   * Atualiza o cache em background (não bloqueia)
   */
  private async refreshCacheInBackground(): Promise<void> {
    if (this.isRefreshing) {
      this.logger.log('🔄 Refresh já em andamento, ignorando...');
      return;
    }

    this.isRefreshing = true;
    try {
      await this.refreshCache();
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Busca impressoras do SMB e atualiza cache
   */
  private async refreshCache(): Promise<CachedPrinter[]> {
    const rawPrinters = await this.printerAdapter.listPrinters();
    
    const printers: CachedPrinter[] = rawPrinters.map((p) => ({
      id: this.generatePrinterId(p.name),
      name: p.name,
      uri: p.uri,
      cachedAt: new Date(),
    }));

    const cacheEntry: CacheEntry = {
      printers,
      lastUpdated: Date.now(),
    };

    await this.redis.setex(
      this.CACHE_KEY,
      this.CACHE_TTL_SECONDS,
      JSON.stringify(cacheEntry),
    );

    this.logger.log(`📦 Cache atualizado no Redis (${printers.length} impressoras, TTL: ${this.CACHE_TTL_SECONDS}s)`);
    
    return printers;
  }

  /**
   * Imprime usando printerId do cache.
   * SEMPRE usa o cache (mesmo stale) e NUNCA retorna 404 por cache expirado.
   * Se cache está stale, atualiza em background.
   */
  async print(dto: { printerId: string; fileBase64: string }) {
    if (!dto?.printerId || !dto?.fileBase64) {
      throw new Error('printerId e fileBase64 são obrigatórios');
    }

    const cached = await this.redis.get(this.CACHE_KEY);
    
    if (!cached) {
      this.logger.warn('⚠️ Cache vazio - Populando pela primeira vez...');
      const printers = await this.refreshCache();
      const printer = printers.find((p) => p.id === dto.printerId);
      
      if (!printer) {
        throw new NotFoundException(
          `Impressora com ID "${dto.printerId}" não encontrada.`
        );
      }

      return await this.executePrint(printer, dto.fileBase64);
    }

    const cacheEntry: CacheEntry = JSON.parse(cached);
    const age = Date.now() - cacheEntry.lastUpdated;
    const isStale = age > this.CACHE_STALE_MS;

    if (isStale && !this.isRefreshing) {
      this.logger.warn(
        `⚠️ Cache stale durante impressão (${Math.round(age / 1000)}s) - Atualizando em background...`
      );
      this.refreshCacheInBackground().catch(err => {
        this.logger.error(`❌ Erro ao atualizar cache: ${err.message}`);
      });
    }

    const printer = cacheEntry.printers.find((p) => p.id === dto.printerId);
    
    if (!printer) {
      throw new NotFoundException(
        `Impressora com ID "${dto.printerId}" não encontrada.`
      );
    }

    return await this.executePrint(printer, dto.fileBase64);
  }

  /**
   * Executa a impressão (real ou simulada)
   */
  private async executePrint(printer: CachedPrinter, fileBase64: string) {
    // Modo DRY_RUN: simula impressão sem enviar para impressora real
    const isDryRun = process.env.DRY_RUN === 'true';
    
    if (isDryRun) {
      const mockJobId = `job-mock-${Date.now()}`;
      this.logger.log(
        `🧪 [DRY_RUN] Simulando impressão para: ${printer.name} - jobId: ${mockJobId}`
      );
      
      // Simula delay de impressão (200-500ms)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 300 + 200));
      
      return { 
        jobId: mockJobId,
        printer: printer.name,
        status: 'simulated',
        message: 'Impressão simulada com sucesso (DRY_RUN mode)'
      };
    }

    return this.printerAdapter.printPdf({ 
      printerShare: printer.name, 
      fileBase64 
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
      const printers = await this.refreshCache();
      return printers.find((p) => p.id === printerId);
    }

    const cacheEntry: CacheEntry = JSON.parse(cached);
    return cacheEntry.printers.find((p) => p.id === printerId);
  }

  /**
   * Limpa todo o cache manualmente do Redis
   */
  async clearCache(): Promise<void> {
    await this.redis.del(this.CACHE_KEY);
    this.logger.warn('🗑️ Cache limpo manualmente');
  }

  /**
   * Retorna informações sobre o cache (útil para debugging)
   */
  async getCacheInfo(): Promise<{ 
    exists: boolean; 
    ttl: number; 
    age?: number;
    isStale?: boolean;
    printerCount?: number;
  }> {
    const exists = (await this.redis.exists(this.CACHE_KEY)) === 1;
    const ttl = await this.redis.ttl(this.CACHE_KEY);
    
    if (!exists) {
      return { exists, ttl };
    }

    const cached = await this.redis.get(this.CACHE_KEY);
    if (!cached) {
      return { exists, ttl };
    }

    const cacheEntry: CacheEntry = JSON.parse(cached);
    const age = Date.now() - cacheEntry.lastUpdated;
    const isStale = age > this.CACHE_STALE_MS;

    return { 
      exists, 
      ttl,
      age: Math.round(age / 1000),
      isStale,
      printerCount: cacheEntry.printers.length
    };
  }

  /**
   * Força atualização do cache (útil para endpoints de refresh manual)
   */
  async forceRefresh(): Promise<CachedPrinter[]> {
    this.logger.log('🔄 Forçando atualização do cache...');
    return await this.refreshCache();
  }
}
