// node --test scripts/classe-risco.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classificar, bumpMajor } from './classe-risco.mjs';

test('FE não fiscal, doc de nó e teste são verdes', () => {
  const r = classificar({ arquivos: ['my-app/features/crm/Kanban.tsx', 'docs/plano/nos/W3.md', 'server/src/features/crm/__tests__/x.test.ts'] });
  assert.equal(r.classe, 'verde');
  assert.deepEqual(r.motivos, []);
});

test('um arquivo contábil basta para o PR inteiro ser vermelho', () => {
  const r = classificar({ arquivos: ['my-app/features/crm/Kanban.tsx', 'server/src/features/accounting/services/ReinfService.ts'] });
  assert.equal(r.classe, 'vermelho');
  assert.match(r.motivos[0], /contábil/);
});

test('schema, auth, CLAUDE.md aninhado, cédula e gate são vermelhos', () => {
  for (const f of ['server/prisma/schema.prisma', 'server/src/middleware/auth.ts', 'my-app/CLAUDE.md',
    'docs/plano/decisoes/D-x.md', 'docs/plano/gates/H1.md', '.github/workflows/ci.yml']) {
    assert.equal(classificar({ arquivos: [f] }).classe, 'vermelho', f);
  }
});

test('fiscal fora de features/accounting é vermelho: os arquivos do #1017, #908 e #1012', () => {
  for (const f of ['server/src/controllers/spedController.ts',
    'server/src/controllers/__tests__/accountingContactController.integration.test.ts',
    'server/src/lib/mit.ts', 'server/src/lib/__tests__/mit.test.ts', 'server/src/lib/sped.ts',
    'server/src/lib/reinf/xsd/README.md', 'server/src/features/sales/models/fiscalGuard.ts',
    'server/src/jobs/AccountingSyncScheduler.ts', 'my-app/lib/services/accounting.service.ts',
    'scripts/classe-risco.mjs', 'scripts/paralelo.mjs']) {
    assert.equal(classificar({ arquivos: [f] }).classe, 'vermelho', f);
  }
});

test('vizinho não fiscal continua verde: controller, rota, lib e serviço FE de CRM', () => {
  const r = classificar({ arquivos: ['server/src/controllers/crmController.ts', 'server/src/routes/crm.ts',
    'server/src/lib/logger.ts', 'my-app/lib/services/crm.service.ts', 'server/src/routes/docs/accounting.sped.paths.ts'] });
  assert.equal(r.classe, 'verde', r.motivos.join('; '));
});

test('dependência: major é vermelho, minor/patch e grupo são verdes', () => {
  assert.ok(bumpMajor('chore(deps): Bump openai from 4.104.0 to 7.43.0 in /server'));
  assert.ok(!bumpMajor('chore(deps): Bump zod from 4.1.0 to 4.3.2 in /server'));
  assert.ok(!bumpMajor('chore(deps): Bump the server-minor-patch group in /server with 24 updates'));
  assert.equal(classificar({ arquivos: ['server/package.json'], titulo: 'Bump uuid from 11.1.0 to 14.0.3' }).classe, 'vermelho');
});

test('draft, "não mergear" no título e lista vazia são vermelhos', () => {
  assert.equal(classificar({ arquivos: ['my-app/a.tsx'], draft: true }).classe, 'vermelho');
  assert.equal(classificar({ arquivos: ['my-app/a.tsx'], titulo: 'fix(kanban): x — não mergear sem OK' }).classe, 'vermelho');
  assert.equal(classificar({ arquivos: [] }).classe, 'vermelho');
});

// D-2026-11-06-REVISAO-CONVERGENCIA: o revisor-independente é obrigatório só no vermelho de código.
test('vermelho só de texto (.md: cédula, ADR, CLAUDE.md, agente, skill) não exige revisor', () => {
  const r = classificar({ arquivos: ['docs/plano/decisoes/D-x.md', 'docs/adr/ADR-x.md', 'CLAUDE.md',
    '.claude/agents/revisor-independente.md', '.claude/skills/x/SKILL.md', 'docs/plano/nos/W3.md'] });
  assert.equal(r.classe, 'vermelho');
  assert.equal(r.revisor, false);
});

