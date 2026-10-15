import React from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { GetServerSideProps, GetServerSidePropsContext } from 'next';
import withAuth from '../../lib/hoc/withAuth';
import { CrmProvider } from '../../lib/context/CrmContext';
import { CrmLayout } from '../../features/crm/components/CrmLayout';

// FE-INCR-CRM-REPORT-BUILDER PR-A, item 1 (F-FRB1=(a)): rota própria do builder de relatórios do CRM, no padrão de
// pages/crm/analytics.tsx — o builder usa Recharts (ChartRenderer), então carrega só no cliente.
function CrmLoading() {
  const { t } = useTranslation('crm');
  return <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t('common.loading', 'Loading…')}</p>;
}

const CrmReportBuilder = dynamic(
  () => import('../../features/crm/components/reports/CrmReportBuilder').then((m) => m.CrmReportBuilder),
  {
    ssr: false,
    loading: () => <CrmLoading />,
  },
);

function CrmReportsInner() {
  const { t } = useTranslation('crm');
  return (
    <CrmLayout>
      <h1 className="mb-1 text-2xl font-black tracking-tight text-gray-900 dark:text-white">
        {t('report_builder.title', 'CRM — Relatórios')}
      </h1>
      <p className="mb-6 text-sm font-semibold text-gray-500 dark:text-gray-400">
        {t('report_builder.subtitle', 'Monte, salve e reabra relatórios sobre as tabelas do CRM')}
      </p>
      <CrmReportBuilder />
    </CrmLayout>
  );
}

function CrmReportsPage() {
  return (
    <CrmProvider>
      <CrmReportsInner />
    </CrmProvider>
  );
}

export const getServerSideProps: GetServerSideProps = async (context: GetServerSidePropsContext) => {
  const { locale } = context;
  // `analytics` é exigido pelo ChartRenderer canônico (useTranslation(['analytics'])); `database` pelo GenericTable.
  return { props: { ...(await serverSideTranslations(locale ?? 'en', ['common', 'crm', 'analytics', 'database'])) } };
};

export default withAuth(CrmReportsPage);
