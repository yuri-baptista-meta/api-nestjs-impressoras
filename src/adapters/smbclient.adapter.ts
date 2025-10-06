import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { IPrinterAdapter, PrinterStatus, PrintJob } from '@/domain/printer-adapter.interface';

export type SmbCreds = { host: string; user: string; pass: string; domain?: string; dialect?: string };

/**
 * Adaptador para impressão via protocolo SMB usando smbclient.
 * Implementa IPrinterAdapter garantindo contrato formal.
 */
export class SmbClientAdapter implements IPrinterAdapter {
  constructor(private cfg: SmbCreds) {}

  private smbArgsBase() {
    const args: string[] = [];
    if (this.cfg.dialect) args.push('-m', this.cfg.dialect);
    return args;
  }

  private run(cmd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '', err = '';
      p.stdout.on('data', (d) => (out += d.toString()));
      p.stderr.on('data', (d) => (err += d.toString()));
      p.on('close', (code) => resolve({ code: code ?? -1, stdout: out, stderr: err }));
    });
  }

  /** Lista filas (shares do tipo Printer) no servidor */
  async listPrinters() {
    const base = this.smbArgsBase();
    const args = [
      '-L', `//${this.cfg.host}`,
      '-U', `${this.cfg.user}%${this.cfg.pass}`,
      ...base,
    ];
    if (this.cfg.domain) args.push('-W', this.cfg.domain);

    const { code, stdout, stderr } = await this.run('smbclient', args);
    if (code !== 0) throw new Error(`smbclient -L failed (${code}) ${stderr || stdout}`);

    const lines = stdout.split(/\r?\n/);
    const printers = lines
      .map((l) => l.trim())
      .filter((l) => /\bPrinter\b/.test(l))
      .map((l) => {
        // formato típico: "<Sharename>    Printer   <Comment>"
        const sharename = l.split(/\s{2,}/)[0]; // primeira coluna
        return { name: sharename, uri: `smb://${this.cfg.host}/${encodeURIComponent(sharename)}` };
      });

    return printers.filter((p) => !/^print\$/i.test(p.name));
  }

  /** Envia PDF para a fila via comando "print" do smbclient */
  async printPdf({ printerShare, fileBase64 }: { printerShare: string; fileBase64: string }) {
    const tmpDir = '/tmp/prints';
    await fs.mkdir(tmpDir, { recursive: true });
    const tmpFile = path.join(tmpDir, `job-${randomUUID()}.pdf`);
    await fs.writeFile(tmpFile, Buffer.from(fileBase64, 'base64'));

    try {
      const base = this.smbArgsBase();
      const args = [
        `//${this.cfg.host}/${printerShare}`,
        '-U', `${this.cfg.user}%${this.cfg.pass}`,
        '-c', `print ${tmpFile}`,
        ...base,
      ];
      if (this.cfg.domain) args.push('-W', this.cfg.domain);

      const { code, stdout, stderr } = await this.run('smbclient', args);
      if (code !== 0) throw new Error(`print failed (${code}) ${stderr || stdout}`);

      // não temos jobId do spooler; retornamos um id local (do arquivo)
      return { jobId: path.parse(tmpFile).name };
    } finally {
      fs.unlink(tmpFile).catch(() => {});
    }
  }

  /**
   * ==========================================
   * MÉTODOS AVANÇADOS - NÃO SUPORTADOS POR SMBCLIENT
   * ==========================================
   * O protocolo SMB básico via smbclient não suporta operações de gerenciamento.
   * Para essas funcionalidades, use SmbAdvancedAdapter com rpcclient.
   */

  async getPrinterStatus(printerName: string): Promise<PrinterStatus> {
    throw new Error(
      `getPrinterStatus não implementado: smbclient não suporta consulta de status. ` +
      `Use SmbAdvancedAdapter com rpcclient para funcionalidades avançadas.`
    );
  }

  async listJobs(printerName: string): Promise<PrintJob[]> {
    throw new Error(
      `listJobs não implementado: smbclient não suporta listagem de fila. ` +
      `Use SmbAdvancedAdapter com rpcclient para funcionalidades avançadas.`
    );
  }

  async cancelJob(printerName: string, jobId: number): Promise<boolean> {
    throw new Error(
      `cancelJob não implementado: smbclient não suporta cancelamento de jobs. ` +
      `Use SmbAdvancedAdapter com rpcclient para funcionalidades avançadas.`
    );
  }

  async pauseJob(printerName: string, jobId: number): Promise<boolean> {
    throw new Error(
      `pauseJob não implementado: smbclient não suporta pausar jobs. ` +
      `Use SmbAdvancedAdapter com rpcclient para funcionalidades avançadas.`
    );
  }

  async resumeJob(printerName: string, jobId: number): Promise<boolean> {
    throw new Error(
      `resumeJob não implementado: smbclient não suporta retomar jobs. ` +
      `Use SmbAdvancedAdapter com rpcclient para funcionalidades avançadas.`
    );
  }

  async pausePrinter(printerName: string): Promise<boolean> {
    throw new Error(
      `pausePrinter não implementado: smbclient não suporta pausar impressoras. ` +
      `Use SmbAdvancedAdapter com rpcclient para funcionalidades avançadas.`
    );
  }

  async resumePrinter(printerName: string): Promise<boolean> {
    throw new Error(
      `resumePrinter não implementado: smbclient não suporta retomar impressoras. ` +
      `Use SmbAdvancedAdapter com rpcclient para funcionalidades avançadas.`
    );
  }

  async clearQueue(printerName: string): Promise<number> {
    throw new Error(
      `clearQueue não implementado: smbclient não suporta limpar fila. ` +
      `Use SmbAdvancedAdapter com rpcclient para funcionalidades avançadas.`
    );
  }
}
