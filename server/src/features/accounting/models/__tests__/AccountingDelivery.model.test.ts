/**
 * `buildDeliveryManifest` — manifesto N-ário (C6b PR-3, Passo 4, F-C6b-1 a). Função PURA: sem
 * banco, sem policy — o que este arquivo prova é a FORMA do manifesto com núcleo só e com núcleo
 * + extras, e que o `core` dá acesso direto ao par ECD/ECF sem depender de `files[0]`/`files[1]`
 * (a classe de bug que este passo fecha — `DELIVERY_FILE_KINDS`/`DeliveryFileKind` foram
 * removidos do model).
 */
import { buildDeliveryManifest, DELIVERABLE_EXPORT_KINDS } from '../AccountingDelivery.model';
import { resolveAccountingScope } from '../../scope/AccountingScope';

const scope = resolveAccountingScope({ userId: 'dono-a' }, 'unit-1');
const period = { start: new Date('2026-01-01T00:00:00.000Z'), end: new Date('2026-12-31T00:00:00.000Z') };
const generatedAt = new Date('2026-12-31T12:00:00.000Z');

const core = {
  ecd: { jobId: 'job-ecd', kind: 'EXPORT_SPED_ECD' as const, sha256: 'a'.repeat(64) },
  ecf: { jobId: 'job-ecf', kind: 'EXPORT_SPED_ECF' as const, sha256: 'b'.repeat(64) },
};

describe('buildDeliveryManifest', () => {
  it('com núcleo só (2 itens): files == [core.ecd, core.ecf], core dá acesso direto', () => {
    const manifest = buildDeliveryManifest({ scope, period, contactId: 'contact-1', core, extras: [], generatedAt });

    expect(manifest.files).toHaveLength(2);
    expect(manifest.files).toEqual([
      { kind: 'EXPORT_SPED_ECD', jobId: 'job-ecd', sha256: core.ecd.sha256 },
      { kind: 'EXPORT_SPED_ECF', jobId: 'job-ecf', sha256: core.ecf.sha256 },
    ]);
    expect(manifest.core.ecd).toEqual(manifest.files[0]);
    expect(manifest.core.ecf).toEqual(manifest.files[1]);
    expect(manifest.period).toEqual({ start: '2026-01-01', end: '2026-12-31' });
    expect(manifest.scope).toEqual({ unitId: 'unit-1', ledgerCode: 'DEFAULT' });
    expect(manifest.generatedAt).toBe(generatedAt.toISOString());
  });

  it('com núcleo + 4 extras (6 itens): files preserva a ORDEM (position 0..5) e core continua o núcleo', () => {
    const extras = DELIVERABLE_EXPORT_KINDS.slice(0, 4).map((kind, i) => ({
      jobId: `extra-${i}`,
      kind,
      sha256: `${i}`.repeat(64),
    }));
    const manifest = buildDeliveryManifest({ scope, period, contactId: 'contact-1', core, extras, generatedAt });

    expect(manifest.files).toHaveLength(6);
    expect(manifest.files[0]).toEqual(manifest.core.ecd);
    expect(manifest.files[1]).toEqual(manifest.core.ecf);
    expect(manifest.files.slice(2)).toEqual(
      extras.map((e) => ({ kind: e.kind, jobId: e.jobId, sha256: e.sha256 })),
    );
    // Snapshot — qualquer regressão de FORMA (ordem, chaves, união fechada de kind) quebra aqui.
    expect(manifest).toMatchSnapshot();
  });

  it('TESTE-GUARDA: nenhum consumidor precisa de files[0]/files[1] — core já resolve o núcleo mesmo com extras', () => {
    const extras = [{ jobId: 'extra-x', kind: 'EXPORT_TRIAL_BALANCE' as const, sha256: 'f'.repeat(64) }];
    const manifest = buildDeliveryManifest({ scope, period, contactId: 'contact-1', core, extras, generatedAt });
    // Se um caller regredisse para `files[0]/files[1]` como núcleo, este teste não pegaria a
    // regressão sozinho — o que ele prova é que `core` é uma via INDEPENDENTE da posição, sempre
    // igual ao núcleo original, não importa quantos extras entrem antes na leitura.
    expect(manifest.core).toEqual({
      ecd: { kind: 'EXPORT_SPED_ECD', jobId: 'job-ecd', sha256: core.ecd.sha256 },
      ecf: { kind: 'EXPORT_SPED_ECF', jobId: 'job-ecf', sha256: core.ecf.sha256 },
    });
  });
});
