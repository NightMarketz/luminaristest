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
import { PaymentProviderPanel } from './components/PaymentProviderPanel';
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
import { TaxAssessmentPanel } from './components/TaxAssessmentPanel';
import { MeiEnquadramentoSection } from './components/MeiEnquadramentoSection';
import { PresumidoServicosSection } from './components/PresumidoServicosSection';
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
import { AccountingActivationBanner } from './components/AccountingActivationBanner';
import { ReconcilePendingPanel } from './components/ReconcilePendingPanel';
import { parseInventoryPurchaseSeed, type InventoryPurchaseSeed } from './lib/inventoryPurchaseLink';
import { AccountingKitTab } from './components/AccountingKitTab';
import { useUnitKit } from './hooks/useUnitKit';

export type Tab = 'balancete' | 'periodos' | 'lancamentos' | 'aprovacoes' | 'contas-a-pagar' | 'contas-a-receber' | 'aging' | 'fluxo-de-caixa-projetado' | 'contrapartes' | 'razao' | 'plano-de-contas' | 'bp' | 'dre' | 'dfc' | 'comparativo' | 'diario' | 'importacao-exportacao' | 'conciliacao' | 'cobranca' | 'nfe' | 'compliance' | 'dimensoes' | 'imobilizado' | 'perfil-fiscal' | 'parametros-legais' | 'politica' | 'apuracao' | 'pendencias' | 'kit';

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
  // FE-INCR-TAX-ASSESSMENT PR-1 (F-1 a, dono 08/10): aba "Apuração" — grade do ano X7 + X8, leitura + aviso.
  { id: 'apuracao',       labelKey: 'view.tabs.apuracao',       label: 'Apuração' },
  // BE-INCR-ONBOARDING-ACTIVATION item 18 (I5 PR-3, F-I5-4 a): pendências do reconcile da unidade, com "Re-varrer".
  // Fora do `DELEGATED_TABS` (o modo cliente não a vê até alguém decidir).
  { id: 'pendencias',     labelKey: 'view.tabs.pendencias',     label: 'Pendências' },
  // FE-INCR-PAYMENT-PROVIDER (F-FE-COB-1 a, dono 13/10): conta do provedor (Mercado Pago) — serve à cobrança (AR) E ao
  // relatório de liberações (Conciliação), por isso aba própria. Fora do `DELEGATED_TABS`.
  { id: 'cobranca',       labelKey: 'view.tabs.cobranca',       label: 'Cobrança' },
  // EMENDA-2 da LAC-B (F-KA-1 c, dono 16/10): kit de setor da unidade — só entra na barra quando a unidade TEM kit
  // (`useUnitKit` → `loaded`). Fora do `DELEGATED_TABS` (F-KA-6 a: o kit lido seria o do silo do contador).
  { id: 'kit',            labelKey: 'view.tabs.kit',            label: 'Kit de setor' },
];

/**
 * Abas do modo cliente (F-FE-GOV-1 b, BRIEF item 8.1): lista de PERMITIDAS, não de proibidas — uma aba nova
 * acrescentada ao `TABS` fica ESCONDIDA por padrão no modo cliente até alguém pô-la aqui de propósito.
 */
export const DELEGATED_TABS: readonly Tab[] = ['periodos', 'compliance', 'politica'];

/**
 * Aba Pendências (F-I5-4 a, I5 PR-3) — o link da faixa de ativação só existe quando ela estiver em `TABS`
 * (FE-INCR-BINDING-ACTIVATION-screen-brief item 8): o PR da tela pode entrar antes do I5 sem link quebrado.
 */
