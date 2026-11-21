import { createHash, sign, type KeyObject } from 'node:crypto';
import { request } from 'node:https';
import { wsdlNs } from '../../src/features/accounting/dfe/sefaz/SefazSoapClient';
import { DfeSignerTarefaSchema, type DfeSignerResultadoBody } from '../../src/features/accounting/dtos/DfeSignerDto';
import type { FilaDoAssinador, NovaTarefaAssinador, SemResposta } from '../../src/features/accounting/dfe/local/AssinadorLocal';
import type { TlsPki } from './fakeSefaz';

/**
 * X10a EMENDA-4 — o CAIXA FALSO (assinador local em processo) para os testes do servidor. Reconfere o conteúdo como o
 * assinador real (AL-19): sha1 do `SignedInfo` (ou da base do QR v3) = hash pedido, sha1 do elemento = `DigestValue`,
 * CNPJ do emitente e `tpAmb`; assina PKCS#1 v1.5 SHA-1 com a chave de teste e devolve o certificado (L-AL-1). O
 * `TRANSMITIR` abre o mTLS com o certificado de cliente da PKI de teste contra a SEFAZ falsa e devolve o corpo cru.
 * `responder` troca a resposta (falhas, silêncio = `null`).
 */
export type CaixaFalso = FilaDoAssinador & {
  tarefas: NovaTarefaAssinador[];
  responder?: (t: NovaTarefaAssinador) => Promise<DfeSignerResultadoBody | SemResposta>;
  /** O comportamento normal do caixa (assina ou transmite de verdade), para o `responder` embrulhar. */
  padrao: (t: NovaTarefaAssinador) => Promise<DfeSignerResultadoBody>;
};

export const sha1B64 = (s: string | Buffer) => createHash('sha1').update(s).digest('base64');
export const derB64 = (pem: string) => pem.replace(/-----(BEGIN|END) CERTIFICATE-----/g, '').replace(/\s+/g, '');
export const thumbprintDe = (pem: string) => createHash('sha256').update(Buffer.from(derB64(pem), 'base64')).digest('hex');

export function caixaFalso(opts: { key: KeyObject; certPem: string; cnpj: string; tpAmb: '1' | '2'; pki: TlsPki }): CaixaFalso {
  const caixa: CaixaFalso = {
    tarefas: [],
    padrao: async (tarefa) => (tarefa.tipo === 'ASSINAR' ? assinar(tarefa, opts) : transmitir(tarefa, opts.pki)),
    async executar(tarefa) {
      caixa.tarefas.push(tarefa);
      DfeSignerTarefaSchema.parse({ ...tarefa, id: 't1', expiraEm: new Date().toISOString() }); // contrato §4.2
      if (caixa.responder) return caixa.responder(tarefa);
      return caixa.padrao(tarefa);
    },
  };
  return caixa;
}

function assinar(tarefa: Extract<NovaTarefaAssinador, { tipo: 'ASSINAR' }>, opts: { key: KeyObject; certPem: string; cnpj: string; tpAmb: '1' | '2' }): DfeSignerResultadoBody {
  const c = tarefa.conteudo;
  const assinado = c.alvo === 'qrCodeV3Offline' ? Buffer.from(c.baseQrB64!, 'base64') : Buffer.from(c.signedInfoC14nB64!, 'base64');
  if (sha1B64(assinado) !== tarefa.digestB64) return { ok: false, code: 'CONTEUDO_RECUSADO', message: 'hash' };
  if (c.tpAmb !== opts.tpAmb) return { ok: false, code: 'CONTEUDO_RECUSADO', message: 'tpAmb' };
  if (c.alvo !== 'qrCodeV3Offline') {
    const digestValue = /<DigestValue>([^<]+)<\/DigestValue>/.exec(assinado.toString('utf8'))![1];
    if (sha1B64(c.elementoXml!) !== digestValue) return { ok: false, code: 'CONTEUDO_RECUSADO', message: 'digest' };
    if (!c.elementoXml!.includes(`<CNPJ>${opts.cnpj}</CNPJ>`)) return { ok: false, code: 'CONTEUDO_RECUSADO', message: 'cnpj' };
    if (!c.elementoXml!.includes(`<tpAmb>${opts.tpAmb}</tpAmb>`)) return { ok: false, code: 'CONTEUDO_RECUSADO', message: 'tpAmb do elemento' };
  }
  return { ok: true, tipo: 'ASSINAR', signatureValueB64: sign('sha1', assinado, opts.key).toString('base64'), certificadoDerB64: derB64(opts.certPem) };
}

async function transmitir(tarefa: Extract<NovaTarefaAssinador, { tipo: 'TRANSMITIR' }>, pki: TlsPki): Promise<DfeSignerResultadoBody> {
  const envelope = Buffer.from(tarefa.envelopeB64, 'base64');
  const r = await new Promise<{ status: number; body: string }>((resolve, reject) => {
    const req = request(
      tarefa.url,
      {
        method: 'POST',
        pfx: pki.clientPfx,
        passphrase: pki.passphrase,
        ca: pki.caPem,
        agent: false,
        headers: { 'Content-Type': `application/soap+xml; charset=utf-8; action="${wsdlNs(tarefa.servico)}"`, 'Content-Length': envelope.length },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
      },
    );
    req.on('error', reject);
    req.end(envelope);
  });
  return { ok: true, tipo: 'TRANSMITIR', httpStatus: r.status, corpoB64: Buffer.from(r.body, 'utf8').toString('base64') };
}
