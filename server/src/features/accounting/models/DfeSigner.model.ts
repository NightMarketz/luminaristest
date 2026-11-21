/**
 * Assinador local (X10a EMENDA-4, AL-3..AL-5, AL-12, AL-16; ADR-ASSINADOR-LOCAL) — constantes de domínio do pareamento
 * e do dispositivo. O tipo das linhas vem de `generated/prisma`; este arquivo é dono dos códigos de erro, dos eventos de
 * auditoria e de log e dos limiares.
 */

/** AL-3: código de pareamento — 12 caracteres (o FE agrupa de 4 em 4) de alfabeto sem ambíguos (sem 0/O, 1/I/L). */
export const DFE_SIGNER_CODIGO_ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const DFE_SIGNER_CODIGO_TAMANHO = 12;
/** AL-3: TTL do código. */
export const DFE_SIGNER_CODIGO_TTL_MS = 10 * 60 * 1000;
/** AL-3: token de dispositivo = 32 bytes aleatórios em base64url (43 caracteres). */
export const DFE_SIGNER_TOKEN_BYTES = 32;
/** AL-13 / F-FEAS-5 a: sem poll há mais de 90 s ⇒ fora do ar (uma fonte só para o pré-voo e para a tela). */
export const DFE_SIGNER_ONLINE_MS = 90_000;
/** AL-22 / F-FEAS-5 a: versão mínima publicada pelo servidor (o 426 do poll é do AL-PR-6). */
export const DFE_SIGNER_VERSAO_MINIMA = '1.0.0';
/** Versão do protocolo servidor ⇄ assinador (contrato §4.2). */
export const DFE_SIGNER_PROTOCOLO = 'v1';

// ── Códigos de erro (AL-3, AL-4, L-AL-2) ────────────────────────────────────────────────────────────
export const DFE_SIGNER_CODIGO_INVALIDO = 'dfe_signer_codigo_invalido';
export const DFE_SIGNER_CNPJ_DIVERGENTE = 'dfe_signer_cnpj_divergente';
export const DFE_SIGNER_CERTIFICADO_VENCIDO = 'dfe_signer_certificado_vencido';
/** DER que o leitor de certificado (`readCertFacts`) não consegue ler. */
export const DFE_SIGNER_CERTIFICADO_INVALIDO = 'dfe_signer_certificado_invalido';
/** L-AL-2: o 2º vínculo exige o MESMO certificado do pareamento do dispositivo. */
export const DFE_SIGNER_CERTIFICADO_DIVERGENTE = 'dfe_signer_certificado_divergente';
/** Ambiente da instância (`DFE_PARTNER_ENV_<KIND>` / `DFE_PARTNER_ENV`) ausente: o pareamento não sabe o `tpAmb`. */
export const DFE_SIGNER_AMBIENTE_NAO_CONFIGURADO = 'dfe_signer_ambiente_nao_configurado';

// ── Auditoria (allowlist em auditCanonical.ts na mesma mudança; AL-16: nunca certificado, subject nem token) ──
export const DFE_SIGNER_PAIRED = 'dfe_signer.paired';
export const DFE_SIGNER_REVOKED = 'dfe_signer.revoked';

/** Motivo da revogação no evento `dfe_signer.revoked`. */
export type DfeSignerRevokeMotivo = 'revogado' | 'substituido';

// ── Fila do assinador (AL-PR-3: AL-6..AL-11, AL-13, AL-14; contrato §4.2/§4.3) ──────────────────────────────────────
export const DFE_SIGNER_TASK_TIPOS = ['ASSINAR', 'TRANSMITIR'] as const;
export type DfeSignerTaskTipo = (typeof DFE_SIGNER_TASK_TIPOS)[number];
export const DFE_SIGNER_TASK_STATUS = ['PENDING', 'DELIVERED', 'DONE', 'FAILED', 'EXPIRED'] as const;
export type DfeSignerTaskStatus = (typeof DFE_SIGNER_TASK_STATUS)[number];
/** AL-7 (F-AL-2 a): o long-poll segura a conexão até 25 s. */
export const DFE_SIGNER_ESPERA_MAX_S = 25;
/**
 * AL-8 (F-AL-10 a): quanto o pedido do operador espera a assinatura (`DFE_ASSINADOR_TIMEOUT_MS`, padrão 20 s — "proposta,
 * a medir no runbook"). Inválido ou ≤ 0 no env cai no padrão.
 */
export const DFE_ASSINADOR_TIMEOUT_PADRAO_MS = 20_000;
/** AL-9: tempo da conexão TLS do assinador com a SEFAZ (`timeoutMs` da tarefa; o contrato aceita 1 s a 60 s). */
export const DFE_TRANSMITIR_TIMEOUT_PADRAO_MS = 30_000;
/** AL-9: o servidor espera o resultado do TRANSMITIR pelo `timeoutMs` da tarefa mais esta folga (poll + volta). */
export const DFE_TRANSMITIR_FOLGA_MS = 5_000;
/**
 * Lease curto da entrega (AL-6): a tarefa entregue só volta ao poll depois de `leaseUntil < agora`. O caixa renova o
 * lease com `POST /v1/tarefas/:id/heartbeat` (a cada ~20 s); sem heartbeat, a tarefa é reentregue (perda de AL-6: o caixa
 * reiniciou no meio). O prazo da tarefa (`expiresAt`, AL-9) continua valendo por cima: vencida nunca é entregue nem renovada.
 * Constante de operação (não regra fiscal).
 */
export const DFE_SIGNER_LEASE_MS = 30_000;

export const DFE_SIGNER_TAREFA_NAO_ENCONTRADA = 'dfe_signer_tarefa_nao_encontrada';
/** AL-6: o mesmo taskId com resultado diferente do já registrado. */
export const DFE_SIGNER_RESULTADO_CONFLITANTE = 'dfe_signer_resultado_conflitante';
/** AL-6: resultado de tarefa vencida (o servidor já desistiu de esperar). */
/** Heartbeat numa tarefa que não está entregue (pendente ou já concluída): não há lease para renovar. */
export const DFE_SIGNER_TAREFA_NAO_ENTREGUE = 'dfe_signer_tarefa_nao_entregue';
export const DFE_SIGNER_TAREFA_VENCIDA ='dfe_signer_tarefa_vencida';
/** AL-6: o tipo do resultado não é o da tarefa. */
export const DFE_SIGNER_RESULTADO_TIPO = 'dfe_signer_resultado_tipo_divergente';
/** AL-11 / contrato §4.2: o assinador recusou host fora da lista — a tabela e a lista divergiram (erro nosso, 500). */
export const DFE_SIGNER_HOST_FORA_DA_LISTA = 'dfe_assinador_host_fora_da_lista';
/** AL-2: transporte do assinador local chamado sem o dispositivo da unidade (o serviço não resolveu o contexto). */
export const DFE_SIGNER_SEM_DISPOSITIVO = 'dfe_assinador_sem_dispositivo';

/** AL-13 (F-AL-6 a): o faltante nomeado do pré-voo, como o `FALTANTE_SESSAO_PSC` do PR-7. */
export const FALTANTE_ASSINADOR_LOCAL = 'assinador local';
