/**
 * ETIQUETA DE DIMENSÃO SOBREVIVE À LEITURA QUE ALIMENTA O EDITOR — SQLite real, sem mock.
 *
 * Barreira do defeito "editar um rascunho apaga as etiquetas de dimensão".
 *
 * A CADEIA DO BUG, e por que a barreira mora AQUI:
 *   `EntryApprovalService.updateDraft` reescreve TODAS as pernas (`deleteByEntryId` + `writeLegs`)
 *   e `PostingDimension.posting` é `onDelete: Cascade` — então a etiqueta que a tela não devolver
 *   é destruída. A causa raiz não era a escrita: era a LEITURA. `findManyByUnit` incluía só
 *   `account`, a etiqueta nunca chegava ao frontend, e o editor não tinha o que reenviar.
 *
 *   O teste de frontend (`EntryApprovalsPanel.test.tsx`, "an edit ROUND-TRIPS the legs dimension
 *   tags") cobre os elos `toDraftValue → toLines → payload` — e é CEGO a este: ele mocka o
 *   serviço, então apagar o `include` do repositório o deixa verde. Este arquivo fecha o elo que
 *   falta, pelo caminho real (factory → serviço → repositório → Prisma).
 *
 * SERVIÇO VEM DO FACTORY, não do `new` — o defeito é sobre o caminho como ele roda, não sobre a
 * classe (Contrato §2/§3). Mesma disciplina do `PostingServiceLedgerWrite.integration.test.ts`.
 *
 * CONTROLE: o caso positivo (perna etiquetada devolve a etiqueta) anda junto de um NEGATIVO (perna
 * sem etiqueta devolve lista vazia, não `undefined` nem a etiqueta da irmã). Sem esse par, um
 * `include` que carimbasse todas as pernas com a mesma tag passaria.
 */
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { getFactory } from '@/lib/factory';
import { resolveAccountingScope } from '@/features/accounting/scope/AccountingScope';
import type { AccountingScope } from '@/features/accounting/scope/AccountingScope';

const UNIT = 'unit-dim-roundtrip';
const DONO = 'u-dim-roundtrip';
const DATA = '2026-06-15';

const scope: AccountingScope = resolveAccountingScope({ userId: DONO }, UNIT);
const approval = () => getFactory().getEntryApprovalService();
const posting = () => getFactory().getPostingService();

/** Cria o dono, semeia o plano de contas canônico e um eixo com um valor folha ATIVO. */
async function semear(): Promise<void> {
  await prisma.user.create({
    data: {
      id: DONO,
      name: 'Dono Dim',
      username: 'donodim',
      email: 'donodim@test.local',
      password: 'x',
      role: 'USER',
    },
  });
  // `resolveLeafAccount` exige o plano semeado; qualquer listAccounts o semeia.
  await posting().listAccounts(scope);
  await prisma.dimensionDefinition.create({
    data: { id: 'def-cc', userId: DONO, unitId: UNIT, code: 'COST_CENTER', name: 'Centro de Custo', status: 'ACTIVE' },
  });
  await prisma.dimensionValue.create({
    data: { id: 'val-loja-a', userId: DONO, unitId: UNIT, definitionId: 'def-cc', code: 'LOJA_A', name: 'Loja A', status: 'ACTIVE' },
  });
}

describe('etiqueta de dimensão no read que alimenta o editor (SQLite real)', () => {
  // Semeia UMA vez e não usa `resetDb()`: aquele helper apaga `user` sem apagar as tabelas de
  // contabilidade, e a FK reprova (medido — foi a primeira execução deste arquivo). Mesma
  // disciplina do `PostingServiceLedgerWrite.integration.test.ts`, que também não o usa.
  beforeAll(async () => {
    pushTestSchema();
    await semear();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('listEntries devolve a etiqueta da perna etiquetada, e NÃO inventa etiqueta na perna limpa', async () => {
    // Rascunho com DUAS pernas e só UMA etiquetada — o caso misto é o que discrimina.
    const draft = await approval().createDraft(scope, {
      unitId: UNIT,
      date: DATA,
      description: 'Aluguel com centro de custo',
      lines: [
        { accountCode: '4.1', debitCents: 150000, creditCents: 0, dimensions: ['val-loja-a'] },
        { accountCode: '1.1.1', debitCents: 0, creditCents: 150000 },
      ],
    });

    // Pré-condição: a etiqueta foi mesmo PERSISTIDA. Se isto falhar, o defeito é de escrita e o
    // resto do teste estaria medindo outra coisa.
    const persistidas = await prisma.postingDimension.count({ where: { userId: DONO, unitId: UNIT } });
    expect(persistidas).toBe(1);

    // O read que a aba Aprovações usa para montar a lista de rascunhos.
    const { entries } = await posting().listEntries(scope, { page: 1, limit: 50 });
    const lido = entries.find((e) => e.id === draft.id);
    expect(lido).toBeDefined();

    const pernaEtiquetada = lido!.postings.find((p) => p.debitCents === 150000n);
    const pernaLimpa = lido!.postings.find((p) => p.creditCents === 150000n);

    // POSITIVO — o par (eixo, valor) chega ao consumidor.
    expect(pernaEtiquetada!.dimensions).toEqual([{ definitionId: 'def-cc', valueId: 'val-loja-a' }]);
    // NEGATIVO/CONTROLE — a perna sem etiqueta vem vazia, não herda a da irmã.
    expect(pernaLimpa!.dimensions).toEqual([]);
  }, 60000);
});
