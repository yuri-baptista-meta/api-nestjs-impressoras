import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PrintersService } from '../printers/printers.service';

@Controller()
export class KafkaConsumerController {
  private readonly logger = new Logger(KafkaConsumerController.name);

  constructor(private readonly printersService: PrintersService) {}

  @MessagePattern('print-jobs')
  async handlePrintJob(@Payload() message: any) {
    const startTime = Date.now();
    
    // Parse do Buffer para JSON se necessário
    let data: any;
    if (Buffer.isBuffer(message)) {
      data = JSON.parse(message.toString());
    } else if (message.value) {
      // Se vier com estrutura { value: Buffer }
      data = Buffer.isBuffer(message.value) 
        ? JSON.parse(message.value.toString())
        : message.value;
    } else {
      data = message;
    }

    const { printerId, fileBase64 } = data;

    this.logger.log(
      `📨 Mensagem Kafka recebida - printerId: ${printerId?.substring(0, 8)}...`,
    );

    try {
      const result = await this.printersService.print({
        printerId,
        fileBase64,
      });

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Impressão enviada via Kafka - jobId: ${result.jobId} (${duration}ms)`,
      );

      return {
        status: 'success',
        jobId: result.jobId,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `❌ Erro ao processar mensagem Kafka (${duration}ms): ${error.message}`,
      );

      // Lança erro para Kafka fazer retry (se configurado)
      throw error;
    }
  }
}
