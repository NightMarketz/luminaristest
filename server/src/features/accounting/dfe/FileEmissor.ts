import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import type { CancelResult, DfeCapabilities, DfeEmissorPort, EmissaoResult, EmitirInput } from './DfeEmissorPort';

/**
 * FileEmissor — BE-INCR-DFE (BRIEF item 12). Grava o payload em disco para o dono colar num emissor
 * web manualmente e devolve o retorno num arquivo `<ref>.result.json` — sem arquivo, `consultar`
 * continua `PROCESSING` (nunca inventa autorização). `cancelar` NUNCA devolve `CANCELLED` sem prova —
 * sempre um resultado tipado que o operador resolve fora do sistema (cancelamento manual no emissor web).
 */
export class FileEmissor implements DfeEmissorPort {
  public readonly name = 'file';
  public readonly capabilities: DfeCapabilities = {
    numbersDps: false,
    consultar: true,
    cancelar: true,
    // Nenhum parceiro real por trás — sem webhook de verdade para verificar (item 28: Null/File ⇒ 401 sempre).
    webhook: false,
  };

  constructor(private readonly baseDir: string) {}

  private fileFor(ambiente: string, kind: string, ref: string): string {
    return join(this.baseDir, ambiente, kind, `${ref}.json`);
  }

  private resultFileFor(ambiente: string, kind: string, ref: string): string {
    return join(this.baseDir, ambiente, kind, `${ref}.result.json`);
  }

  async emitir(input: EmitirInput): Promise<EmissaoResult> {
    const file = this.fileFor(input.ambiente, input.kind, input.ref);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(input.payload, null, 2), 'utf8');
    return { status: 'PROCESSING', partnerRef: input.ref, errors: [] };
  }

  /**
   * Procura `<ref>.result.json` (o dono cola o retorno do emissor web ali). O `ref` carrega
   * ambiente+kind implicitamente só através do caminho — como `consultar` só recebe `partnerRef`,
   * varremos os dois ambientes/kinds possíveis pelo próprio `ref` embutido no nome do arquivo
   * (mesmo esquema de `fileFor`, procurando nos dois `kind`/`ambiente` conhecidos).
   */
  async consultar(partnerRef: string): Promise<EmissaoResult> {
    for (const ambiente of ['producao', 'homologacao']) {
      for (const kind of ['NFSE', 'NFE']) {
        const resultFile = this.resultFileFor(ambiente, kind, partnerRef);
        try {
          const raw = await readFile(resultFile, 'utf8');
          const parsed = JSON.parse(raw) as Partial<EmissaoResult>;
          return {
            status: parsed.status ?? 'PROCESSING',
            partnerRef,
            numero: parsed.numero,
            serie: parsed.serie,
            nNFSe: parsed.nNFSe,
            chaveOuCodigo: parsed.chaveOuCodigo,
            valores: parsed.valores,
            errors: parsed.errors ?? [],
          };
        } catch {
          // sem arquivo-resposta neste par (ambiente,kind) — tenta o próximo, senão PROCESSING.
        }
      }
    }
    return { status: 'PROCESSING', partnerRef, errors: [] };
  }

  /** Nunca `CANCELLED` — o cancelamento real acontece manualmente no emissor web (fora do sistema). */
  async cancelar(partnerRef: string, motivo: { cMotivo: 1 | 2 | 9; xMotivo: string }): Promise<CancelResult> {
    void partnerRef;
    void motivo;
    return {
      status: 'REJECTED',
      errors: [{ code: 'file_cancel_manual', message: 'cancelamento manual no emissor web' }],
    };
  }

  verifyWebhook(): { ok: true; partnerRef: string } | { ok: false } {
    return { ok: false };
  }
}
