import { z } from 'zod';
import type { DfeAmbiente } from '../DfeEmissorPort';
import dados from './sefazEndpoints.data.json';

/**
 * BE-INCR-NFCE-EMENDA-2 item E-11 (F-NFCE-E1-3 b, 27 UF) — endereços dos webservices NF-e 4.00 por (UF, modelo, ambiente,
 * serviço). O dado mora em `sefazEndpoints.data.json`, lido em 29/10/2026 nas páginas oficiais (Portal Nacional da NF-e,
 * SVRS, SEFAZ-SP, SEFAZ-MG); cada linha carrega a `fonte` (URL + data de acesso). UF atendida por autorizadora virtual
 * (SVRS/SVAN) repete a URL da virtual — o código nunca infere. Linha sem fonte não entra: a combinação (UF, modelo)
 * fica em `desabilitadas` com o motivo, e a consulta dela é erro nomeado. Custo aceito pelo dono: dado que envelhece
 * sem uso (mitigação: o teste de cobertura e a data na `fonte`).
 */

export const SEFAZ_SERVICOS = ['NFeAutorizacao4', 'NFeConsultaProtocolo4', 'NFeInutilizacao4', 'NFeRecepcaoEvento4', 'NFeStatusServico4'] as const;
export type SefazServico = (typeof SEFAZ_SERVICOS)[number];

export const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'] as const;

const SefazEndpointSchema = z
  .object({
    uf: z.enum(UFS),
    modelo: z.union([z.literal(55), z.literal(65)]),
    ambiente: z.enum(['producao', 'homologacao']),
    servico: z.enum(SEFAZ_SERVICOS),
    url: z.string().regex(/^https:\/\/[^\s?]+$/),
    fonte: z.string().regex(/https:\/\/.+\(\d{2}\/\d{2}\/\d{4}\)/),
    nota: z.string().optional(),
  })
  .strict();
export type SefazEndpoint = z.infer<typeof SefazEndpointSchema>;

const DadosSchema = z.object({
  acessoEm: z.string(),
  coletadoPor: z.string(),
  autorizadoras: z.array(z.object({ uf: z.enum(UFS), modelo: z.union([z.literal(55), z.literal(65)]), autorizadora: z.string(), fonte: z.string(), nota: z.string().optional() }).strict()),
  endpoints: z.array(SefazEndpointSchema),
  desabilitadas: z.array(z.object({ uf: z.enum(UFS), modelo: z.union([z.literal(55), z.literal(65)]), motivo: z.string().min(1) }).strict()),
  observacoes: z.array(z.string()).optional(),
});

const parsed = DadosSchema.parse(dados);

export const SEFAZ_ENDPOINTS: readonly SefazEndpoint[] = parsed.endpoints;
export const SEFAZ_AUTORIZADORAS = parsed.autorizadoras;
export const SEFAZ_DESABILITADAS = parsed.desabilitadas;

/**
 * URL do serviço para a UF/modelo/ambiente. UF sem linha ⇒ erro nomeado `sefaz_endpoint_ausente` (com o motivo da
 * desabilitação quando houver) — nunca a URL de outra UF.
 */
export function endpointSefaz(uf: string, modelo: 55 | 65, ambiente: DfeAmbiente, servico: SefazServico): string {
  const linha = SEFAZ_ENDPOINTS.find((e) => e.uf === uf && e.modelo === modelo && e.ambiente === ambiente && e.servico === servico);
  if (linha) return linha.url;
  const motivo = SEFAZ_DESABILITADAS.find((d) => d.uf === uf && d.modelo === modelo)?.motivo ?? 'sem linha na tabela';
  throw new Error(`sefaz_endpoint_ausente: ${uf}/${modelo}/${ambiente}/${servico} — ${motivo}`);
}
