import { useEffect, useState } from 'react';
import {
  accountantAssignmentsService,
  type AccountantAssignmentView,
} from '../../../lib/services/accountantAssignments.service';
import { accountingContactsService } from '../../../lib/services/accountingContacts.service';

export interface ActiveAssignment {
  assignment: AccountantAssignmentView;
  /** Nome do contato (cruzado por `accountingContactId`); `null` se o contato não carregou. */
  contactName: string | null;
}

/**
 * A atribuição ACTIVE do escopo, lida só no modo próprio (dono) — alimenta o banner e o texto do
 * `ACCOUNTANT_REQUIRED` (BRIEF item 12, F-FE-GOV-4 a). Informativo: falha de leitura = sem banner, nunca erro
 * (o servidor é a autoridade do gate; esta tela só explica).
 */
export function useActiveAssignment(unitId: string, enabled: boolean): ActiveAssignment | null {
  const [active, setActive] = useState<ActiveAssignment | null>(null);

  useEffect(() => {
    if (!enabled || !unitId) {
      setActive(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await accountantAssignmentsService.listByScope(unitId);
        const assignment = rows.find((r) => r.status === 'ACTIVE') ?? null;
        if (!assignment) {
          if (!cancelled) setActive(null);
          return;
        }
        let contactName: string | null = null;
        try {
          const contacts = await accountingContactsService.listContacts(unitId);
          contactName = contacts.find((c) => c.id === assignment.accountingContactId)?.name ?? null;
        } catch {
          contactName = null;
        }
        if (!cancelled) setActive({ assignment, contactName });
      } catch {
        if (!cancelled) setActive(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [unitId, enabled]);

  return active;
}
