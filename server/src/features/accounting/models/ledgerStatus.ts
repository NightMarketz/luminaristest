/**
 * Statuses that make up the escrituração (ledger): everything except Draft.
 *
 * Order and membership are load-bearing and MUST NOT change casually — the array is
 * passed verbatim to `IPostingRepository.groupByAccount` / `IJournalEntryRepository.findManyForExport`,
 * so it defines trialBalance / BP / DRE / razão / balancete and the SPED escrituração:
 *   - 'Reversed' is included so a reversed entry and its reversal net to zero (T5, Contract §2.1);
 *     summing only 'Posted' would count just the reversal and break the ledger.
 *   - 'Reconciled' is economically identical to 'Posted' — a reversible bank-reconciliation
 *     marker, not a money change (ADR-INCR7 D5, emenda INCR4-A); omitting it would make a
 *     reconciled entry vanish from the reports.
 *   - 'Draft' never contributes (D6).
 *
 * ponytail: plain `string[]`, not `as const` — the two consumer signatures (groupByAccount,
 * findManyForExport) take mutable `string[]`; a readonly tuple would break tsc and force
 * widening both interfaces for no runtime gain.
 */
export const LEDGER_STATUSES = ['Posted', 'Reconciled', 'Reversed'];

/**
 * BE-INCR-REVIEW-LAYER (nó C11, item 15): estados da revisão profissional. `OPEN` é o único que
 * aceita achado/resolução/troca de jobs; `SIGNED_OFF` e `REJECTED` são terminais (sem DELETE — trilha
 * legal). Consumido pelo serviço e pelo gate da entrega (item 14).
 */
export const REVIEW_STATUSES = ['OPEN', 'SIGNED_OFF', 'REJECTED'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/**
 * BE-INCR-ACCOUNTANT-GOVERNANCE (nó GOV-CONTADOR, BRIEF item 1): estados da atribuição do contador
 * responsável. Três bastam — quem encerrou e por quê ficam em `endedById`/`endReason`.
 */
export const ASSIGNMENT_STATUSES = ['PENDING', 'ACTIVE', 'ENDED'] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

/**
 * BE-INCR-ACCOUNTING-POLICY-VERSION (nó GOV-CONTADOR, BRIEF item 1): estados da versão de política. `PROPOSED` é o
 * único que aceita decisão; os outros três são terminais (trilha de aprovação, sem DELETE).
 */
export const POLICY_VERSION_STATUSES = ['PROPOSED', 'APPLIED', 'REJECTED', 'SUPERSEDED'] as const;
export type PolicyVersionStatus = (typeof POLICY_VERSION_STATUSES)[number];
