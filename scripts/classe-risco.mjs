#!/usr/bin/env node
// Classe de risco de um PR para o merge da sessão maestro (D-2026-10-28-FLUXO-AUTONOMO).
//   node scripts/classe-risco.mjs pr <n> [--json]        → lê o PR com `gh pr view`
//   node scripts/classe-risco.mjs arquivos <caminho...>  → classifica uma lista local (ex.: git diff --name-only)
// Verde  → a maestro mergeia sozinha com CI verde, sem conflito, fora de draft.
// Vermelho · lote: não → a maestro mergeia sozinha depois do PASS do revisor-independente (D-2026-11-10-METODO-FABLE-5-2).
// Vermelho · lote: sim → lote diário do dono, que aprova por número (lista dura, vermelho de texto, major, draft).
// Em dúvida, vermelho e lote: as duas listas abaixo só mudam por decisão do dono.
import { execFileSync } from 'node:child_process';
import { globToRegex } from './paralelo.mjs';

// Caminho que, tocado, faz o PR inteiro ser vermelho. Cada linha diz o porquê.
export const VERMELHO = [
  ['server/src/features/accounting/**', 'contábil/fiscal (razão, apuração, SPED, NF-e, Reinf)'],
  ['server/src/features/accountingBinding/**', 'ponte venda → razão'],
  ['server/src/features/legalParameters/**', 'parâmetro legal (alíquota, teto, tabela)'],
  ['my-app/features/accounting/**', 'tela fiscal/contábil'],
  ['server/prisma/**', 'schema ou migração'],
  ['server/src/middleware/auth.ts', 'autenticação'],
  ['.github/**', 'CI e automação do repositório'],
  ['.claude/**', 'regra de agente, skill ou gate'],
  ['CLAUDE.md', 'regra de agente'],
  ['**/CLAUDE.md', 'regra de agente'],
  ['docs/plano/gates/**', 'gate humano (desfecho e assinatura são do dono)'],
  ['docs/plano/decisoes/**', 'cédula de decisão do dono'],
  ['docs/plano/trilhos/**', 'trilho travado'],
  ['docs/plano/rejeitadas/**', 'decisão rejeitada'],
  ['docs/adr/**', 'decisão de arquitetura'],
  // Proposta de 04/11 (lacuna do #1017/#908): contábil/fiscal fora de features/accounting. Aguarda OK nominal do dono;
  // `<dir>/**/x*` pega o arquivo e o teste dele em __tests__/. Cada bloco pode cair sozinho.
  // G1 — lib fiscal: serializer, parser, assinatura e prazo PUROS de obrigação acessória (carrega regra).
  ['server/src/lib/**/sped*', 'serializer da ECD (corpo do SPED)'],
  ['server/src/lib/**/ecf*', 'serializer da ECF (Presumido e Real)'],
  ['server/src/lib/**/nf*', 'NF-e/NFC-e/NFS-e: parser, XML, assinatura, custo por regime'],
  ['server/src/lib/**/dfeXmlSign*', 'assinatura XMLDSig do DF-e'],
  ['server/src/lib/danfe/**', 'DANFE (leitor do XML autorizado)'],
  ['server/src/lib/**/reinf*', 'serializer da EFD-Reinf'],
  ['server/src/lib/reinf/**', 'XSD oficial da EFD-Reinf'],
  ['server/src/lib/**/prazoReinf*', 'prazo legal de entrega da Reinf'],
  ['server/src/lib/**/vencimentoRetencao*', 'vencimento legal da retenção na fonte'],
  ['server/src/lib/**/ibsCbs*', 'apuração IBS/CBS'],
  ['server/src/lib/**/mit.*', 'arquivo do MIT (DCTFWeb)'],
  ['server/src/lib/**/referentialCatalog*', 'catálogo referencial da RFB'],
  ['server/src/lib/**/cnpj*', 'CNPJ alfanumérico e chave de acesso da NF-e'],
  ['server/src/lib/**/saleLine*', 'regra da linha de venda que alimenta a ponte contábil'],
  ['server/src/lib/__tests__/fixtures/**', 'XML fiscal de fixture (NF-e/NFS-e)'],
  // G2 — controller que monta corpo fiscal antes do DTO (carrega regra).
  ['server/src/controllers/**/sped*', 'monta signatário J930/0930 e perfil do SPED (expandSignerContacts)'],
  ['server/src/controllers/**/simples*', 'backfill de caixa antes da apuração do Simples'],
  // G3 — controller fiscal (fiação: escopo, policy, multipart, status HTTP da obrigação).
  ['server/src/controllers/**/accounting*', 'controller contábil'],
  ['server/src/controllers/**/accountant*', 'controller contábil (contador)'],
  ['server/src/controllers/**/*Fiscal*', 'controller fiscal'],
  ['server/src/controllers/**/fiscal*', 'controller fiscal'],
  ['server/src/controllers/**/lalur*', 'controller do LALUR/LACS'],
  ['server/src/controllers/**/nf*', 'controller de NF-e/NFC-e'],
  ['server/src/controllers/**/danfe*', 'controller do DANFE'],
  ['server/src/controllers/**/reinf*', 'controller da EFD-Reinf'],
  ['server/src/controllers/**/tax*', 'controller de apuração/simulação de tributo'],
  ['server/src/controllers/**/ibsCbs*', 'controller de IBS/CBS'],
  ['server/src/controllers/**/withholding*', 'controller de retenção na fonte'],
  ['server/src/controllers/**/issBeneficio*', 'controller de benefício de ISS'],
  ['server/src/controllers/**/mitExport*', 'controller do MIT'],
  ['server/src/controllers/**/psc*', 'controller de credencial PSC (assinatura)'],
  ['server/src/controllers/**/companySigner*', 'controller de signatário da empresa'],
  ['server/src/controllers/**/legalParameter*', 'controller de parâmetro legal'],
  ['server/src/controllers/**/unitGuard.*', 'guarda de unidade das rotas contábeis/fiscais'],
  // G4 — controller contábil (fiação do razão, períodos, subrazões).
  ['server/src/controllers/**/closing*', 'controller de fechamento'],
  ['server/src/controllers/**/fixedAsset*', 'controller do imobilizado'],
  ['server/src/controllers/**/depreciation*', 'controller de depreciação'],
  ['server/src/controllers/**/profitDistribution*', 'controller de distribuição de lucro'],
  ['server/src/controllers/**/interestOnEquity*', 'controller de JCP'],
  ['server/src/controllers/**/referential*', 'controller do plano referencial'],
  ['server/src/controllers/**/entryApproval*', 'controller de aprovação de lançamento'],
  ['server/src/controllers/**/reconcil*', 'controller de conciliação'],
  ['server/src/controllers/**/bankSettlement*', 'controller de liquidação bancária'],
  ['server/src/controllers/**/payable*', 'controller do contas a pagar'],
  ['server/src/controllers/**/receivable*', 'controller do contas a receber'],
  ['server/src/controllers/**/paymentAccount*', 'controller de conta de pagamento'],
  ['server/src/controllers/**/collectionCharge*', 'controller de cobrança'],
  ['server/src/controllers/**/counterparty*', 'controller de contraparte'],
  ['server/src/controllers/**/partner*', 'controller de sócios'],
  ['server/src/controllers/**/dimension*', 'controller de dimensão contábil'],
  ['server/src/controllers/**/sourceDocument*', 'controller de documento-fonte'],
  ['server/src/controllers/**/documentAttachment*', 'controller de anexo de lançamento'],
  ['server/src/controllers/**/dataExchange*', 'controller de troca de dados com o contador'],
  ['server/src/controllers/**/productDestination*', 'controller de destinação de produto'],
  // G5 — rotas contábeis/fiscais (fiação: authenticate, policy, ordem do middleware).
  ['server/src/routes/accounting*', 'rota contábil'],
  ['server/src/routes/lalur.ts', 'rota do LALUR/LACS'],
  ['server/src/routes/nfe.ts', 'rota de NF-e'],
  ['server/src/routes/dfe.ts', 'rota de DF-e'],
  ['server/src/routes/reinfBatches.ts', 'rota da EFD-Reinf'],
  ['server/src/routes/simples.ts', 'rota do Simples'],
  ['server/src/routes/taxAssessments.ts', 'rota de apuração'],
  ['server/src/routes/serviceFiscalSuggestions.ts', 'rota de sugestão fiscal de serviço'],
  ['server/src/routes/legalParameters.ts', 'rota de parâmetro legal'],
  ['server/src/routes/mitExports.ts', 'rota do MIT'],
  // G6 — regra fiscal morando em outra feature (carrega regra).
  ['server/src/features/**/*iscal*', 'regra fiscal fora de features/accounting (guarda da venda, sugestão, perfil)'],
  ['server/src/features/sectorKits/kits/_shared/**', 'conteúdo fiscal e referencial canônico dos kits'],
  // G7 — job contábil/fiscal (carrega regra: sync com o razão, polling do DF-e, recálculo legal, migração do plano).
  ['server/src/jobs/**/*ccounting*', 'job de sync/reconcile/seed contábil'],
  ['server/src/jobs/**/*fePoll*', 'job de polling do DF-e'],
  ['server/src/jobs/**/*egalParams*', 'job de parâmetro legal'],
  ['server/src/jobs/**/migratePlano*', 'migração do plano de contas'],
  // G8 — teste de integração contábil/fiscal na raiz (oráculo do comportamento).
  ['server/src/__tests__/**/ibsCbs*', 'teste de IBS/CBS'],
  ['server/src/__tests__/**/taxAssessment*', 'teste de apuração'],
  ['server/src/__tests__/**/legalParam*', 'teste de parâmetro legal'],
  ['server/src/__tests__/**/pisCofins*', 'teste de PIS/Cofins'],
  ['server/src/__tests__/**/jcp*', 'teste de JCP'],
  ['server/src/__tests__/**/profitDistribution*', 'teste de distribuição de lucro'],
  // G9 — FE fiscal fora de my-app/features/accounting (fiação: página e cliente HTTP).
  ['my-app/pages/accounting/**', 'página contábil'],
  ['my-app/lib/services/**/accounting*', 'cliente HTTP contábil'],
  ['my-app/lib/services/**/*iscal*', 'cliente HTTP fiscal'],
  ['my-app/lib/services/**/sped*', 'cliente HTTP do SPED'],
  ['my-app/lib/services/**/nfe*', 'cliente HTTP de NF-e'],
  ['my-app/lib/services/**/dfe*', 'cliente HTTP de DF-e'],
  ['my-app/lib/services/**/lalur*', 'cliente HTTP do LALUR'],
  ['my-app/lib/services/**/simples*', 'cliente HTTP do Simples'],
  ['my-app/lib/services/**/taxAssessments*', 'cliente HTTP de apuração'],
  ['my-app/lib/services/**/legalParameters*', 'cliente HTTP de parâmetro legal'],
  ['my-app/lib/services/**/fixedAssets*', 'cliente HTTP do imobilizado'],
  // G10 — o próprio gate: mexer na lista ou no casamento de glob muda a classe de todo PR.
  ['scripts/classe-risco*', 'régua de merge por classe de risco'],
  ['scripts/paralelo.mjs', 'globToRegex que a régua usa'],
].map(([glob, motivo]) => ({ glob, motivo, re: globToRegex(glob) }));

