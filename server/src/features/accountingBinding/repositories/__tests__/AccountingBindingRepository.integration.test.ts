/**
 * CONTRATO do AccountingBindingRepository — integração contra SQLite REAL (mesmo padrão de
 * `ReferentialMappingRepository.integration.test.ts`): sem mock de prisma, porque é exatamente o
 * tx real + o CAS real (`updateMany` condicionado em `status: 'Active'`) que a suíte precisa
 * provar — um repo FALSO (mock) afirmaria só o que o mock foi programado para devolver, nunca o
 * comportamento do `@@unique`/`updateMany` de verdade (lição `repositorios-de-contabilidade-nao-sao-exercitados`).
 */
import prisma from '@/lib/prisma';
import { pushTestSchema } from '@test/helpers/db';
import { AccountingBindingRepository } from '@/features/accountingBinding/repositories/AccountingBindingRepository';
import { resolveBindingScope } from '@/features/accountingBinding/repositories/IAccountingBindingRepository';
import type { BindingScope } from '@/features/accountingBinding/repositories/IAccountingBindingRepository';

const UNIT = 'unit-binding';
const UNIT_OUTRA = 'unit-binding-outra';
const DONO_A = 'u-binding-a';
const DONO_B = 'u-binding-b';
const SETOR = 'beautySalon';

const escopo = (userId: string, unitId: string = UNIT): BindingScope =>
  resolveBindingScope({ userId }, unitId);

const repo = new AccountingBindingRepository();

const criar = (
  scope: BindingScope,
  overrides: Partial<{ sectorKey: string; bindingVersion: number; status: 'Draft' | 'Active' | 'Superseded' }> = {},
) =>
  repo.create(scope, {
    sectorKey: overrides.sectorKey ?? SETOR,
    bindingVersion: overrides.bindingVersion ?? 1,
    compiledAt: new Date(),
    compiledFromHash: 'sha256:teste',
    payload: JSON.stringify({ ok: true }),
    status: overrides.status ?? 'Active',
    createdById: scope.actorUserId,
  });

