/**
 * X10a EMENDA-4 AL-15 — ressalva do revisor (24/11/2026, lacuna 9228): `PENDING_SIGNATURE` também é a NFS-e esperando a
 * reautorização do PSC (E-13, F-PSC-6 a), que NÃO depende do assinador local. O alerta (d) `ASSINADOR_ONLINE_COM_PENDENTE_PRESA`
 * tratava essa nota como "presa pelo assinador" e culpava um assinador que está no ar. Só NF-e/NFC-e dependem dele
 * (`selectDfeEmissor` põe o `AssinadorLocal` na SEFAZ; a NFS-e sai pelo PSC/ADN). Repositório falso: a regra é do serviço
 * (o repositório devolve o `kind` e não decide nada); o SQLite real está em `DfeSignerHealth.integration.test.ts`.
 */
import { DfeSignerHealthService } from '../DfeSignerHealthService';
import type { DfeSignerHealthDevice, DfeSignerHealthEmEspera, IDfeSignerHealthRepository } from '../../repositories/IDfeSignerHealthRepository';

const NOW = new Date('2026-11-24T12:00:00.000Z');
const minAtras = (m: number) => new Date(NOW.getTime() - m * 60_000);

type Linha = { unitId: string; status: 'PENDING_SIGNATURE' | 'CONTINGENCY'; kind: 'NFE' | 'NFCE' | 'NFSE'; quantidade: number; maisAntigaDesde: Date };
const linha = (kind: Linha['kind'], minutos: number, over: Partial<Linha> = {}): Linha => ({
  unitId: 'u1', status: 'PENDING_SIGNATURE', kind, quantidade: 1, maisAntigaDesde: minAtras(minutos), ...over,
});

function servico(linhas: Linha[], lastSeenMinAtras: number | null): DfeSignerHealthService {
  const dispositivo: DfeSignerHealthDevice = { id: 'dev-1', certNotAfter: '2030-01-01', lastSeenAt: lastSeenMinAtras === null ? null : minAtras(lastSeenMinAtras), unitIds: ['u1'] };
  const repo: IDfeSignerHealthRepository = {
    listDevicesVivos: async () => [dispositivo],
    resumoEmEspera: async () => linhas as unknown as DfeSignerHealthEmEspera[],
  };
  return new DfeSignerHealthService(repo);
}
const eventos = async (s: DfeSignerHealthService) => (await s.verificar(NOW)).alertas.map((a) => a.evento);

describe('DfeSignerHealthService — só nota que depende do assinador local (NF-e/NFC-e) conta (lacuna 9228)', () => {
  it('(d) assinador ONLINE + NFS-e em PENDING_SIGNATURE há 60 min (sessão do PSC vencida) ⇒ NÃO alerta: a causa não é o assinador', async () => {
    expect(await eventos(servico([linha('NFSE', 60)], 1))).toEqual([]);
  });

  it('(a) assinador SEM POLL + NFS-e em PENDING_SIGNATURE ⇒ NÃO alerta (a nota não espera o assinador local)', async () => {
    expect(await eventos(servico([linha('NFSE', 60)], 40))).toEqual([]);
  });

  it('CONTROLE POSITIVO (d): assinador online + NF-e em PENDING_SIGNATURE há 60 min ⇒ alerta; NFC-e também', async () => {
    expect(await eventos(servico([linha('NFE', 60)], 1))).toEqual(['ASSINADOR_ONLINE_COM_PENDENTE_PRESA']);
    expect(await eventos(servico([linha('NFCE', 60)], 1))).toEqual(['ASSINADOR_ONLINE_COM_PENDENTE_PRESA']);
  });

  it('CONTROLE POSITIVO (a): assinador sem poll + NF-e em PENDING_SIGNATURE há 30 min ⇒ alerta (a)', async () => {
    expect(await eventos(servico([linha('NFE', 30)], 20))).toEqual(['ASSINADOR_SEM_POLL_COM_PENDENTE']);
  });

  it('mesma unidade com NFS-e antiga e NF-e: a contagem e a idade são só da NF-e (a NFS-e de 90 min não entra)', async () => {
    const [a] = (await servico([linha('NFSE', 90, { quantidade: 5 }), linha('NFE', 20, { quantidade: 2 })], 1).verificar(NOW)).alertas;
    expect(a).toEqual({ evento: 'ASSINADOR_ONLINE_COM_PENDENTE_PRESA', dispositivoId: 'dev-1', unitIds: ['u1'], detalhe: { notasEmEspera: 2, minutosPresa: 20 } });
  });

  it('NF-e e NFC-e na mesma unidade somam as notas e a unidade aparece uma vez só', async () => {
    const [a] = (await servico([linha('NFE', 30, { quantidade: 1 }), linha('NFCE', 45, { quantidade: 3 })], 1).verificar(NOW)).alertas;
    expect(a).toEqual({ evento: 'ASSINADOR_ONLINE_COM_PENDENTE_PRESA', dispositivoId: 'dev-1', unitIds: ['u1'], detalhe: { notasEmEspera: 4, minutosPresa: 45 } });
  });

  it('(c) NFC-e em CONTINGENCY com o assinador fora continua alertando (o filtro não a tira)', async () => {
    const l = linha('NFCE', 2, { status: 'CONTINGENCY' });
    expect(await eventos(servico([l], 40))).toEqual(['CONTINGENCIA_COM_ASSINADOR_FORA']);
  });
});