test('um arquivo vermelho de código basta para exigir revisor', () => {
  for (const f of ['server/src/features/accounting/services/ReinfService.ts', 'server/prisma/schema.prisma',
    '.github/workflows/ci.yml', '.claude/settings.json', 'scripts/classe-risco.mjs']) {
    const r = classificar({ arquivos: ['docs/plano/decisoes/D-x.md', f] });
    assert.equal(r.revisor, true, f);
  }
});

test('dependência major e lista vazia exigem revisor; verde e draft de texto não', () => {
  assert.equal(classificar({ arquivos: ['package.json'], titulo: 'Bump x from 4.1.0 to 7.0.0' }).revisor, true);
  assert.equal(classificar({ arquivos: [] }).revisor, true);
  assert.equal(classificar({ arquivos: ['my-app/features/crm/Kanban.tsx'] }).revisor, false);
  assert.equal(classificar({ arquivos: ['docs/plano/decisoes/D-x.md'], draft: true }).revisor, false);
});

// D-2026-11-10-METODO-FABLE-5-2: vermelho de código fora da lista dura entra com o PASS do revisor, sem o lote.
test('vermelho de código fora da lista dura não vai ao lote, mas exige revisor', () => {
  const r = classificar({ arquivos: ['server/src/features/accounting/services/AgingReportService.ts', 'docs/plano/nos/W3.md'] });
  assert.equal(r.classe, 'vermelho');
  assert.equal(r.revisor, true);
  assert.equal(r.lote, false);
  assert.deepEqual(r.motivosLote, []);
});

test('PR vermelho que toca a lista dura vai ao lote, mesmo quando o arquivo duro não é vermelho sozinho', () => {
  const base = 'server/src/features/accounting/services/AgingReportService.ts';
  for (const f of ['server/prisma/migrations/20261110_x/migration.sql', 'server/src/middleware/auth.ts', 'server/src/routes/auth.ts',
    'my-app/lib/hoc/withAuth.tsx', 'server/public/openapi.json', 'server/src/__tests__/dtoShapeSnapshot.test.ts',
    'my-app/types/contracts/accounting/XDto.gen.ts', 'server/src/features/dynamicTables/services/DynamicTableService.ts',
    'server/src/features/accounting/services/CollectionChargeService.ts', 'my-app/lib/services/paymentAccounts.service.ts',
    'server/src/features/accounting/collection/MercadoPagoCollectionProvider.ts', 'server/src/lib/mpReleaseReport.ts',
    'server/src/lib/alertWebhook.ts', 'server/src/features/accounting/dfe/sefaz/SefazTransporte.ts', 'server/src/lib/dfeXmlSign.ts',
    'server/src/features/accounting/services/DfeSignerService.ts', 'server/src/features/accounting/services/PscCredentialService.ts',
    'server/src/jobs/DfePollScheduler.ts', 'server/src/features/accounting/services/ReinfService.ts',
    'server/.dependency-cruiser-known-violations.json', 'server/eslint.config.mjs', '.github/workflows/ci.yml',
    '.claude/settings.json', 'scripts/classe-risco.mjs']) {
    const r = classificar({ arquivos: [base, f] });
    assert.equal(r.lote, true, f);
    assert.match(r.motivosLote.join('\n'), /lista dura/, f);
  }
});

test('vermelho de texto, major, draft, "não mergear" e lista vazia ficam no lote', () => {
  assert.equal(classificar({ arquivos: ['docs/plano/decisoes/D-x.md'] }).lote, true);
  assert.equal(classificar({ arquivos: ['server/src/features/accounting/services/AgingReportService.ts', 'docs/adr/ADR-x.md'] }).lote, true);
  assert.equal(classificar({ arquivos: ['package.json'], titulo: 'Bump x from 4.1.0 to 7.0.0' }).lote, true);
  assert.equal(classificar({ arquivos: ['my-app/features/crm/Kanban.tsx'], draft: true }).lote, true);
  assert.equal(classificar({ arquivos: ['my-app/features/crm/Kanban.tsx'], titulo: 'wip (não mergear)' }).lote, true);
  assert.equal(classificar({ arquivos: [] }).lote, true);
});

