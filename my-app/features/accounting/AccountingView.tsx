import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { FiBookOpen, FiCheckCircle, FiAlertTriangle, FiPlusCircle } from 'react-icons/fi';
import { useAccountingData } from './hooks/useAccountingData';
import { TrialBalanceTable } from './components/TrialBalanceTable';
import { LegalParametersPanel } from './components/LegalParametersPanel';
import { JournalEntriesPanel } from './components/JournalEntriesPanel';
import { EntryApprovalsPanel } from './components/EntryApprovalsPanel';
import { ChartOfAccountsPanel } from './components/ChartOfAccountsPanel';
import { PeriodsPanel } from './components/PeriodsPanel';
import { LedgerPanel } from './components/LedgerPanel';
import { BalanceSheetPanel } from './components/BalanceSheetPanel';
import { IncomeStatementPanel } from './components/IncomeStatementPanel';
import { ImportExportPanel } from './components/ImportExportPanel';
import { ReconciliationPanel } from './components/ReconciliationPanel';
import { NfePanel } from './components/NfePanel';
import { CompliancePanel } from './components/CompliancePanel';
import { SpedGenerationPanel } from './components/SpedGenerationPanel';
import { ReviewPanel } from './components/ReviewPanel';
import { DeliveryPanel } from './components/DeliveryPanel';
import { LalurPanel } from './components/LalurPanel';
import { DFCPanel } from './components/DFCPanel';
import { PeriodComparisonPanel } from './components/PeriodComparisonPanel';
import { DailyJournalPanel } from './components/DailyJournalPanel';
import { AccountsPayablePanel } from './components/AccountsPayablePanel';
import { AccountsReceivablePanel } from './components/AccountsReceivablePanel';
import { AgingPanel } from './components/AgingPanel';
import { CashForecastPanel } from './components/CashForecastPanel';
import { CounterpartiesPanel } from './components/CounterpartiesPanel';
import { DimensionsPanel } from './components/DimensionsPanel';
import { FixedAssetsPanel, type FixedAssetsSectionId } from './components/FixedAssetsPanel';
import { FiscalProfilePanel } from './components/FiscalProfilePanel';
import { ServiceFiscalProfilesPanel } from './components/ServiceFiscalProfilesPanel';
import { JournalEntryModal, type AccountOption } from './components/JournalEntryModal';
import { accountingService } from '../../lib/services/accounting.service';
import { dimensionsService, type DimensionCatalogEntry } from '../../lib/services/dimensions.service';
import {
  accountantAssignmentsService,
  type MyAccountantAssignmentView,
} from '../../lib/services/accountantAssignments.service';
import { toGovernanceScope } from './governance/GovernanceScope';
import { AccountantAssignmentSection } from './governance/AccountantAssignmentSection';
import { ClientModeStrip, PendingInvitesBanner, clientLabel } from './governance/ClientModeBars';
import { PolicyVersionsPanel } from './governance/PolicyVersionsPanel';

export type Tab = 'balancete' | 'periodos' | 'lancamentos' | 'aprovacoes' | 'contas-a-pagar' | 'contas-a-receber' | 'aging' | 'fluxo-de-caixa-projetado' | 'contrapartes' | 'razao' | 'plano-de-contas' | 'bp' | 'dre' | 'dfc' | 'comparativo' | 'diario' | 'importacao-exportacao' | 'conciliacao' | 'nfe' | 'compliance' | 'dimensoes' | 'imobilizado' | 'perfil-fiscal' | 'parametros-legais' | 'politica';

