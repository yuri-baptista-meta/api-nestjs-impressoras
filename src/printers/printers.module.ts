import { Module } from '@nestjs/common';
import { PrintersController } from './printers.controller';
import { PrintersService } from './printers.service';
import { SmbClientAdapter, SmbCreds } from '@/adapters/smbclient.adapter';

@Module({
  controllers: [PrintersController],
  providers: [
    {
      provide: SmbClientAdapter,
      useFactory: (): SmbClientAdapter => {
        const cfg: SmbCreds = {
          host: process.env.SMB_HOST!,
          user: process.env.SMB_USER!,
          pass: process.env.SMB_PASS!,
          domain: process.env.SMB_DOMAIN || undefined,
          dialect: process.env.SMB_DIALECT || 'SMB3',
        };
        return new SmbClientAdapter(cfg);
      },
    },
    PrintersService,
  ],
  exports: [PrintersService],
})
export class PrintersModule {}
