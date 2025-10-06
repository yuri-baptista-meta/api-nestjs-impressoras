import { Module } from '@nestjs/common';
import { PrintersController } from './printers.controller';
import { PrintersService } from './printers.service';
import { PrintersManagementController } from './printers-management.controller';
import { PrintersManagementService } from './printers-management.service';
import { SmbAdvancedAdapter, SmbCreds } from '@/adapters/smb-advanced.adapter';
import { PRINTER_ADAPTER } from '@/domain/printer-adapter.interface';

@Module({
  controllers: [
    PrintersController,           // Operações básicas: GET /printers, POST /printers/print
    PrintersManagementController, // Operações avançadas: GET /printers/management/*
  ],
  providers: [
    {
      provide: PRINTER_ADAPTER,
      useFactory: (): SmbAdvancedAdapter => {
        const cfg: SmbCreds = {
          host: process.env.SMB_HOST!,
          user: process.env.SMB_USER!,
          pass: process.env.SMB_PASS!,
          domain: process.env.SMB_DOMAIN || undefined,
        };
        return new SmbAdvancedAdapter(cfg);
      },
    },
    PrintersService,              
    PrintersManagementService,    
  ],
  exports: [PrintersService],
})
export class PrintersModule {}
