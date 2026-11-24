import { DFE_SIGNER_ONLINE_MS } from '../../models/DfeSigner.model';
import type { DfeSignerDeviceWithUnits, IDfeSignerRepository } from '../../repositories/IDfeSignerRepository';
import type { IDfeSignerTaskRepository } from '../../repositories/IDfeSignerTaskRepository';
import type { AccountingScope } from '../../scope/AccountingScope';
import { DfeSignerTaskService } from '../DfeSignerTaskService';

/**
 * X10a EMENDA-4 AL-14 — a marca de retomada devolvida (a retomada que não achou nota pendente) vale só enquanto é recente
 * (`DFE_SIGNER_ONLINE_MS`, 90 s). Relógio injetado: o limite não depende do tempo real nem do SQLite. O defeito que este teste
 * guarda: a marca ser lida depois de apagada, de modo que a "idade" da marca fosse sempre a do poll — e a janela recomeçasse a cada poll.
 */
describe('DfeSignerTaskService — idade da marca de retomada devolvida (AL-14)', () => {
  const POLL_MS = 30_000;
  const device = {
    id: 'dev-1',
    userId: 'user-1',
    certThumbprint: 'ab'.repeat(32),
    units: [{ unitId: 'unit-1' }],
  } as unknown as DfeSignerDeviceWithUnits;
  const hb = { versaoAssinador: '1.0.0', tokenPresente: true, certThumbprintSha256: device.certThumbprint };

  it('sem nota pendente nunca, o poll devolve a marca por no máximo 90 s e depois para de procurar', async () => {
    let agora = Date.parse('2026-11-24T12:00:00Z');
    const retomadas: string[] = [];
    const taskRepo = {
      create: jest.fn(async () => ({ id: 'tarefa-1' })),
      expirarPendente: jest.fn(async () => true),
      expirarVencidas: jest.fn(async () => 0),
      claim: jest.fn(async () => []),
    } as unknown as IDfeSignerTaskRepository;
    // O heartbeat de 30 em 30 s nunca é "voltou" (lastSeenAt recente): só a marca pode disparar a retomada.
    const signerRepo = { registrarHeartbeat: jest.fn(async () => false) } as unknown as IDfeSignerRepository;
    const svc = new DfeSignerTaskService(taskRepo, signerRepo, {
      now: () => new Date(agora),
      env: { DFE_SIGNER_RETOMADA_ESPACO_MS: '1' } as NodeJS.ProcessEnv,
    });
    svc.setOnRetomada(async (scope) => {
      retomadas.push(scope.unitId);
      return { enviadas: 0, falhas: 0 }; // não há PENDING_SIGNATURE
    });
    const scope = { ownerUserId: 'user-1', unitId: 'unit-1' } as AccountingScope;

    // A tarefa vence sem resposta: a marca é posta em t0.
    await expect(svc.fila(device, scope).executar({ tipo: 'ASSINAR', algoritmo: 'rsa-sha1', digestB64: 'aGFzaA==', conteudo: 'x' } as never, 5)).resolves.toBe('NAO_ENTREGUE');

    const t0 = agora;
    for (let decorrido = POLL_MS; decorrido <= 20 * POLL_MS; decorrido += POLL_MS) {
      agora = t0 + decorrido;
      await svc.poll(device, hb as never, 0);
      await new Promise((r) => setImmediate(r)); // a retomada roda fora do poll: deixa a cadeia de promessas terminar
    }

    // Polls em 30 s e 60 s devolvem a marca (< 90 s); o de 90 s a retoma e não a devolve mais (90 s não é < 90 s).
    expect(retomadas).toHaveLength(3);
    expect(DFE_SIGNER_ONLINE_MS).toBe(90_000);
  });
});
