import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { DynamicTableService } from '../../../lib/services/dynamic-table.service';
import { installedCrmModules, type CrmModuleKey } from '../lib/crmModules';

const ITEMS: { href: string; key: string; fallback: string; module: CrmModuleKey }[] = [
  { href: '/crm', key: 'nav.overview', fallback: 'Visão Geral', module: 'CRM-0' },
  { href: '/crm/pipeline', key: 'nav.pipeline', fallback: 'Pipeline', module: 'CRM-0' },
  { href: '/crm/opportunities', key: 'nav.opportunities', fallback: 'Oportunidades', module: 'CRM-3' },
  { href: '/crm/contacts', key: 'nav.contacts', fallback: 'Contatos', module: 'CRM-2' },
  { href: '/crm/accounts', key: 'nav.accounts', fallback: 'Contas', module: 'CRM-2' },
  { href: '/crm/proposals', key: 'nav.proposals', fallback: 'Propostas', module: 'CRM-1' },
  { href: '/crm/activities', key: 'nav.activities', fallback: 'Atividades', module: 'CRM-0' },
  { href: '/crm/meetings', key: 'nav.meetings', fallback: 'Reuniões', module: 'CRM-0' },
  { href: '/crm/analytics', key: 'nav.analytics', fallback: 'Analytics', module: 'CRM-0' },
];

/**
 * Shared CRM module navigation — links every CRM screen of an INSTALLED module and highlights the active one
 * (I8 comportamento 9: CRM-0 base; Propostas = CRM-1; Contas/Contatos = CRM-2; Oportunidades = CRM-3).
 * Until the table list arrives only the base (CRM-0) areas show; if it fails, every area shows (no hiding on error).
 */
export function CrmNav() {
  const router = useRouter();
  const { t } = useTranslation('crm');
  const [modules, setModules] = useState<Set<CrmModuleKey> | 'all'>(() => new Set<CrmModuleKey>(['CRM-0']));

  useEffect(() => {
    let alive = true;
    DynamicTableService.getTables()
      .then((res) => {
        const list = Array.isArray(res?.data) ? (res.data as { internalName?: string | null }[]) : [];
        if (alive) setModules(installedCrmModules(list.map((x) => x?.internalName)));
      })
      .catch(() => {
        if (alive) setModules('all');
      });
    return () => {
      alive = false;
    };
  }, []);

  const visible = ITEMS.filter((item) => modules === 'all' || modules.has(item.module));
  return (
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-gray-200 dark:border-white/5">
      {visible.map((item) => {
        const active = router.pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`-mb-px border-b-2 px-3 py-2.5 text-[11px] font-black uppercase tracking-widest transition ${
              active
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t(item.key, item.fallback)}
          </Link>
        );
      })}
    </nav>
  );
}
