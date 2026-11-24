'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLatestRequest } from './useLatestRequest';
import { CrmService, type AttachmentMeta } from '../../../lib/services/crm.service';

export interface LeadAttachmentsState {
  loading: boolean;
  error: string | null;
  attachments: AttachmentMeta[];
  reload: () => Promise<void>;
}

/**
 * Loads the file-store attachments for a single lead via the CRM service
 * (`listAttachments('lead', leadId)`). Returns metadata only — the binary is
 * fetched on demand by the download action. Degrades gracefully on error
 * (empty list + message). Service layer only (contract §3).
 */
export function useLeadAttachments(leadId: string): LeadAttachmentsState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<AttachmentMeta[]>([]);

  const begin = useLatestRequest();

  const reload = useCallback(async () => {
    const isCurrent = begin();
    if (!leadId) {
      setAttachments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await CrmService.listAttachments('lead', leadId);
      if (!isCurrent()) return;
      setAttachments(res?.data ?? []);
    } catch (e) {
      if (!isCurrent()) return;
      setAttachments([]);
      setError(e instanceof Error ? e.message : 'Falha ao carregar anexos');
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [leadId, begin]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { loading, error, attachments, reload };
}
