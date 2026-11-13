import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import withAuth from '../../lib/hoc/withAuth';
import { AccountingView } from '../../features/accounting/AccountingView';

/**
 * /accounting — top-level page for the deterministic accounting module (first-class
 * Prisma, not a DynamicTable category). Mirrors the auth/i18n pattern of the other
 * fixed modules (users, documents): `withAuth` guards the route. The always-dark canvas is a design decision
 * (dono, 2026-11-13) — not a missing `dark:` variant.
 */
function AccountingPage() {
  const { t } = useTranslation('common');
  const { t: tAcc } = useTranslation('accounting');
  return (
    <>
      <Head>
        <title>{t('appName')} - {tAcc('view.title', 'Contabilidade')}</title>
      </Head>
      <div className="min-h-screen bg-neutral-950 text-neutral-100">
        <AccountingView />
      </div>
    </>
  );
}

export default withAuth(AccountingPage);

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'pt', ['common', 'accounting'])),
    },
  };
};