test('a lista dura não muda a classe de um PR verde', () => {
  const r = classificar({ arquivos: ['server/public/openapi.json', 'my-app/lib/hoc/withAuth.tsx', 'server/src/lib/alertWebhook.ts'] });
  assert.equal(r.classe, 'verde');
  assert.equal(r.lote, false);
  assert.deepEqual(r.motivosLote, []);
});

// Achados da revisão de 11/11: entradas da lista dura que nenhum teste tocava e caminhos que escapavam dela.
test('lista dura: snapshot de DTO, certificado e emissão fiscal, NFS-e, auth e as entradas restantes', () => {
  const base = 'server/src/features/accounting/services/AgingReportService.ts';
  for (const f of ['server/src/features/accounting/dtos/__tests__/__dto-shapes__.json',
    'server/src/features/accounting/services/FiscalCertificateService.ts',
    'server/src/features/accounting/services/FiscalDocumentEmissionService.ts', 'server/src/lib/nfseSignature.ts',
    'server/src/lib/nfse.ts', 'server/src/lib/jwt.ts', 'server/src/controllers/authController.ts',
    'server/src/controllers/authUtilityController.ts', 'server/src/lib/authUtils.ts', 'my-app/CLAUDE.md',
    'my-app/lib/context/AuthContext.tsx', 'server/src/routes/dfe.ts', 'server/src/routes/dfeAssinador.ts',
    'server/src/features/accounting/services/dfeEnvio.ts', 'server/src/features/accounting/services/PscProviderService.ts',
    'server/src/features/accounting/services/CompanySignerService.ts',
    'server/src/features/accounting/services/DfeAssinaturaResolver.ts', 'server/src/lib/reinf/x.xsd',
    'scripts/debt-ledger-check.mjs', 'scripts/paralelo.mjs', 'my-app/eslint.gate.config.mjs',
    'server/src/lib/nfeSignature.ts', 'my-app/features/accounting/components/dfe/EmitNfseButton.tsx',
    'my-app/lib/services/dfeAssinador.service.ts', 'my-app/features/accounting/lib/assinadorEstado.ts',
    'my-app/features/accounting/components/ChargeReceivableModal.tsx',
    'my-app/features/accounting/components/ReceivableChargesDrawer.tsx', 'server/src/jobs/migratePlano4NiveisCli.ts']) {
    const r = classificar({ arquivos: [base, f] });
    assert.equal(r.lote, true, f);
    assert.match(r.motivosLote.join('\n'), /lista dura/, f);
  }
});

test('pasta de decisão do dono fica no lote com qualquer extensão', () => {
  for (const f of ['docs/plano/gates/X.json', 'docs/plano/decisoes/anexo.png', 'docs/plano/trilhos/t.yaml',
    'docs/plano/rejeitadas/r.txt', 'docs/adr/x.json']) {
    const r = classificar({ arquivos: [f] });
    assert.equal(r.classe, 'vermelho', f);
    assert.equal(r.lote, true, f);
  }
});

test('a linha impressa traz lote: sim ou lote: não, que é o que a maestro lê', async () => {
  const { execFileSync } = await import('node:child_process');
  const run = (...a) => execFileSync(process.execPath, ['scripts/classe-risco.mjs', 'arquivos', ...a], { encoding: 'utf8' });
  const cod = 'server/src/features/accounting/services/AgingReportService.ts';
  assert.match(run(cod).split('\n')[0], /^vermelho · revisor: obrigatório · lote: não \(entra com revisor PASS\)$/);
  assert.match(run(cod, 'server/prisma/schema.prisma').split('\n')[0], /^vermelho · revisor: obrigatório · lote: sim$/);
  assert.match(run('docs/plano/decisoes/D-x.md').split('\n')[0], /^vermelho · revisor: não \(só texto\) · lote: sim$/);
  assert.equal(run('my-app/features/crm/Kanban.tsx').trim(), 'verde');
});