// Lista dura (dono, 10/11, D-2026-11-10-METODO-FABLE-5-2): PR vermelho que toca um destes caminhos NÃO entra com o
// PASS do revisor; segue no lote do dono. Vale só para PR que já é vermelho: não torna vermelho um PR verde.
export const LOTE_DURO = [
  ['server/prisma/**', 'schema ou migração'],
  ['server/src/jobs/**/migrat*', 'migração de dado por job'],
  ['server/src/middleware/auth.ts', 'autenticação'],
  ['server/src/routes/auth.ts', 'rota de autenticação'],
  ['server/src/lib/jwt*', 'emissão e verificação do token'],
  ['**/authController*', 'controller de autenticação'],
  ['**/authUtil*', 'utilitário de autenticação (authUtils, authUtilityController)'],
  ['my-app/lib/context/AuthContext*', 'sessão do usuário no FE'],
  ['my-app/lib/hoc/withAuth*', 'guarda de tela (withAuth)'],
  ['server/src/features/dynamicTables/services/DynamicTableService.ts', 'motor DynamicTable'],
  ['server/public/openapi.json', 'contrato público da API'],
  ['**/*dtoShapeSnapshot*', 'teste do snapshot de shape dos DTOs'],
  ['**/__dto-shapes__.json', 'snapshot de shape dos DTOs'],
  ['my-app/types/contracts/**', 'contrato gerado do FE'],
  // Pagamento: cobrança, conta de pagamento, provedor e relatório de liberação.
  ['**/*ollectionCharge*', 'cobrança (pagamento)'],
  ['**/*hargeReceivable*', 'cobrança do recebível'],
  ['**/*eceivableCharge*', 'cobrança do recebível'],
  ['**/*aymentAccount*', 'conta de pagamento'],
  ['**/*aymentProvider*', 'provedor de pagamento'],
  ['server/src/features/accounting/collection/**', 'provedor de cobrança'],
  ['**/*eleaseReport*', 'relatório de liberação do provedor'],
  ['**/*ebhook*', 'webhook'],
  // DF-e: emissão, transmissão, assinatura e credencial.
  ['server/src/features/accounting/dfe/**', 'emissão, transmissão e assinatura de DF-e'],
  ['**/*dfeXmlSign*', 'assinatura XMLDSig do DF-e'],
  ['**/*nfeSignature*', 'assinatura da NF-e'],
  ['server/src/lib/nfse*', 'NFS-e: DPS, evento, leitura e assinatura'],
  ['my-app/features/accounting/components/dfe/**', 'tela de emissão e assinatura de DF-e'],
  ['**/*feAssinador*', 'assinador local do DF-e'],
  ['**/assinador*', 'estado do assinador local'],
  ['**/*iscalCertificate*', 'custódia do certificado fiscal'],
  ['**/*iscalDocumentEmission*', 'emissão do documento fiscal'],
  ['**/*feSigner*', 'assinador do DF-e'],
  ['**/*feAssinatura*', 'resolução da assinatura do DF-e'],
  ['**/*ompanySigner*', 'signatário da empresa'],
  ['**/*scCredential*', 'credencial PSC'],
  ['**/*scProvider*', 'provedor PSC'],
  ['**/dfeEnvio*', 'envio do DF-e'],
  ['**/*fePoll*', 'polling do DF-e'],
  ['server/src/routes/dfe*', 'rota de DF-e'],
  ['**/*einf*', 'EFD-Reinf'],
  ['server/src/lib/reinf/**', 'XSD oficial da EFD-Reinf'],
  // Pasta de decisão do dono: fica no lote com qualquer extensão (o .md já ficaria, por ser vermelho de texto).
  ['docs/plano/gates/**', 'gate humano'],
  ['docs/plano/decisoes/**', 'cédula de decisão do dono'],
  ['docs/plano/trilhos/**', 'trilho travado'],
  ['docs/plano/rejeitadas/**', 'decisão rejeitada'],
  ['docs/adr/**', 'decisão de arquitetura'],
  // Baselines e o próprio aparato de gate.
  ['**/.dependency-cruiser*', 'baseline e regra do check:arch'],
  ['**/eslint*.config.*', 'regra de lint que é gate'],
  ['scripts/debt-ledger-check.mjs', 'ledger de dívida'],
  ['.github/**', 'CI e automação do repositório'],
  ['.claude/**', 'regra de agente, skill ou gate'],
  ['CLAUDE.md', 'regra de agente'],
  ['**/CLAUDE.md', 'regra de agente'],
  ['scripts/classe-risco*', 'régua de merge por classe de risco'],
  ['scripts/paralelo.mjs', 'globToRegex que a régua usa'],
].map(([glob, motivo]) => ({ glob, motivo, re: globToRegex(glob) }));

