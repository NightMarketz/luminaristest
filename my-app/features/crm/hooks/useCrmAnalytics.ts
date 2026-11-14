import { useCallback, useEffect, useState } from 'react';
import { useLatestRequest } from './useLatestRequest';
import { CrmService, type CrmAnalyticsBundle, type CrmDatePreset } from '../../../lib/services/crm.service';

const EMPTY: CrmAnalyticsBundle = {
  cards: [], funnel: [], source: [], status: [], bant: [], proposals: [], activities: [],
};

export function useCrmAnalytics() {
  const [datePreset, setDatePreset] = useState<CrmDatePreset>('thisYear');
  const [data, setData] = useState<CrmAnalyticsBundle>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const begin = useLatestRequest();

  const reload = useCallback(async (preset: CrmDatePreset) => {
    const isCurrent = begin();
    setLoading(true);
    setError(null);
    try {
      const res = await CrmService.getAnalytics(preset);
      if (!isCurrent()) return;
      setData(res?.data ?? EMPTY);
    } catch (e) {
      if (!isCurrent()) return;
      setError(e instanceof Error ? e.message : 'Falha ao carregar analytics do CRM');
      setData(EMPTY);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [begin]);

  useEffect(() => {
    void reload(datePreset);
  }, [datePreset, reload]);

  return { datePreset, setDatePreset, data, loading, error };
}