export const PENDENCIAS_TAB: Tab | undefined = TABS.find((tab) => (tab.id as string) === 'pendencias')?.id;

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

  // Deep link do MovementModal (Entrada+Compra): abre Contas a Pagar com a compra de estoque pré-preenchida.
  // Lido uma vez da URL; o painel captura como SEED ao montar e o efeito abaixo limpa (uso único).
  const [inventoryPurchaseSeed, setInventoryPurchaseSeed] = useState<InventoryPurchaseSeed | null>(() =>
    typeof window === 'undefined' ? null : parseInventoryPurchaseSeed(window.location.search),
  );

  // Kit de setor da unidade (EMENDA-2 da LAC-B, itens 3–4): decide se a aba "Kit de setor" existe; no modo cliente
  // não chama a rota (F-KA-6 a). `activationNonce` remonta a faixa de ativação depois de uma retomada (item 8);
  // `kitNonce` remonta a aba depois de ativar pela faixa (item 10) — a aba lê o kit pelo próprio hook.
  const unitKit = useUnitKit(unitId, { enabled: !governance && !!unitId });
  const kitTabVisible = !governance && unitKit.state === 'loaded';
  const [activationNonce, setActivationNonce] = useState(0);
  const [kitNonce, setKitNonce] = useState(0);

  const [rawTab, setRawTab] = useState<Tab>(() => (inventoryPurchaseSeed ? 'contas-a-pagar' : 'balancete'));
  // Allowlist por construção: no modo cliente nenhuma aba fora de `DELEGATED_TABS` chega a renderizar (item 8.1).
  // A aba "Kit de setor" sem kit carregado (outra unidade, erro) volta ao Balancete.
  const activeTab: Tab =
    governance && !DELEGATED_TABS.includes(rawTab) ? 'periodos' : rawTab === 'kit' && !kitTabVisible ? 'balancete' : rawTab;
  const setActiveTab = setRawTab;
  // Seção em que a aba Imobilizado abre — a NF-e aponta "Classes"/"Taxas"; volta a "Bens" ao sair da aba.
  const [fixedAssetsSection, setFixedAssetsSection] = useState<FixedAssetsSectionId>('bens');
  useEffect(() => { if (activeTab !== 'imobilizado') setFixedAssetsSection('bens'); }, [activeTab]);
  // Ano em que o enquadramento MEI abre — o atalho da aba Apuração aponta o ano (FE-INCR-SIMPLES item 8).
  const [meiAno, setMeiAno] = useState<number | undefined>(undefined);
  // Folha em que a Conciliação abre — o atalho "Ver extratos e baixas" da aba Cobrança (FE-INCR-PAYMENT-PROVIDER
  // item 24). Volta a `undefined` (primeira folha) ao sair da aba.
  const [reconGlAccountId, setReconGlAccountId] = useState<string | undefined>(undefined);
  useEffect(() => { if (activeTab !== 'conciliacao') setReconGlAccountId(undefined); }, [activeTab]);
  const visibleTabs = governance
    ? TABS.filter((tab) => DELEGATED_TABS.includes(tab.id))
    : TABS.filter((tab) => tab.id !== 'kit' || kitTabVisible);

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

  // EMENDA-1 16b: link do título na lista global de cobranças → AR filtrado pelo nº com o drawer aberto (seed de uso
  // único, mesmo consumo do `pendingCounterpartyFilter`).
  const [pendingChargesSeed, setPendingChargesSeed] = useState<{ receivableId: string; documentNumber: string | null } | null>(null);
  useEffect(() => {
    if (pendingChargesSeed) setPendingChargesSeed(null);
  }, [pendingChargesSeed]);

  useEffect(() => {
    if (!pendingCounterpartyFilter) return;
    // O painel-alvo já capturou o valor como SEED no mesmo commit (useState lazy initializer
    // roda durante o render, antes de qualquer efeito) — consumo de uso único.
    setPendingCounterpartyFilter(null);
  }, [pendingCounterpartyFilter]);

  useEffect(() => {
    // Só depois que o painel montou (precisa do unitId): até lá o SEED ainda não foi capturado.
    if (!inventoryPurchaseSeed || !unitId || activeTab !== 'contas-a-pagar') return;
    setInventoryPurchaseSeed(null);
    window.history.replaceState(window.history.state, '', window.location.pathname);
  }, [inventoryPurchaseSeed, unitId, activeTab]);

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

      {/* ── Ativação da contabilidade (LAC-B, F-BA-1 a): só livro próprio — no modo cliente a ativação gravaria no silo
           do chamador, não no do cliente (item 4). `key` remonta por unidade. ── */}
      {!governance && unitId && (
        <AccountingActivationBanner
          key={`${unitId}-${activationNonce}`}
          unitId={unitId}
          onNavigateToPeriods={() => setActiveTab('periodos')}
          onNavigateToPendencias={PENDENCIAS_TAB ? () => setActiveTab(PENDENCIAS_TAB) : undefined}
          onActivated={() => {
            unitKit.reload();
            setKitNonce((n) => n + 1);
          }}
        />
      )}

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
          initialInventoryPurchase={inventoryPurchaseSeed ?? undefined}
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
          onNavigateToCobranca={() => setActiveTab('cobranca')}
          // F-AGING-5(b): mesmo SEED de uso único do lado de Contas a Receber.
          initialFilters={
            pendingCounterpartyFilter?.target === 'contas-a-receber'
              ? { counterpartyId: pendingCounterpartyFilter.counterpartyId }
              : pendingChargesSeed?.documentNumber
                ? { q: pendingChargesSeed.documentNumber }
                : undefined
          }
          initialChargesReceivableId={pendingChargesSeed?.receivableId}
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
        <ReconciliationPanel key={reconGlAccountId ?? 'first'} unitId={unitId} onLedgerChange={reload} initialGlAccountId={reconGlAccountId} />
      )}

      {/* ── Cobrança (conta do provedor de pagamento) tab — FE-INCR-PAYMENT-PROVIDER PR-1 ── */}
      {activeTab === 'cobranca' && unitId && (
        <PaymentProviderPanel
          key={unitId}
          unitId={unitId}
          onOpenReconciliation={(glAccountId) => {
            setReconGlAccountId(glAccountId);
            setActiveTab('conciliacao');
          }}
          onOpenReceivable={(receivableId, documentNumber) => {
            setPendingChargesSeed({ receivableId, documentNumber });
            setActiveTab('contas-a-receber');
          }}
        />
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
          <MeiEnquadramentoSection unitId={unitId} anoInicial={meiAno} />
          <PresumidoServicosSection unitId={unitId} />
          <ServiceFiscalProfilesPanel unitId={unitId} />
        </div>
      )}

      {activeTab === 'parametros-legais' && unitId && <LegalParametersPanel />}

      {/* ── Política contábil (versões, diff, aprovar/rejeitar no modo cliente) — FE-INCR-ACCOUNTING-POLICY-VERSION ── */}
      {activeTab === 'politica' && unitId && (
        <PolicyVersionsPanel key={contextKey} unitId={unitId} governance={governance} onAssignmentLost={leaveClient} />
      )}

      {/* ── Apuração (IRPJ/CSLL + PIS/Cofins) tab — FE-INCR-TAX-ASSESSMENT PR-1 ── */}
      {activeTab === 'apuracao' && unitId && (
        <TaxAssessmentPanel unitId={unitId} onIrParaEnquadramentoMei={(ano) => { setMeiAno(ano); setActiveTab('perfil-fiscal'); }} />
      )}

      {activeTab === 'pendencias' && unitId && <ReconcilePendingPanel key={`pendencias-${unitId}`} unitId={unitId} />}

      {/* ── Kit de setor (EMENDA-2 da LAC-B, F-KA-1 c) ─────────────────────── */}
      {activeTab === 'kit' && unitId && (
        <AccountingKitTab
          key={`kit-${unitId}-${kitNonce}`}
          unitId={unitId}
          onActivationChanged={() => {
            unitKit.reload();
            setActivationNonce((n) => n + 1);
          }}
        />
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
