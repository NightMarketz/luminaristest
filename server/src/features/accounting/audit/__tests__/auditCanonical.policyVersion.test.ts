/**
 * BE-INCR-ACCOUNTING-POLICY-VERSION (BRIEF itens 14 e 15i): contrato da allowlist dos eventos novos, máscara do
 * `reason`, e a prova de que acrescentar `policyVersionId` a `fiscal_profile.updated` NÃO muda o hash de evento gravado
 * antes (o evento antigo não tem a chave, e `canonicalizeAuditPayload` pula ausente). O hash abaixo foi calculado com
 * o `auditCanonical.ts` de `origin/main` 95f9894a, ANTES da mudança da allowlist, com a mesma tupla.
 */
import {
  PAYLOAD_ALLOWLIST,
  buildAuditCanonicalTuple,
  canonicalizeAuditPayload,
  hashAuditCanonical,
  GENESIS_HASH,
} from '../auditCanonical';
import { MASKABLE_FREE_TEXT_KEYS } from '../auditFreeTextMask';

const FP_BEFORE = { regimeTributario: 'REAL', icmsContribuinte: 'true', pisCofinsRegime: 'NAO_CUMULATIVO', pisCofinsCreditFromSimplesSupplier: 'false' };
const FP_PINNED = '9f3351bd422c0ffe7701928487a89967b7e0ff264c14e7c920c9a7746521ee2a';

function hashOf(eventType: string, payload: Record<string, unknown>): string {
  return hashAuditCanonical(buildAuditCanonicalTuple({
    eventId: 'evt-1', scopeUserId: 'owner-1', unitId: 'unit-1', seq: 1n, actorUserId: 'owner-1', actorType: 'USER',
    eventType, targetType: 'x', targetId: 'id-1', payloadCanonical: canonicalizeAuditPayload(eventType, payload),
    createdAtISO: '2026-10-04T00:00:00.000Z', prevHash: GENESIS_HASH,
  }));
}

describe('auditCanonical — política versionada', () => {
  it('fiscal_profile.updated gravado antes da mudança mantém o hash; com policyVersionId o hash muda', () => {
    expect(hashOf('fiscal_profile.updated', FP_BEFORE)).toBe(FP_PINNED);
    expect(hashOf('fiscal_profile.updated', { ...FP_BEFORE, policyVersionId: 'pv-1' })).not.toBe(FP_PINNED);
    expect(PAYLOAD_ALLOWLIST['fiscal_profile.updated']).toContain('policyVersionId');
  });

  it('allowlist dos 3 eventos novos: só ids e números — nunca o payload da proposta', () => {
    expect(PAYLOAD_ALLOWLIST['policy_version.proposed']).toEqual(['policyVersionId', 'target', 'version', 'supersededId']);
    expect(PAYLOAD_ALLOWLIST['policy_version.applied']).toEqual(['policyVersionId', 'target', 'version', 'assignmentId']);
    expect(PAYLOAD_ALLOWLIST['policy_version.rejected']).toEqual(['policyVersionId', 'target', 'version', 'reason']);
    const canon = canonicalizeAuditPayload('policy_version.proposed', {
      policyVersionId: 'pv-1', target: 'FISCAL_PROFILE', version: 2, payload: { pisCofinsCreditFromSimplesSupplier: true },
    });
    expect(JSON.parse(canon)).toEqual({ policyVersionId: 'pv-1', target: 'FISCAL_PROFILE', version: '2' });
  });

  it('o reason da rejeição é texto livre mascarável', () => {
    expect(MASKABLE_FREE_TEXT_KEYS['policy_version.rejected']).toEqual(['reason']);
  });
});
