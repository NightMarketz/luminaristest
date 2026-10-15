import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getCookie } from 'cookies-next';
import { useAuth } from '../../lib/context/AuthContext';
import { DynamicTableService } from '../../lib/services/dynamic-table.service';
import { QuickSetup, TotalControlSetup, AiInterviewSetup } from '../../features/interview/setup';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { FiLayout } from 'react-icons/fi';

function SetupDashboardPage() {
  const { t } = useTranslation('common');
  const [mode, setMode] = useState<'quick' | 'totalControl' | 'aiInterview'>('quick');
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Se já houver tabelas, redireciona para o dashboard completo
    async function checkTables() {
      if (authLoading) return;
      if (!user) {
        router.replace('/users/login');
        return;
      }
      try {
        const body = await DynamicTableService.getTables();
        if (body?.data && Array.isArray(body.data) && body.data.length > 0) {
          router.replace('/dashboard');
          return;
        }
      } catch (err) {
        const errRec = err as Record<string, unknown>;
        if (errRec?.statusCode === 401 || errRec?.statusCode === 403 || (err instanceof Error && (err.message.includes('401') || err.message.includes('403'))) || errRec?.error === 'Unauthorized') {
          router.replace('/users/login');
          return;
        }
      } finally {
        setChecking(false);
      }
    }
    checkTables();
  }, [authLoading, user, router]);

  const tabClasses = (tabMode: 'quick' | 'totalControl' | 'aiInterview') =>
    `px-6 py-3 font-semibold text-lg rounded-t-lg transition-colors duration-300 focus:outline-none cursor-pointer border-b-2 ${mode === tabMode
      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
      : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-blue-600 hover:border-blue-300'
    }`;

  if (checking) {
    return (
      <>
        <Head>
          <title>{t('appName')} - Setup</title>
        </Head>
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 flex items-center justify-center">
          <div className="text-neutral-500 dark:text-neutral-400">{t('verifyingEnvironment')}</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{t('appName')} - Setup</title>
      </Head>
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-5xl">
            <header className="text-center mb-12">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-blue-600 text-white mb-6 shadow-xl shadow-blue-500/20">
                <FiLayout size={32} />
              </div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400">
                {t('setupSystem')}
              </h1>
              <p className="max-w-2xl mx-auto text-lg text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {t('setupDescription')}
              </p>
            </header>

            <div className={`w-full mx-auto transition-all duration-500 ease-in-out ${mode === 'aiInterview' ? 'max-w-7xl' : 'max-w-4xl'}`}>
              <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl shadow-neutral-200 dark:shadow-none border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <div className="border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/50 p-2">
                  <nav className="flex justify-center gap-2" aria-label="Tabs">
                    {[
                      { id: 'quick', label: t('quickMode') },
                      { id: 'totalControl', label: t('totalControlMode') },
                      { id: 'aiInterview', label: t('aiInterviewMode') }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setMode(tab.id as 'quick' | 'totalControl' | 'aiInterview')}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all duration-200 ${mode === tab.id
                          ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm ring-1 ring-neutral-200 dark:ring-neutral-700'
                          : 'text-neutral-500 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                <main className="p-8 sm:p-12">
                  {mode === 'quick' && <QuickSetup />}
                  {mode === 'totalControl' && <TotalControlSetup />}
                  {mode === 'aiInterview' && (
                    <div className="relative w-full">
                      <AiInterviewSetup />
                    </div>
                  )}
                </main>
              </div>

              <div className="mt-8 text-center">
                <p className="text-neutral-400 dark:text-neutral-600 text-sm">
                  {t('onboardingNeedHelp')} <button className="text-blue-500 font-semibold hover:underline">{t('onboardingContactSupport')}</button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default SetupDashboardPage;

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'pt', ['common'])),
    },
  };
};
