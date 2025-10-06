/**
 * Status de uma impressora
 */
export interface PrinterStatus {
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'PAUSED' | 'ERROR' | 'UNKNOWN';
  jobsInQueue: number;
  statusMessage?: string;
}

/**
 * Informações de um job de impressão
 */
export interface PrintJob {
  jobId: number;
  printerName: string;
  userName: string;
  documentName: string;
  totalPages: number;
  pagesPrinted: number;
  size: number;
  status: 'QUEUED' | 'PRINTING' | 'PAUSED' | 'ERROR' | 'PRINTED' | 'DELETED';
  submittedTime: Date;
}

/**
 * Contrato que define operações obrigatórias para qualquer adaptador de impressão.
 * Seguindo o Dependency Inversion Principle (SOLID).
 * 
 * Implementações básicas (como smbclient) podem retornar erros ou valores padrão
 * para métodos avançados que não são suportados pelo protocolo subjacente.
 */
export interface IPrinterAdapter {
  /**
   * Lista todas as impressoras disponíveis
   * @returns Array com nome e URI das impressoras
   */
  listPrinters(): Promise<Array<{ name: string; uri: string }>>;

  /**
   * Envia um documento PDF para impressão
   * @param params - Parâmetros da impressão
   * @returns Resultado com ID do job criado
   */
  printPdf(params: { printerShare: string; fileBase64: string }): Promise<{ jobId: string }>;

  /**
   * Verifica o status de uma impressora específica
   * @param printerName - Nome da impressora
   * @returns Status atual da impressora
   */
  getPrinterStatus(printerName: string): Promise<PrinterStatus>;

  /**
   * Lista todos os jobs na fila de uma impressora
   * @param printerName - Nome da impressora
   * @returns Array de jobs na fila
   */
  listJobs(printerName: string): Promise<PrintJob[]>;

  /**
   * Cancela um job específico
   * @param printerName - Nome da impressora
   * @param jobId - ID do job a cancelar
   * @returns true se cancelado com sucesso
   */
  cancelJob(printerName: string, jobId: number): Promise<boolean>;

  /**
   * Pausa um job específico
   * @param printerName - Nome da impressora
   * @param jobId - ID do job a pausar
   * @returns true se pausado com sucesso
   */
  pauseJob(printerName: string, jobId: number): Promise<boolean>;

  /**
   * Retoma um job pausado
   * @param printerName - Nome da impressora
   * @param jobId - ID do job a retomar
   * @returns true se retomado com sucesso
   */
  resumeJob(printerName: string, jobId: number): Promise<boolean>;

  /**
   * Pausa a impressora inteira (todos os jobs)
   * @param printerName - Nome da impressora
   * @returns true se pausada com sucesso
   */
  pausePrinter(printerName: string): Promise<boolean>;

  /**
   * Retoma uma impressora pausada
   * @param printerName - Nome da impressora
   * @returns true se retomada com sucesso
   */
  resumePrinter(printerName: string): Promise<boolean>;

  /**
   * Limpa toda a fila de uma impressora
   * @param printerName - Nome da impressora
   * @returns Número de jobs cancelados
   */
  clearQueue(printerName: string): Promise<number>;
}

/**
 * Token de injeção de dependência para o adapter de impressoras.
 * Usado no NestJS DI container.
 */
export const PRINTER_ADAPTER = Symbol('PRINTER_ADAPTER');