// label = i18n fallback (current pt-BR); rendered via t(`view.tabs.<id>`, label)
export const TABS: Array<{ id: Tab; labelKey: string; label: string }> = [
  { id: 'balancete',      labelKey: 'view.tabs.balancete',      label: 'Balancete' },
  { id: 'periodos',       labelKey: 'view.tabs.periodos',       label: 'Períodos' },
  { id: 'lancamentos',    labelKey: 'view.tabs.lancamentos',    label: 'Lançamentos' },
  { id: 'aprovacoes',     labelKey: 'view.tabs.aprovacoes',     label: 'Aprovações' },
  { id: 'contas-a-pagar', labelKey: 'view.tabs.contasAPagar',   label: 'Contas a Pagar' },
  { id: 'contas-a-receber', labelKey: 'view.tabs.contasAReceber', label: 'Contas a Receber' },
  // F-AGING-1(b) ratificado: aba própria entre "Contas a Receber" e "Contrapartes" — cobre AMBOS
  // AP e AR via toggle único (F-AGING-2), então é seu próprio relatório de posição (análogo a
  // DFC/Comparativo/Diário), na ordem lógica documento → posição agregada → cadastro.
  { id: 'aging',          labelKey: 'view.tabs.aging',          label: 'Aging' },
  // F-CF7(a) ratificado: aba própria logo após "Aging" — ordem lógica documento (AP/AR) →
  // posição atual (aging) → posição futura (forecast); NUNCA sub-view do DFC nem do Aging
  // (misturaria semânticas de tempo opostas, ver BRIEF FE-INCR-CASH-FORECAST).
  { id: 'fluxo-de-caixa-projetado', labelKey: 'view.tabs.cashForecast', label: 'Fluxo de Caixa Projetado' },
  { id: 'contrapartes',   labelKey: 'view.tabs.contrapartes',   label: 'Contrapartes' },
  { id: 'razao',          labelKey: 'view.tabs.razao',          label: 'Razão' },
  { id: 'plano-de-contas',labelKey: 'view.tabs.planoDeContas',  label: 'Plano de Contas' },
  { id: 'bp',             labelKey: 'view.tabs.bp',             label: 'BP' },
  { id: 'dre',            labelKey: 'view.tabs.dre',            label: 'DRE' },
  { id: 'dfc',            labelKey: 'view.tabs.dfc',            label: 'DFC' },
  { id: 'comparativo',    labelKey: 'view.tabs.comparativo',    label: 'Comparativo' },
  { id: 'diario',         labelKey: 'view.tabs.diario',         label: 'Livro Diário' },
  { id: 'importacao-exportacao', labelKey: 'view.tabs.importacaoExportacao', label: 'Importação/Exportação' },
  { id: 'conciliacao',    labelKey: 'view.tabs.conciliacao',    label: 'Conciliação' },
  { id: 'nfe',            labelKey: 'view.tabs.nfe',            label: 'NF-e' },
  { id: 'compliance',     labelKey: 'view.tabs.compliance',     label: 'Compliance' },
  { id: 'dimensoes',      labelKey: 'view.tabs.dimensoes',      label: 'Dimensões' },
  // F-FAFE-4(a) ratificado: aba própria (22ª) — imobilizado não é título a pagar; o vínculo com AP é só a origem NF-e.
  { id: 'imobilizado',    labelKey: 'view.tabs.imobilizado',    label: 'Imobilizado' },
  // F-FE-DFE-6(a) ratificado 02/10: aba própria — o perfil serve à NF-e de compra (X6) E à NFS-e de venda.
  { id: 'perfil-fiscal',  labelKey: 'view.tabs.perfilFiscal',   label: 'Perfil fiscal' },
  // FE-INCR-LEGAL-PARAMS (F-FE-LP-1 b, dono 08/10): coeficientes de lei da PLATAFORMA — o painel não usa a unidade.
  { id: 'parametros-legais', labelKey: 'view.tabs.parametrosLegais', label: 'Parâmetros legais' },
  // FE-INCR-ACCOUNTING-POLICY-VERSION (F-FE-POL-2 a, dono 06/10): versões da política — o mesmo painel nos dois modos.
  { id: 'politica',       labelKey: 'view.tabs.politica',       label: 'Política contábil' },
];

/**
 * Abas do modo cliente (F-FE-GOV-1 b, BRIEF item 8.1): lista de PERMITIDAS, não de proibidas — uma aba nova
 * acrescentada ao `TABS` fica ESCONDIDA por padrão no modo cliente até alguém pô-la aqui de propósito.
 */
export const DELEGATED_TABS: readonly Tab[] = ['periodos', 'compliance', 'politica'];

const OWN_CONTEXT = 'own';

/**
 * Accounting workspace — first-class Prisma double-entry module. Picks a business
 * unit (the second tenancy axis) and shows its trial balance (balancete), journal
 * entries, and chart of accounts as tabs.
 */
