import { createHash } from 'node:crypto';
import { logger } from '../../../../lib/logger';
import { AssinaturaRemotaError, type AlgoritmoHash, type AssinadorRemotoPort, type AssinaturaResultado, type ConteudoAssinado } from '../AssinadorRemotoPort';
import { SefazTransporteError, envelopeSoap, extrairResultado } from '../sefaz/SefazSoapClient';
import type { SefazServico } from '../sefaz/sefazConfig';
import type { SefazTransporte } from '../sefaz/SefazTransporte';
import type { DfeSignerResultadoBody, DfeSignerTarefaAssinar, DfeSignerTarefaTransmitir } from '../../dtos/DfeSignerDto';
import { DFE_SIGNER_HOST_FORA_DA_LISTA, DFE_TRANSMITIR_FOLGA_MS } from '../../models/DfeSigner.model';

/** A tarefa que o adaptador pede; o id e o `expiraEm` são da fila. */
export type NovaTarefaAssinador = Omit<DfeSignerTarefaAssinar, 'id' | 'expiraEm'> | Omit<DfeSignerTarefaTransmitir, 'id' | 'expiraEm'>;

/**
 * Sem resultado no prazo. `NAO_ENTREGUE` = ninguém pegou a tarefa (ela vence sem efeito). `ENTREGUE` = o caixa já a tinha
 * quando o prazo acabou: pode ter executado (transmitido à SEFAZ), então quem chama trata como timeout da SEFAZ (AL-9).
 */
export type SemResposta = 'ENTREGUE' | 'NAO_ENTREGUE';

/**
 * A fila do assinador JÁ LIGADA a um dispositivo (X10a EMENDA-4 AL-6; a porta não lê Prisma — quem a monta é o
 * `DfeSignerTaskService`, pela unidade do documento). `executar` cria a tarefa e espera o resultado até `esperaMs`;
 * sem resultado no prazo, devolve `SemResposta` (a tarefa vence).
 */
export interface FilaDoAssinador {
  executar(tarefa: NovaTarefaAssinador, esperaMs: number): Promise<DfeSignerResultadoBody | SemResposta>;
}

const sha256Hex = (b: Buffer) => createHash('sha256').update(b).digest('hex');

/**
 * AL-8 (F-AL-10 a; contrato §4.1) — `AssinadorLocalSigner`: assina pelo assinador do caixa, com a chave do token do
 * cliente. Cria a tarefa `ASSINAR` com o hash E o conteúdo (AL-10, F-AL-5 b: o assinador reconfere antes de assinar) e
 * espera até `DFE_ASSINADOR_TIMEOUT_MS`. Mapa §4.2: `TOKEN_AUSENTE | PIN_CANCELADO | CERT_VENCIDO` e o silêncio ⇒
 * `ASSINADOR_INDISPONIVEL` (a nota espera, F-AL-6 a); `CONTEUDO_RECUSADO` ⇒ `CONTEUDO_RECUSADO`. L-AL-1: o resultado
 * traz o certificado que assinou; sha256 do DER ≠ `certThumbprint` do pareamento ⇒ `CONTEUDO_RECUSADO`.
 */
export class AssinadorLocalSigner implements AssinadorRemotoPort {
  readonly name = 'local';

  constructor(
    private readonly fila: FilaDoAssinador,
    private readonly opts: { dispositivoId: string; certThumbprint: string; timeoutMs: number; now?: () => Date },
  ) {}

  async assinarHash(digestB64: string, algoritmo: AlgoritmoHash, _tipo: unknown, _cred: unknown, conteudo?: ConteudoAssinado): Promise<AssinaturaResultado> {
    if (algoritmo !== 'sha1') return { ok: false, code: 'CONTEUDO_RECUSADO', message: `o assinador local só assina rsa-sha1 (pedido: ${algoritmo})` };
    if (!conteudo) return { ok: false, code: 'CONTEUDO_RECUSADO', message: 'pedido sem o conteúdo que o assinador reconfere (F-AL-5 b)' };
    const r = await this.fila.executar({ tipo: 'ASSINAR', algoritmo: 'rsa-sha1', digestB64, conteudo }, this.opts.timeoutMs);
    if (typeof r === 'string') {
      // Assinatura não sai para a SEFAZ: mesmo entregue e sem resposta, a nota espera e a retomada assina de novo.
      logger.event('warn', 'dfe.signer_task_timeout', 'dfe_signer: o assinador local não respondeu à assinatura', {
        dispositivoId: this.opts.dispositivoId,
        tipo: 'ASSINAR',
        esperaMs: this.opts.timeoutMs,
        entregue: r === 'ENTREGUE',
      });
      return { ok: false, code: 'ASSINADOR_INDISPONIVEL', message: `o assinador local não respondeu em ${Math.round(this.opts.timeoutMs / 1000)} s` };
    }
    if (!r.ok) {
      if (r.code === 'CONTEUDO_RECUSADO') {
        this.recusado('conteudo');
        return { ok: false, code: 'CONTEUDO_RECUSADO', message: r.message };
      }
      return { ok: false, code: 'ASSINADOR_INDISPONIVEL', message: `${r.code}: ${r.message}` };
    }
    if (r.tipo !== 'ASSINAR') return { ok: false, code: 'CONTEUDO_RECUSADO', message: 'resultado de outro tipo de tarefa' };
    if (sha256Hex(Buffer.from(r.certificadoDerB64, 'base64')) !== this.opts.certThumbprint) {
      this.recusado('certificado');
      return { ok: false, code: 'CONTEUDO_RECUSADO', message: 'o certificado que assinou não é o do pareamento (L-AL-1)' };
    }
    return { ok: true, signatureValueB64: r.signatureValueB64, assinadoEm: (this.opts.now?.() ?? new Date()).toISOString(), certificadoDerB64: r.certificadoDerB64 };
  }

