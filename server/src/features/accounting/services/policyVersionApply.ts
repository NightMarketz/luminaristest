import type { Prisma } from 'generated/prisma';
import { PolicyApprovalRequiredError } from '../../../lib/errors';
import type { AccountingScope } from '../scope/AccountingScope';
import type { PolicyTarget } from '../models/AccountingPolicyVersion.model';
import type { IAccountantAssignmentRepository } from '../repositories/IAccountantAssignmentRepository';
import type { IAccountingPolicyVersionRepository } from '../repositories/IAccountingPolicyVersionRepository';

/** View do alvo → JSON gravável (instantes já são ISO nas views). */
export function toPolicyJson(view: object): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(view)) as Prisma.InputJsonValue;
}

/**
 * BE-INCR-ACCOUNTING-POLICY-VERSION item 6 (F-POL-3 a + F-POL-4 b): com contador ACTIVE, o `PUT` de parâmetro governado
 * não aplica. Chamado DUAS vezes — preflight sem `tx` e releitura autoritativa dentro do `runTransaction` (memória
 * authoritative-gate-inside-tx): um aceite entre o preflight e a tx não deixa a escrita passar.
 */
export async function assertNoActiveAccountant(
  assignmentRepo: IAccountantAssignmentRepository,
  scope: AccountingScope,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  if (await assignmentRepo.findActive(scope, tx)) throw new PolicyApprovalRequiredError();
}

/**
 * Item 5 + 6 (F-GOV-4 a): `PUT` sem contador aplica como hoje e grava a versão APPLIED (`decidedById = ator`,
 * `assignmentId = null`, `proposedById = null`). Se havia PROPOSED órfã do alvo (item 11), ela vira SUPERSEDED pela
 * versão nova. `apply` é o `applyInTx` do alvo; o snapshot é a view devolvida por ele.
 */
export async function applyDirectInTx<V extends object>(
  policyVersionRepo: IAccountingPolicyVersionRepository,
  scope: AccountingScope,
  target: PolicyTarget,
  payload: Prisma.InputJsonValue,
  tx: Prisma.TransactionClient,
  apply: (policyVersionId: string) => Promise<V>,
): Promise<V> {
  const pending = await policyVersionRepo.findPending(scope, target, tx);
  const version = await policyVersionRepo.create(
    {
      userId: scope.ownerUserId,
      unitId: scope.unitId,
      target,
      version: await policyVersionRepo.nextVersion(scope, target, tx),
      status: 'APPLIED',
      payload,
      proposedById: null,
      decidedById: scope.actorUserId,
      decidedAt: new Date(),
    },
    tx,
  );
  if (pending) {
    await policyVersionRepo.transition(pending.id, 'PROPOSED', 'SUPERSEDED', { supersededById: version.id }, tx);
  }
  const view = await apply(version.id);
  await policyVersionRepo.setAppliedSnapshot(version.id, toPolicyJson(view), tx);
  return view;
}
