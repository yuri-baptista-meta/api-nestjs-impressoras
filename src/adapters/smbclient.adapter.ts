import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

export type SmbCreds = { host: string; user: string; pass: string; domain?: string; dialect?: string };

export class SmbClientAdapter {
  constructor(private cfg: SmbCreds) {}

  private smbArgsBase() {
    const args: string[] = [];
    if (this.cfg.dialect) args.push('-m', this.cfg.dialect); // e.g. SMB3
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

    // Parse robusto: linhas contendo "Printer"
    const lines = stdout.split(/\r?\n/);
    const printers = lines
      .map((l) => l.trim())
      .filter((l) => /\bPrinter\b/.test(l))
      .map((l) => {
        // formato típico: "<Sharename>    Printer   <Comment>"
        const sharename = l.split(/\s{2,}/)[0]; // primeira coluna
        return { name: sharename, uri: `smb://${this.cfg.host}/${encodeURIComponent(sharename)}` };
      });

    // remove entradas estranhas (ex: "print$" de drivers)
    return printers.filter((p) => !/^print\$/i.test(p.name));
  }

  /** Envia PDF para a fila via comando "print" do smbclient */
  async printPdf({ printerShare, fileBase64 }: { printerShare: string; fileBase64: string }) {
    // grava pdf em /tmp
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
      // limpa com calma; se quiser arquivar, remova este unlink
      fs.unlink(tmpFile).catch(() => {});
    }
  }
}