  private recusado(motivo: 'conteudo' | 'certificado'): void {
    logger.event('warn', 'dfe.signer_conteudo_recusado', 'dfe_signer: assinatura recusada', { dispositivoId: this.opts.dispositivoId, motivo });
  }
}

/**
 * AL-9 — `AssinadorLocalTransporte`: o mTLS com a SEFAZ sai do caixa, com o certificado do cliente. Cria a tarefa
 * `TRANSMITIR` com o envelope SOAP 1.2 já montado (`envelopeSoap`, o mesmo do `SefazSoapClient`) e devolve o conteúdo de
 * `nfeResultMsg` (`extrairResultado`). Os erros do assinador mapeiam UM A UM nos códigos do `SefazTransporteError`
 * (§4.2: `TLS→sefaz_tls · TIMEOUT|REDE→sefaz_timeout · HTTP→sefaz_http · corpo sem nfeResultMsg→sefaz_resposta_ilegivel`),
 * então a contingência da decisão 4 de 29/10 liga pelo mesmo `isFalhaDeComunicacao`. **Assinador fora do ar não é falha
 * de comunicação com a SEFAZ** (F-AL-6 a): o silêncio e a falta do token viram `AssinaturaRemotaError
 * ASSINADOR_INDISPONIVEL` (a nota espera em `PENDING_SIGNATURE`, sem contingência). `HOST_FORA_DA_LISTA` = a tabela de
 * endpoints e a lista embarcada divergiram: erro nosso (500).
 */
export class AssinadorLocalTransporte implements SefazTransporte {
  constructor(
    private readonly fila: FilaDoAssinador,
    private readonly opts: { dispositivoId: string; timeoutMs: number },
  ) {}

  async call(url: string, servico: SefazServico, xml: string): Promise<string> {
    const envelopeB64 = Buffer.from(envelopeSoap(servico, xml), 'utf8').toString('base64');
    const espera = this.opts.timeoutMs + DFE_TRANSMITIR_FOLGA_MS;
    const r = await this.fila.executar({ tipo: 'TRANSMITIR', url, servico, envelopeB64, timeoutMs: this.opts.timeoutMs }, espera);
    if (typeof r === 'string') {
      logger.event('warn', 'dfe.signer_task_timeout', 'dfe_signer: o assinador local não respondeu à transmissão', {
        dispositivoId: this.opts.dispositivoId,
        tipo: 'TRANSMITIR',
        esperaMs: espera,
        entregue: r === 'ENTREGUE',
      });
      // Já entregue ao caixa = a SEFAZ pode ter recebido: é timeout da SEFAZ (a nota fica SENT e a consulta reconsulta a
      // MESMA chave). Nunca PENDING_SIGNATURE, que geraria outra chave e outra autorização para a mesma venda (AL-9).
      if (r === 'ENTREGUE') throw new SefazTransporteError('sefaz_timeout', `o assinador local não devolveu a transmissão em ${Math.round(espera / 1000)} s`);
      // Nunca entregue: nada saiu do caixa para a SEFAZ, a nota espera o assinador (F-AL-6 a).
      throw new AssinaturaRemotaError('ASSINADOR_INDISPONIVEL', `o assinador local não respondeu à transmissão em ${Math.round(espera / 1000)} s`);
    }
    if (!r.ok) {
      switch (r.code) {
        case 'TLS':
          throw new SefazTransporteError('sefaz_tls', r.message);
        case 'TIMEOUT':
        case 'REDE':
          throw new SefazTransporteError('sefaz_timeout', r.message);
        case 'HTTP':
          throw new SefazTransporteError('sefaz_http', r.message);
        case 'HOST_FORA_DA_LISTA':
          throw new Error(`${DFE_SIGNER_HOST_FORA_DA_LISTA}: a URL do webservice não está na lista embarcada no assinador`);
        case 'TOKEN_AUSENTE':
        case 'PIN_CANCELADO':
        case 'CERT_VENCIDO':
          throw new AssinaturaRemotaError('ASSINADOR_INDISPONIVEL', `${r.code}: ${r.message}`);
        default:
          throw new Error(`dfe_assinador_resultado_invalido: ${r.code} não é resultado de transmissão`);
      }
    }
    if (r.tipo !== 'TRANSMITIR') throw new Error('dfe_assinador_resultado_invalido: resultado de outro tipo de tarefa');
    const corpo = Buffer.from(r.corpoB64, 'base64').toString('utf8');
    // Mesma régua do SefazSoapClient: SOAP 1.2 devolve Fault com 500; sem nfeResultMsg o corpo não é resultado do serviço.
    if (r.httpStatus >= 500 && !/nfeResultMsg/.test(corpo)) throw new SefazTransporteError('sefaz_http', `HTTP ${r.httpStatus}`);
    return extrairResultado(corpo);
  }
}
