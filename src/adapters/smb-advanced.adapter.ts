import { spawn } from 'child_process';
import { IPrinterAdapter, PrinterStatus, PrintJob } from '@/domain/printer-adapter.interface';

export interface SmbCreds {
  host: string;
  user: string;
  pass: string;
  domain?: string;
}

/**
 * Adapter avançado usando rpcclient para gerenciamento completo de impressoras SMB.
 * Suporta consulta de status, listagem de fila e cancelamento de jobs.
 * 
 * Requer: samba-common-bin (rpcclient)
 * Instalar: sudo apt-get install samba-common-bin
 */
export class SmbAdvancedAdapter implements IPrinterAdapter {
  constructor(private cfg: SmbCreds) {}

  /**
   * Executa comando rpcclient
   */
  private async runRpc(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const authStr = this.cfg.domain 
        ? `${this.cfg.domain}\\${this.cfg.user}%${this.cfg.pass}`
        : `${this.cfg.user}%${this.cfg.pass}`;

      const args = [
        '-U', authStr,
        `//${this.cfg.host}`,
        '-c', command,
      ];

      const proc = spawn('rpcclient', args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => (stdout += data.toString()));
      proc.stderr.on('data', (data) => (stderr += data.toString()));

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`rpcclient failed (${code}): ${stderr || stdout}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  /**
   * Lista impressoras disponíveis
   */
  async listPrinters(): Promise<Array<{ name: string; uri: string }>> {
    const output = await this.runRpc('enumprinters');
    
    // Parse output do rpcclient
    // Formato típico:
    // flags:[0x800000]
    // name:[\\servidor\HP LaserJet 9020]
    // description:[HP LaserJet 9020]
    // comment:[]
    
    const printers: Array<{ name: string; uri: string }> = [];
    const lines = output.split('\n');
    let currentName = '';

    for (const line of lines) {
      const nameMatch = line.match(/name:\[\\\\[^\\]+\\(.+?)\]/);
      if (nameMatch) {
        currentName = nameMatch[1];
        printers.push({
          name: currentName,
          uri: `smb://${this.cfg.host}/${encodeURIComponent(currentName)}`,
        });
      }
    }

    return printers;
  }

  /**
   * Verifica status de uma impressora específica
   */
  async getPrinterStatus(printerName: string): Promise<PrinterStatus> {
    try {
      const output = await this.runRpc(`getprinter "${printerName}"`);
      
      // Parse do status
      // status:[0x0]  -> 0 = OK, outros valores = erro
      const statusMatch = output.match(/status:\[0x([0-9a-fA-F]+)\]/);
      const status = statusMatch ? parseInt(statusMatch[1], 16) : -1;

      let statusStr: PrinterStatus['status'] = 'UNKNOWN';
      let message = '';

      if (status === 0) {
        statusStr = 'ONLINE';
      } else if (status & 0x1) {
        statusStr = 'PAUSED';
        message = 'Impressora pausada';
      } else if (status & 0x2) {
        statusStr = 'ERROR';
        message = 'Erro na impressora';
      } else if (status & 0x4) {
        statusStr = 'OFFLINE';
        message = 'Impressora offline';
      }

      const jobs = await this.listJobs(printerName);

      return {
        name: printerName,
        status: statusStr,
        jobsInQueue: jobs.length,
        statusMessage: message || undefined,
      };
    } catch (error) {
      return {
        name: printerName,
        status: 'UNKNOWN',
        jobsInQueue: 0,
        statusMessage: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Lista jobs na fila de uma impressora
   */
  async listJobs(printerName: string): Promise<PrintJob[]> {
    try {
      const output = await this.runRpc(`enumjobs "${printerName}"`);
      
      const jobs: PrintJob[] = [];
      const jobBlocks = output.split(/\n\s*\n/);

      for (const block of jobBlocks) {
        if (!block.trim()) continue;

        // Parse de cada job
        // Formato:
        // Job Id: 123
        // Printer: HP LaserJet
        // User: DOMAIN\usuario
        // Document: arquivo.pdf
        // Total Pages: 5
        // Status: 0x0
        
        const jobIdMatch = block.match(/Job Id:\s*(\d+)/i);
        const userMatch = block.match(/User:\s*(?:.*\\)?(.+)/i);
        const docMatch = block.match(/Document:\s*(.+)/i);
        const pagesMatch = block.match(/Total Pages:\s*(\d+)/i);
        const sizeMatch = block.match(/Size:\s*(\d+)/i);
        const statusMatch = block.match(/Status:\s*0x([0-9a-fA-F]+)/i);

        if (jobIdMatch) {
          const statusCode = statusMatch ? parseInt(statusMatch[1], 16) : 0;
          let status: PrintJob['status'] = 'QUEUED';

          if (statusCode & 0x1) status = 'PAUSED';
          else if (statusCode & 0x2) status = 'ERROR';
          else if (statusCode & 0x10) status = 'PRINTING';
          else if (statusCode & 0x80) status = 'DELETED';
          else if (statusCode & 0x100) status = 'PRINTED';

          jobs.push({
            jobId: parseInt(jobIdMatch[1]),
            printerName,
            userName: userMatch?.[1] || 'unknown',
            documentName: docMatch?.[1] || 'unknown',
            totalPages: pagesMatch ? parseInt(pagesMatch[1]) : 0,
            pagesPrinted: 0, // rpcclient não expõe isso facilmente
            size: sizeMatch ? parseInt(sizeMatch[1]) : 0,
            status,
            submittedTime: new Date(), // rpcclient não expõe timestamp facilmente
          });
        }
      }

      return jobs;
    } catch (error) {
      console.error(`Erro ao listar jobs de ${printerName}:`, error);
      return [];
    }
  }

  /**
   * Cancela um job específico
   */
  async cancelJob(printerName: string, jobId: number): Promise<boolean> {
    try {
      // setjob <printer> <jobid> <command>
      // command: 1=PAUSE, 2=RESUME, 4=DELETE
      await this.runRpc(`setjob "${printerName}" ${jobId} 4`);
      return true;
    } catch (error) {
      console.error(`Erro ao cancelar job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Pausa um job
   */
  async pauseJob(printerName: string, jobId: number): Promise<boolean> {
    try {
      await this.runRpc(`setjob "${printerName}" ${jobId} 1`);
      return true;
    } catch (error) {
      console.error(`Erro ao pausar job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Retoma um job pausado
   */
  async resumeJob(printerName: string, jobId: number): Promise<boolean> {
    try {
      await this.runRpc(`setjob "${printerName}" ${jobId} 2`);
      return true;
    } catch (error) {
      console.error(`Erro ao retomar job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Pausa a impressora inteira (todos os jobs)
   */
  async pausePrinter(printerName: string): Promise<boolean> {
    try {
      await this.runRpc(`setprinter "${printerName}" 1`);
      return true;
    } catch (error) {
      console.error(`Erro ao pausar impressora ${printerName}:`, error);
      return false;
    }
  }

  /**
   * Retoma a impressora pausada
   */
  async resumePrinter(printerName: string): Promise<boolean> {
    try {
      await this.runRpc(`setprinter "${printerName}" 2`);
      return true;
    } catch (error) {
      console.error(`Erro ao retomar impressora ${printerName}:`, error);
      return false;
    }
  }

  /**
   * Limpa toda a fila de uma impressora
   */
  async clearQueue(printerName: string): Promise<number> {
    try {
      const jobs = await this.listJobs(printerName);
      let canceledCount = 0;

      for (const job of jobs) {
        const success = await this.cancelJob(printerName, job.jobId);
        if (success) canceledCount++;
      }

      return canceledCount;
    } catch (error) {
      console.error(`Erro ao limpar fila de ${printerName}:`, error);
      return 0;
    }
  }

  /**
   * Implementação da interface IPrinterAdapter
   */
  async printPdf(params: { printerShare: string; fileBase64: string }): Promise<{ jobId: string }> {
    const fs = require('fs/promises');
    const path = require('path');
    const { randomUUID } = require('crypto');

    const tmpDir = '/tmp/prints';
    await fs.mkdir(tmpDir, { recursive: true });
    const tmpFile = path.join(tmpDir, `job-${randomUUID()}.pdf`);
    await fs.writeFile(tmpFile, Buffer.from(params.fileBase64, 'base64'));

    try {
      const authStr = this.cfg.domain
        ? `${this.cfg.domain}\\${this.cfg.user}%${this.cfg.pass}`
        : `${this.cfg.user}%${this.cfg.pass}`;

      const args = [
        `//${this.cfg.host}/${params.printerShare}`,
        '-U', authStr,
        '-c', `print ${tmpFile}`,
      ];

      await new Promise((resolve, reject) => {
        const proc = spawn('smbclient', args);
        let stderr = '';
        proc.stderr.on('data', (data) => (stderr += data.toString()));
        proc.on('close', (code) => {
          if (code !== 0) reject(new Error(`smbclient failed: ${stderr}`));
          else resolve(null);
        });
      });

      return { jobId: path.parse(tmpFile).name };
    } finally {
      await fs.unlink(tmpFile).catch(() => {});
    }
  }
}