// "Bump x from 4.104.0 to 7.43.0" → major mudou. Grupo minor-patch do dependabot não traz versão.
export function bumpMajor(titulo) {
  const m = /from v?(\d+)\.[\w.-]* to v?(\d+)\./.exec(titulo);
  return m ? m[1] !== m[2] : false;
}

// revisor: o revisor-independente é obrigatório só no vermelho de CÓDIGO (D-2026-11-06-REVISAO-CONVERGENCIA).
// Arquivo vermelho em .md (cédula, ADR, gate, CLAUDE.md, agente, skill) vai ao lote do dono sem revisor.
const SO_TEXTO = /\.md$/i;

export function classificar({ arquivos, titulo = '', draft = false }) {
  const motivos = [];
  const motivosLote = [];
  let revisor = false;
  for (const f of arquivos) {
    const hit = VERMELHO.find((v) => v.re.test(f));
    if (hit) {
      motivos.push(`${f} — ${hit.motivo}`);
      if (SO_TEXTO.test(f)) motivosLote.push(`${f} — vermelho de texto (decisão do dono, sem revisor)`);
      else revisor = true;
    }
    const duro = LOTE_DURO.find((d) => d.re.test(f));
    if (duro) motivosLote.push(`${f} — lista dura: ${duro.motivo}`);
  }
  if (bumpMajor(titulo)) { motivos.push(`dependência major: ${titulo}`); motivosLote.push('dependência major'); revisor = true; }
  if (/n[ãa]o mergear/i.test(titulo)) { motivos.push('título pede para não mergear'); motivosLote.push('título pede para não mergear'); }
  if (draft) { motivos.push('PR em draft'); motivosLote.push('PR em draft'); }
  if (arquivos.length === 0) { motivos.push('sem lista de arquivos (em dúvida, vermelho)'); motivosLote.push('sem lista de arquivos'); revisor = true; }
  const vermelho = motivos.length > 0;
  // lote só existe no vermelho: a lista dura não muda a classe de um PR verde.
  const lote = vermelho && motivosLote.length > 0;
  return { classe: vermelho ? 'vermelho' : 'verde', motivos, revisor, lote, motivosLote: lote ? motivosLote : [] };
}

