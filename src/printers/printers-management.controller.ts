import { Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { PrintersManagementService } from './printers-management.service';

@Controller('printers/management')
export class PrintersManagementController {
  constructor(private readonly svc: PrintersManagementService) {}

  /**
   * GET /printers/management/test
   * Rota de teste simples
   */
  @Get('test')
  testRoute() {
    return { message: 'Hello from management controller!', timestamp: new Date() };
  }

  /**
   * GET /printers/management/:id/status
   * Verifica status de uma impressora específica
   */
  @Get(':id/status')
  async getStatus(@Param('id') printerId: string) {
    return this.svc.getPrinterStatus(printerId);
  }

  /**
   * GET /printers/management/:id/queue
   * Lista jobs na fila de uma impressora
   */
  @Get(':id/queue')
  async getQueue(@Param('id') printerId: string) {
    return this.svc.getQueue(printerId);
  }

  /**
   * DELETE /printers/management/:id/queue/:jobId
   * Cancela um job específico
   */
  @Delete(':id/queue/:jobId')
  async cancelJob(
    @Param('id') printerId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.svc.cancelJob(printerId, parseInt(jobId));
  }

  /**
   * DELETE /printers/management/:id/queue
   * Limpa toda a fila de uma impressora
   */
  @Delete(':id/queue')
  async clearQueue(@Param('id') printerId: string) {
    return this.svc.clearQueue(printerId);
  }

  /**
   * POST /printers/management/:id/pause
   * Pausa uma impressora
   */
  @Post(':id/pause')
  async pausePrinter(@Param('id') printerId: string) {
    return this.svc.pausePrinter(printerId);
  }

  /**
   * POST /printers/management/:id/resume
   * Retoma uma impressora pausada
   */
  @Post(':id/resume')
  async resumePrinter(@Param('id') printerId: string) {
    return this.svc.resumePrinter(printerId);
  }

  /**
   * POST /printers/management/:id/queue/:jobId/pause
   * Pausa um job específico
   */
  @Post(':id/queue/:jobId/pause')
  async pauseJob(
    @Param('id') printerId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.svc.pauseJob(printerId, parseInt(jobId));
  }

  /**
   * POST /printers/management/:id/queue/:jobId/resume
   * Retoma um job pausado
   */
  @Post(':id/queue/:jobId/resume')
  async resumeJob(
    @Param('id') printerId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.svc.resumeJob(printerId, parseInt(jobId));
  }
}