export function AccountingView() {
  const { t } = useTranslation('accounting');
  // ── Modo cliente (FE-INCR-ACCOUNTANT-GOVERNANCE itens 6–8) ───────────────────────────────────────────────
  // A carteira do usuário como contador (`/mine`) é lida UMA vez, no mount; erro ou lista vazia = a tela de sempre.
  const [assignments, setAssignments] = useState<MyAccountantAssignmentView[]>([]);
  const [assignmentsLoaded, setAssignmentsLoaded] = useState(false);
  // `null` = o usuário ainda não escolheu (vale o default do item 6.4); `'own'` = Meus livros; senão o id da atribuição.
  const [chosenContext, setChosenContext] = useState<string | null>(null);

  const reloadAssignments = useCallback(async () => {
    try {
      setAssignments(await accountantAssignmentsService.listMine());
    } catch {
      setAssignments([]);
    } finally {
      setAssignmentsLoaded(true);
    }
  }, []);
  useEffect(() => { void reloadAssignments(); }, [reloadAssignments]);

  const activeAssignments = useMemo(() => assignments.filter((a) => a.status === 'ACTIVE'), [assignments]);
  const pendingAssignments = useMemo(() => assignments.filter((a) => a.status === 'PENDING'), [assignments]);

  // `governance` é montado ANTES do hook de dados, que precisa saber se pula o balancete: as unidades próprias
  // (para o default do item 6.4) vêm do próprio hook, então o default lê `ownUnits` num 2º passo, abaixo.
  const [ownUnitsEmpty, setOwnUnitsEmpty] = useState(false);
  const selectedAssignment = useMemo(() => {
    const wanted = chosenContext ?? (assignmentsLoaded && ownUnitsEmpty ? activeAssignments[0]?.id ?? OWN_CONTEXT : OWN_CONTEXT);
    return activeAssignments.find((a) => a.id === wanted) ?? null;
  }, [activeAssignments, chosenContext, assignmentsLoaded, ownUnitsEmpty]);
  const governance = useMemo(() => (selectedAssignment ? toGovernanceScope(selectedAssignment) : undefined), [selectedAssignment]);

  const { units, unitId: ownUnitId, setUnitId, report, loadingUnits, loadingReport, error, reload } =
    useAccountingData(governance);
  useEffect(() => { setOwnUnitsEmpty(!loadingUnits && units.length === 0); }, [loadingUnits, units.length]);
  const unitId = governance ? governance.unitId : ownUnitId;
  // Remonta os painéis delegáveis a cada troca de livro: resposta atrasada e formulário aberto de um contexto não podem aparecer no outro.
  const contextKey = governance ? governance.assignmentId : OWN_CONTEXT;

  const [rawTab, setRawTab] = useState<Tab>('balancete');
  // Allowlist por construção: no modo cliente nenhuma aba fora de `DELEGATED_TABS` chega a renderizar (item 8.1).
  const activeTab: Tab = governance && !DELEGATED_TABS.includes(rawTab) ? 'periodos' : rawTab;
  const setActiveTab = setRawTab;
  // Seção em que a aba Imobilizado abre — a NF-e aponta "Classes"/"Taxas"; volta a "Bens" ao sair da aba.
  const [fixedAssetsSection, setFixedAssetsSection] = useState<FixedAssetsSectionId>('bens');
  useEffect(() => { if (activeTab !== 'imobilizado') setFixedAssetsSection('bens'); }, [activeTab]);
  const visibleTabs = governance ? TABS.filter((tab) => DELEGATED_TABS.includes(tab.id)) : TABS;

  function switchContext(next: string) {
    setChosenContext(next);
    setRawTab('periodos'); // a aba anterior pode não existir no outro modo (item 8.6)
  }
  // `ACCOUNTANT_NOT_ASSIGNED` / encerramento: volta a "Meus livros" e recarrega a carteira (itens 6.6 e 12).
  const leaveClient = useCallback(() => {
    setChosenContext(OWN_CONTEXT);
    setRawTab('periodos');
    void reloadAssignments();
  }, [reloadAssignments]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAccounts, setModalAccounts] = useState<AccountOption[]>([]);
  const [modalDimensionCatalog, setModalDimensionCatalog] = useState<DimensionCatalogEntry[]>([]);

  // F-AGING-5(b): navegação cruzada contraparte → subledger filtrado. Guarda o
  // counterpartyId clicado no AgingPanel só até o painel-alvo (recém-montado, ver troca de
  // aba abaixo) consumir o valor como SEED do seu próprio `useState` de filtros — nunca como
  // prop sincronizada. Limpo logo em seguida (efeito abaixo) para que uma revisita MANUAL à
  // mesma aba (que desmonta/remonta o painel, pois o render é condicional por `activeTab`)
  // não reaplique um filtro de uma navegação anterior.
  const [pendingCounterpartyFilter, setPendingCounterpartyFilter] = useState<{
    target: 'contas-a-pagar' | 'contas-a-receber';
    counterpartyId: string;
  } | null>(null);

  useEffect(() => {
    if (!pendingCounterpartyFilter) return;
    // O painel-alvo já capturou o valor como SEED no mesmo commit (useState lazy initializer
    // roda durante o render, antes de qualquer efeito) — consumo de uso único.
    setPendingCounterpartyFilter(null);
  }, [pendingCounterpartyFilter]);

  function openNewEntryModal() {
    // Modo cliente: `getAccounts`/`listCatalog` não são dos 9 handlers (item 8.4) — e a aba Balancete nem monta.
    if (!unitId || governance) return;
    // Fetch accounts (required) and the dimension catalog (best-effort, for optional per-line tagging).
    accountingService
      .getAccounts(unitId)
      .then((r) => {
        setModalAccounts(r.accounts.filter((a) => a.acceptsEntries));
        setIsModalOpen(true);
      })
      .catch(() => {
        // Still open the modal; it will show an empty account list
        setModalAccounts([]);
        setIsModalOpen(true);
      });
    dimensionsService
      .listCatalog({ unitId })
      .then(setModalDimensionCatalog)
      .catch(() => setModalDimensionCatalog([]));
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center rounded-2xl bg-emerald-600/15 p-3 text-emerald-400">
            <FiBookOpen size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-100">{t('view.title', 'Contabilidade')}</h1>
            <p className="text-sm text-neutral-500">{t('view.subtitle', 'Razão de partida dobrada — balancete por unidade')}</p>
          </div>
        </div>

        {activeAssignments.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-neutral-400">{t('governance.context.label', 'Livro')}</span>
            <select
              aria-label={t('governance.context.label', 'Livro')}
              value={selectedAssignment ? selectedAssignment.id : OWN_CONTEXT}
              onChange={(e) => switchContext(e.target.value)}
              className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 focus:border-emerald-500 focus:outline-none"
            >
              <option value={OWN_CONTEXT}>{t('governance.context.own', 'Meus livros')}</option>
              <optgroup label={t('governance.context.clients', 'Clientes que atendo')}>
                {activeAssignments.map((a) => (
                  <option key={a.id} value={a.id}>{clientLabel(a)}</option>
                ))}
              </optgroup>
            </select>
          </label>
        )}

        {!governance && (
        <label className="flex items-center gap-2 text-sm">
          <span className="text-neutral-400">{t('view.unit', 'Unidade')}</span>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            disabled={loadingUnits || units.length === 0}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 focus:border-emerald-500 focus:outline-none disabled:opacity-50"
          >
            {loadingUnits && <option>{t('view.loadingUnits', 'Carregando…')}</option>}
            {!loadingUnits && units.length === 0 && <option value="">{t('view.noUnit', 'Nenhuma unidade')}</option>}
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
        )}
      </header>

      <PendingInvitesBanner pending={pendingAssignments} onAccepted={() => void reloadAssignments()} />
      {governance && <ClientModeStrip governance={governance} onEnded={leaveClient} onOpenPolicy={() => setActiveTab('politica')} />}

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <div
        className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-neutral-800"
        role="tablist"
        aria-label={t('view.title', 'Contabilidade')}
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-emerald-400'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {t(tab.labelKey, tab.label)}
            {activeTab === tab.id && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-emerald-400" />
            )}
          </button>
        ))}
      </div>

      {/* ── No unit selected ───────────────────────────────────────────────── */}
      {!unitId && !loadingUnits && (
        <div className="py-16 text-center text-neutral-500">
          {t('view.selectUnitPrompt', 'Selecione uma unidade para visualizar os dados contábeis.')}
        </div>
      )}

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {error && !governance && (
        <div className="mb-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* ── Balancete tab ──────────────────────────────────────────────────── */}
      {activeTab === 'balancete' && unitId && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-neutral-200">{t('view.balancete', 'Balancete')}</h2>
              {report && !loadingReport && (
                report.balanced ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/15 px-3 py-1 text-xs font-medium text-emerald-400">
                    <FiCheckCircle size={14} /> {t('view.balanced', 'Balanceado (Σdébito = Σcrédito)')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/15 px-3 py-1 text-xs font-medium text-red-400">
                    <FiAlertTriangle size={14} /> {t('view.unbalanced', 'Desbalanceado — verifique o razão')}
                  </span>
                )
              )}
            </div>

            <button
              type="button"
              onClick={openNewEntryModal}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 active:bg-emerald-700"
            >
              <FiPlusCircle size={16} />
              {t('view.newEntry', 'Novo Lançamento')}
            </button>
          </div>

          <TrialBalanceTable report={report} loading={loadingReport} />
        </>
      )}

      {/* ── Períodos tab ───────────────────────────────────────────────────── */}
      {activeTab === 'periodos' && unitId && (
        <PeriodsPanel key={contextKey} unitId={unitId} governance={governance} onAssignmentLost={leaveClient} />
      )}

      {/* ── Lançamentos tab ────────────────────────────────────────────────── */}
      {activeTab === 'lancamentos' && unitId && (
        <JournalEntriesPanel unitId={unitId} onReversalComplete={reload} onNavigateToPeriods={() => setActiveTab('periodos')} />
      )}

      {/* ── Aprovações (torre maker-checker) tab ───────────────────────────── */}
      {activeTab === 'aprovacoes' && unitId && (
        <EntryApprovalsPanel unitId={unitId} onLedgerChange={reload} onNavigateToPeriods={() => setActiveTab('periodos')} />
      )}

      {/* ── Contas a Pagar tab ─────────────────────────────────────────────── */}
      {activeTab === 'contas-a-pagar' && unitId && (
        <AccountsPayablePanel
          unitId={unitId}
          onLedgerChange={reload}
          onNavigateToPeriods={() => setActiveTab('periodos')}
          onNavigateToCounterparties={() => setActiveTab('contrapartes')}
          // F-AGING-5(b): SEED de uma só vez vindo do clique num grupo do AgingPanel — `undefined`
          // (nunca reaplicado) numa visita manual à aba, porque o efeito acima já limpou o pending.
          initialFilters={
            pendingCounterpartyFilter?.target === 'contas-a-pagar'
              ? { counterpartyId: pendingCounterpartyFilter.counterpartyId }
              : undefined
          }
        />
      )}

      {/* ── Contas a Receber tab ───────────────────────────────────────────── */}
      {activeTab === 'contas-a-receber' && unitId && (
        <AccountsReceivablePanel
          unitId={unitId}
          onLedgerChange={reload}
          onNavigateToPeriods={() => setActiveTab('periodos')}
          onNavigateToCounterparties={() => setActiveTab('contrapartes')}
          // F-AGING-5(b): mesmo SEED de uso único do lado de Contas a Receber.
          initialFilters={
            pendingCounterpartyFilter?.target === 'contas-a-receber'
              ? { counterpartyId: pendingCounterpartyFilter.counterpartyId }
              : undefined
          }
        />
      )}

      {/* ── Aging tab (posição por contraparte × faixa de vencimento) ───────── */}
      {activeTab === 'aging' && unitId && (
        // F-AGING-5(b) — COMPLETO (escopo estendido pelo orquestrador 2026-09-01): o clique num
        // grupo guarda o counterpartyId + a aba-alvo em `pendingCounterpartyFilter` e troca de
        // aba; o painel recém-montado consome o valor como seed do seu próprio filtro
        // (`initialFilters`, ver AccountsPayablePanel/AccountsReceivablePanel). O efeito acima
        // limpa o pending logo após a montagem — uma revisita manual à mesma aba (tab bar)
        // desmonta/remonta o painel sem seed.
        <AgingPanel
          unitId={unitId}
          onNavigateToPayable={(counterpartyId) => {
            setPendingCounterpartyFilter({ target: 'contas-a-pagar', counterpartyId });
            setActiveTab('contas-a-pagar');
          }}
          onNavigateToReceivable={(counterpartyId) => {
            setPendingCounterpartyFilter({ target: 'contas-a-receber', counterpartyId });
            setActiveTab('contas-a-receber');
          }}
        />
      )}

      {/* ── Fluxo de Caixa Projetado tab (F-CF7→a, read-only sobre vencimentos AP/AR) ───────── */}
      {activeTab === 'fluxo-de-caixa-projetado' && unitId && (
        <CashForecastPanel unitId={unitId} />
      )}

      {/* ── Contrapartes tab ───────────────────────────────────────────────── */}
      {activeTab === 'contrapartes' && unitId && (
        <CounterpartiesPanel unitId={unitId} />
      )}

      {/* ── Razão tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'razao' && unitId && (
        <LedgerPanel unitId={unitId} />
      )}

      {/* ── Plano de Contas tab ────────────────────────────────────────────── */}
      {activeTab === 'plano-de-contas' && unitId && (
        <ChartOfAccountsPanel unitId={unitId} canManage={true} />
      )}

      {/* ── BP tab ─────────────────────────────────────────────────────────── */}
      {activeTab === 'bp' && unitId && (
        <BalanceSheetPanel unitId={unitId} />
      )}

      {/* ── DRE tab ────────────────────────────────────────────────────────── */}
      {activeTab === 'dre' && unitId && (
        <IncomeStatementPanel unitId={unitId} />
      )}

      {/* ── DFC (fluxo de caixa) tab ───────────────────────────────────────── */}
      {activeTab === 'dfc' && unitId && (
        <DFCPanel unitId={unitId} />
      )}

      {/* ── Balancete comparativo tab ──────────────────────────────────────── */}
      {activeTab === 'comparativo' && unitId && (
        <PeriodComparisonPanel unitId={unitId} />
      )}

      {/* ── Livro Diário tab ───────────────────────────────────────────────── */}
      {activeTab === 'diario' && unitId && (
        <DailyJournalPanel unitId={unitId} />
      )}

      {/* ── Importação/Exportação tab ──────────────────────────────────────── */}
      {activeTab === 'importacao-exportacao' && unitId && (
        <ImportExportPanel unitId={unitId} onCommitSuccess={reload} />
      )}

      {/* ── Conciliação bancária tab ───────────────────────────────────────── */}
      {activeTab === 'conciliacao' && unitId && (
        <ReconciliationPanel unitId={unitId} onLedgerChange={reload} />
      )}

      {/* ── NF-e (compra → AP + estoque; venda → proveniência) tab — FE-INCR-NFE ─── */}
      {activeTab === 'nfe' && unitId && (
        <NfePanel
          unitId={unitId}
          onLedgerChange={reload}
          onNavigateTab={(tab, section) => {
            if (section) setFixedAssetsSection(section);
            setActiveTab(tab);
          }}
        />
      )}

      {/* ── Compliance (mapeamento referencial RFB + e-Lalur + geração SPED) tab ── */}
      {activeTab === 'compliance' && unitId && (
        governance ? (
          // Ramo próprio do modo cliente (item 8.2): SÓ a revisão. Um painel novo posto na pilha abaixo não vaza pra cá.
          <ReviewPanel key={contextKey} unitId={unitId} onNavigateTab={(tab) => setActiveTab(tab)} governance={governance} onAssignmentLost={leaveClient} />
        ) : (
          <div className="space-y-8">
            <CompliancePanel unitId={unitId} />
            <LalurPanel unitId={unitId} />
            <SpedGenerationPanel unitId={unitId} />
            <ReviewPanel unitId={unitId} onNavigateTab={(tab) => setActiveTab(tab)} />
            <AccountantAssignmentSection unitId={unitId} />
            <DeliveryPanel unitId={unitId} onNavigateTab={(tab) => setActiveTab(tab)} />
          </div>
        )
      )}

      {/* ── Dimensões (centro de custo / projeto) tab ──────────────────────── */}
      {activeTab === 'dimensoes' && unitId && (
        <DimensionsPanel unitId={unitId} />
      )}

      {/* ── Imobilizado (C8: bens / classes / taxas / contas) tab — FE-INCR-FIXED-ASSETS ─── */}
      {activeTab === 'imobilizado' && unitId && (
        <FixedAssetsPanel unitId={unitId} onLedgerChange={reload} onNavigateToPeriods={() => setActiveTab('periodos')} initialSection={fixedAssetsSection} />
      )}

      {/* ── Perfil fiscal (unidade + serviços) tab — FE-INCR-DFE PR-0 ─────── */}
      {activeTab === 'perfil-fiscal' && unitId && (
        <div className="space-y-8">
          <FiscalProfilePanel unitId={unitId} />
          <ServiceFiscalProfilesPanel unitId={unitId} />
        </div>
      )}

      {activeTab === 'parametros-legais' && unitId && <LegalParametersPanel />}

      {/* ── Política contábil (versões, diff, aprovar/rejeitar no modo cliente) — FE-INCR-ACCOUNTING-POLICY-VERSION ── */}
      {activeTab === 'politica' && unitId && (
        <PolicyVersionsPanel key={contextKey} unitId={unitId} governance={governance} onAssignmentLost={leaveClient} />
      )}

      {/* ── New Entry Modal ────────────────────────────────────────────────── */}
      <JournalEntryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        unitId={unitId}
        accounts={modalAccounts}
        dimensionCatalog={modalDimensionCatalog}
        onSuccess={() => {
          setIsModalOpen(false);
          void reload();
        }}
      />
    </div>
  );
}