function lerPr(n) {
  const out = execFileSync('gh', ['pr', 'view', String(n), '--json', 'files,title,isDraft'], { encoding: 'utf8' });
  const pr = JSON.parse(out);
  return { arquivos: pr.files.map((f) => f.path), titulo: pr.title, draft: pr.isDraft };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const [cmd, ...resto] = process.argv.slice(2);
  const json = resto.includes('--json');
  const args = resto.filter((a) => a !== '--json');
  let entrada;
  if (cmd === 'pr' && args[0]) entrada = lerPr(args[0]);
  else if (cmd === 'arquivos') entrada = { arquivos: args };
  else {
    console.error('uso: classe-risco.mjs pr <n> [--json] | arquivos <caminho...>');
    process.exit(2);
  }
  const r = classificar(entrada);
  if (json) console.log(JSON.stringify(r));
  else {
    const rev = r.classe === 'vermelho' ? ` · revisor: ${r.revisor ? 'obrigatório' : 'não (só texto)'}` : '';
    const lote = r.classe === 'vermelho' ? ` · lote: ${r.lote ? 'sim' : 'não (entra com revisor PASS)'}` : '';
    console.log([r.classe + rev + lote, ...r.motivos.map((m) => `  - ${m}`),
      ...r.motivosLote.map((m) => `  - lote: ${m}`)].join('\n'));
  }
}