describe('AccountingBindingRepository — contrato em SQLite real', () => {
  beforeAll(async () => {
    pushTestSchema();
    for (const id of [DONO_A, DONO_B]) {
      await prisma.user.create({
        data: { id, name: id, username: id, email: `${id}@test.local`, password: 'x', role: 'USER' },
      });
    }
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ------------------------------------------------------------------ controle do harness
  it('CONTROLE: create grava e findById lê dentro do próprio escopo', async () => {
    const criado = await criar(escopo(DONO_A));
    const lido = await repo.findById(escopo(DONO_A), criado.id);
    expect(lido).not.toBeNull();
    expect(lido!.id).toBe(criado.id);
    expect(lido!.sectorKey).toBe(SETOR);
    expect(lido!.status).toBe('Active');
  });

  // ------------------------------------------------------------------ versão monotônica
  describe('findMaxVersion', () => {
    it('devolve 0 quando nenhuma versão existe ainda para o setor', async () => {
      expect(await repo.findMaxVersion(escopo(DONO_A), 'setor-vazio')).toBe(0);
    });

    it('devolve a maior versão já criada, ignorando outro dono/unidade — com controle de não-vacuidade', async () => {
      const setor = 'setor-versoes';
      await criar(escopo(DONO_A), { sectorKey: setor, bindingVersion: 1 });
      await criar(escopo(DONO_A), { sectorKey: setor, bindingVersion: 2, status: 'Draft' });
      // Vizinho com versão MAIOR, em outro escopo — não pode vazar para o cálculo do dono A.
      await criar(escopo(DONO_B), { sectorKey: setor, bindingVersion: 9 });

      expect(await repo.findMaxVersion(escopo(DONO_A), setor)).toBe(2);
      // Controle: o vizinho realmente tem uma versão maior na base — se o filtro de escopo
      // estivesse quebrado (vazando), o resultado acima seria 9, não 2.
      expect(await repo.findMaxVersion(escopo(DONO_B), setor)).toBe(9);
    });

    it('INCLUI versão soft-deleted no cálculo — @@unique não exclui deletedAt (P2002 se reemitida)', async () => {
      const setor = 'setor-softdelete-versao';
      const v1 = await criar(escopo(DONO_A), { sectorKey: setor, bindingVersion: 1 });
      await prisma.accountingBinding.update({ where: { id: v1.id }, data: { deletedAt: new Date() } });

      // Se o cálculo ignorasse soft-deleted, devolveria 0 aqui — a versão 1 "sumiria" do
      // histórico mas continuaria ocupando a chave @@unique, e um create(v=1) colidiria em P2002.
      expect(await repo.findMaxVersion(escopo(DONO_A), setor)).toBe(1);
    });
  });

  // ------------------------------------------------------------------ Active vigente
  describe('findActive', () => {
    it('null quando não existe nenhuma Active — com controle', async () => {
      const setor = 'setor-sem-active';
      await criar(escopo(DONO_A), { sectorKey: setor, bindingVersion: 1, status: 'Draft' });
      expect(await repo.findActive(escopo(DONO_A), setor)).toBeNull();

      // Controle: a MESMA linha, virando Active, aparece.
      await criar(escopo(DONO_A), { sectorKey: setor, bindingVersion: 2, status: 'Active' });
      expect((await repo.findActive(escopo(DONO_A), setor))!.bindingVersion).toBe(2);
    });

    it('ignora Active soft-deleted — uma linha apagada nunca é "a ativa"', async () => {
      const setor = 'setor-active-softdeleted';
      const ativo = await criar(escopo(DONO_A), { sectorKey: setor, bindingVersion: 1, status: 'Active' });
      await prisma.accountingBinding.update({ where: { id: ativo.id }, data: { deletedAt: new Date() } });

      expect(await repo.findActive(escopo(DONO_A), setor)).toBeNull();
    });

    it('inquilino: não alcança a Active de outro dono nem de outra unidade', async () => {
      const setor = 'setor-inquilino-active';
      await criar(escopo(DONO_A), { sectorKey: setor, bindingVersion: 1, status: 'Active' });

      expect(await repo.findActive(escopo(DONO_B), setor)).toBeNull();
      expect(await repo.findActive(escopo(DONO_A, UNIT_OUTRA), setor)).toBeNull();
      // Controle: o dono certo enxerga.
      expect(await repo.findActive(escopo(DONO_A), setor)).not.toBeNull();
    });
  });

  // ------------------------------------------------------------------ CAS de supersessão
  describe('supersedeIfActive — o CAS que sustenta a auto-ativação (F-BP-2b)', () => {
    it('rebaixa uma linha Active para Superseded e devolve 1 — com controle de estado', async () => {
      const ativo = await criar(escopo(DONO_A), { sectorKey: 'setor-cas', bindingVersion: 1, status: 'Active' });

      const count = await repo.supersedeIfActive(escopo(DONO_A), ativo.id);
      expect(count).toBe(1);

      const depois = await repo.findById(escopo(DONO_A), ativo.id);
      expect(depois!.status).toBe('Superseded');
    });

    it('segunda chamada sobre a MESMA linha (já Superseded) devolve 0 — não reprova, converge sem duplicar efeito', async () => {
      const ativo = await criar(escopo(DONO_A), { sectorKey: 'setor-cas-2x', bindingVersion: 1, status: 'Active' });

      const primeira = await repo.supersedeIfActive(escopo(DONO_A), ativo.id);
      const segunda = await repo.supersedeIfActive(escopo(DONO_A), ativo.id);

      // Asserção na SEGUNDA chamada (lição `comentario-de-teste-afirma-o-que-nao-assere`): é ela
      // que prova o CAS — a primeira sozinha não distingue "CAS real" de "update incondicional".
      expect(primeira).toBe(1);
      expect(segunda).toBe(0);
      expect((await repo.findById(escopo(DONO_A), ativo.id))!.status).toBe('Superseded');
    });

    it('não rebaixa a linha de outro dono (where inclui o escopo)', async () => {
      const ativoDeA = await criar(escopo(DONO_A), { sectorKey: 'setor-cas-inquilino', bindingVersion: 1, status: 'Active' });

      const count = await repo.supersedeIfActive(escopo(DONO_B), ativoDeA.id);
      expect(count).toBe(0);
      expect((await repo.findById(escopo(DONO_A), ativoDeA.id))!.status).toBe('Active');
    });
  });

  // ------------------------------------------------------------------ listagem
  describe('findMany', () => {
    it('filtra por sectorKey e status, e ordena bindingVersion desc, dentro do escopo', async () => {
      const setor = 'setor-lista';
      await criar(escopo(DONO_A), { sectorKey: setor, bindingVersion: 1, status: 'Superseded' });
      await criar(escopo(DONO_A), { sectorKey: setor, bindingVersion: 2, status: 'Active' });
      await criar(escopo(DONO_A), { sectorKey: 'outro-setor', bindingVersion: 1, status: 'Active' });
      await criar(escopo(DONO_B), { sectorKey: setor, bindingVersion: 5, status: 'Active' });

      const todas = await repo.findMany(escopo(DONO_A), { sectorKey: setor });
      expect(todas.map((b) => b.bindingVersion)).toEqual([2, 1]); // desc, sem a linha do outro setor/dono

      const soActive = await repo.findMany(escopo(DONO_A), { sectorKey: setor, status: 'Active' });
      expect(soActive).toHaveLength(1);
      expect(soActive[0].bindingVersion).toBe(2);
    });

    it('não lista linha soft-deleted', async () => {
      const setor = 'setor-lista-softdelete';
      const linha = await criar(escopo(DONO_A), { sectorKey: setor, bindingVersion: 1 });
      await prisma.accountingBinding.update({ where: { id: linha.id }, data: { deletedAt: new Date() } });

      expect(await repo.findMany(escopo(DONO_A), { sectorKey: setor })).toHaveLength(0);
    });
  });

  // ------------------------------------------------------------------ tx
  it('tx: rollback de runTransaction não deixa linha órfã — com controle de commit', async () => {
    const setor = 'setor-tx-rollback';
    const antes = await prisma.accountingBinding.count({ where: { userId: DONO_A, unitId: UNIT, sectorKey: setor } });

    await expect(
      repo.runTransaction(async (tx) => {
        await repo.create(
          escopo(DONO_A),
          {
            sectorKey: setor,
            bindingVersion: 1,
            compiledAt: new Date(),
            compiledFromHash: 'sha256:vai-abortar',
            payload: '{}',
            status: 'Active',
            createdById: DONO_A,
          },
          tx,
        );
        throw new Error('aborta a tx DEPOIS da escrita');
      }),
    ).rejects.toThrow('aborta a tx DEPOIS da escrita');

    expect(
      await prisma.accountingBinding.count({ where: { userId: DONO_A, unitId: UNIT, sectorKey: setor } }),
    ).toBe(antes);

    // Controle: a MESMA escrita, comitando, persiste.
    const comitado = await repo.runTransaction((tx) =>
      repo.create(
        escopo(DONO_A),
        {
          sectorKey: setor,
          bindingVersion: 1,
          compiledAt: new Date(),
          compiledFromHash: 'sha256:vai-comitar',
          payload: '{}',
          status: 'Active',
          createdById: DONO_A,
        },
        tx,
      ),
    );
    expect(await prisma.accountingBinding.findUnique({ where: { id: comitado.id } })).not.toBeNull();
  });

  it('tx: leitura com o handle da tx enxerga a escrita in-tx (findMaxVersion/findActive)', async () => {
    const setor = 'setor-tx-leitura';

    const { maxNaTx, activeNaTx } = await repo.runTransaction(async (tx) => {
      await repo.create(
        escopo(DONO_A),
        {
          sectorKey: setor,
          bindingVersion: 1,
          compiledAt: new Date(),
          compiledFromHash: 'sha256:in-tx',
          payload: '{}',
          status: 'Active',
          createdById: DONO_A,
        },
        tx,
      );
      return {
        maxNaTx: await repo.findMaxVersion(escopo(DONO_A), setor, tx),
        activeNaTx: await repo.findActive(escopo(DONO_A), setor, tx),
      };
    });

    expect(maxNaTx).toBe(1);
    expect(activeNaTx!.bindingVersion).toBe(1);
  });
});
