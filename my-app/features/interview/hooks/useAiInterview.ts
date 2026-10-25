import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { IMessage, ICustomizationState, ICreationChoicePrompt, CreationChoice, ICreationError, InterviewModuleOption, ModuleKey } from '../types/InterviewTypes';
import { ITable } from '../types/RightSidebarTypes';
import { SetupApiError, SetupService, type CreateDashboardPayload, type CreateDashboardResult } from '../../../lib/services/setup.service';
import { InterviewApiError, InterviewService } from '@/lib/services/interview.service';
import { notifyAccountingDraft } from '../setup/accountingDraftNotice';
import { classifyCreationError } from '../setup/classifyCreationError';
import { creationErrorMessage } from '../setup/creationErrorMessage';
import { toggleModuleSelection } from '../setup/moduleSelection';
import type { OnboardingFiscalInput } from '@/types/contracts/accounting/CompanyFiscalProfileDto.gen';
import type { ChatInterviewInput } from '@/types/contracts/interview/ChatInterviewDto.gen';
import type { CustomCreationDraftInput } from '@/types/contracts/interview/CustomCreationDraft.dto.gen';
import type { InterviewModulesInput } from '@/types/contracts/interview/InterviewModules.dto.gen';

/**
 * BE-INCR-ONBOARDING-FIRST-UNIT (I1, BRIEF item 5): na Entrevista o nome da primeira unidade vem do `SUMMARY:` que a IA
 * escreve ao fechar a descoberta (o texto depois do marcador, até 120 caracteres — limite do DTO); sem ele, a chave do
 * preset. O nome é editável depois, na tabela `units`.
 */
export function nomeDaUnidadeDaEntrevista(conversa: IMessage[], presetKey: string): string {
  for (let i = conversa.length - 1; i >= 0; i -= 1) {
    const m = conversa[i];
    const idx = m.sender === 'ai' ? m.text.indexOf('SUMMARY:') : -1;
    if (idx >= 0) {
      const resumo = m.text.slice(idx + 'SUMMARY:'.length).trim().slice(0, 120).trim();
      if (resumo) return resumo;
    }
  }
  return presetKey;
}

/** X13 PR-3 item 20: resposta da pergunta fechada de regime/porte — contrato gerado de `OnboardingFiscalSchema` (nunca espelho à mão). */
export type FiscalOnboarding = OnboardingFiscalInput;
export type RegimeOnboarding = OnboardingFiscalInput['regime'];

/** Reply of POST /dashboard/ai/ChatInterview as this hook reads it. */
interface ChatInterviewReply {
  response: string;
  nextStage: string;
  presetKey?: string;
  sessionId?: string;
  startCustomization?: boolean;
  customizationState?: ICustomizationState;
  choicePrompt?: ICreationChoicePrompt | null;
  moduleOptions?: InterviewModuleOption[];
  /** W1 (F-W1-2 a): só no fim da customização (COMPLETED) — o servidor consolidou a sessão. */
  creation?: CustomCreationDraft;
}

/** W1 item 6: o `creation` do turno `done` (contrato gerado de `CustomCreationDraftSchema`). */
export type CustomCreationDraft = CustomCreationDraftInput;

/** W1 itens 6–8: o pedido de criação inteiro — sem `creation` é o caminho quick de antes. */
interface CreateRequest {
  key: string;
  conversa: IMessage[];
  fiscal: FiscalOnboarding;
  modules: ModuleKey[];
  creation?: CustomCreationDraft;
}

/** W1 itens 6–7: body do create — custom com o `creation` do servidor, ou quick (inalterado). */
export function createDashboardBody(req: CreateRequest): CreateDashboardPayload {
  const unit = { name: nomeDaUnidadeDaEntrevista(req.conversa, req.key) };
  const { creation } = req;
  if (!creation) return { suiteKey: req.key, unit, fiscal: req.fiscal, modules: req.modules };
  return {
    mode: 'custom',
    presetKey: creation.presetKey,
    removedTables: creation.removedTables,
    addedFields: creation.addedFields,
    addedTables: creation.addedTables,
    unit,
    fiscal: req.fiscal,
    modules: req.modules,
  };
}

export function useAiInterview() {
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<string>('GREETING');
  const [presetKey, setPresetKey] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState<ICreationError | null>(null);
  // W7 item 3 (F-W7-2 a): o último pedido de criação — o retry o reenvia igual, sem recarregar a página.
  // W1 item 8: guarda o pedido INTEIRO (inclusive o `creation` do custom), não só a chave.
  const lastCreateRequest = useRef<CreateRequest | null>(null);
  // X13 PR-3 item 20: a entrevista terminou; falta a pergunta fechada de regime/porte antes do create.
  const [fiscalPendente, setFiscalPendente] = useState<Omit<CreateRequest, 'fiscal' | 'modules'> | null>(null);
  // W1 (F-W1-6 a + sincronização): trava enquanto a sessão regrava os módulos.
  const [isSyncingModules, setIsSyncingModules] = useState(false);
  // W3 FE item 7: o servidor pede os botões criar × customizar (`choicePrompt` do último turno).
  const [choicePrompt, setChoicePrompt] = useState<ICreationChoicePrompt | null>(null);
  // W5 item 14 (FE-INCR-W5-MODULES): módulos do turno MATCHING_PRESET e a seleção (começa pelos `suggested`).
  const [moduleOptions, setModuleOptions] = useState<InterviewModuleOption[]>([]);
  const [selectedModules, setSelectedModules] = useState<ModuleKey[]>([]);
  // W3 FE item 12: trava síncrona — `isLoading` só muda no próximo render, então dois cliques rápidos passariam.
  const choiceInFlight = useRef(false);
  const [customizationState, setCustomizationState] = useState<ICustomizationState | null>(null);
  const [showCustomizationPanel, setShowCustomizationPanel] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [selectedTable, setSelectedTable] = useState<ITable | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { t } = useTranslation('common');

  useEffect(() => {
    // W7 item 1: o cleanup aborta a saudação da 1ª montagem do StrictMode (e a de quem sai antes da resposta) —
    // uma chamada ao modelo por montagem viva, nunca duas.
    const controller = new AbortController();
    async function fetchInitialMessage() {
      setIsLoading(true);
      try {
        const data = await InterviewService.chatInterview<Pick<ChatInterviewReply, 'nextStage'> & { response?: string }>({ messages: [], stage: 'GREETING' }, controller.signal);
        if (controller.signal.aborted) return;
        if (data.response) {
          setMessages([{ sender: 'ai', text: data.response }]);
          setCurrentStage(data.nextStage);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        // Resposta não-OK: o corpo de erro não traz `response`, então nada aparece — como quando o fetch não checava `ok`.
        if (error instanceof InterviewApiError && error.status !== undefined) return;
        console.error('Failed to fetch initial message:', error);
        setMessages([{ sender: 'ai', text: t('onboardingGreetingFailed') }]);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }
    fetchInitialMessage();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);

  async function handleCreateSystem(req: CreateRequest) {
    lastCreateRequest.current = req;
    setIsCreating(true);
    setCreationError(null);
    try {
      // W5 item 16: os módulos escolhidos na entrevista vão no create (somados ao padrão da suíte no servidor).
      // W1 item 6: com `creation`, o create é custom com o que a customização decidiu.
      const body = createDashboardBody(req);
      let created: CreateDashboardResult;
      try {
        // `silent`: a falha aparece no `creationError` (com retry), não num toast.
        created = await SetupService.createDashboard(body, { silent: true });
      } catch (err) {
        if (err instanceof SetupApiError && err.status !== undefined) {
          // Corpo de erro como o servidor mandou (vazio ou não-JSON ⇒ `{}` ⇒ fallback traduzido, W7 item 7).
          const errorData = {
            error: typeof err.body.error === 'string' ? err.body.error : undefined,
            errorCode: typeof err.body.errorCode === 'string' ? err.body.errorCode : undefined,
          };
          // W1 item 10: 400 com motivo conhecido (módulo, trava, campo, tabela nova) → texto traduzido.
          const known = err.status === 400 ? creationErrorMessage(err.body) : null;
          setCreationError({
            kind: classifyCreationError(err.status, errorData),
            message: known ? t(known.key, known.params) : errorData.error || t('onboardingErrorCreateFailed'),
          });
        } else {
          // W7 item 4: falha de rede — o pedido pode ser reenviado (o 403 one-shot barra a criação dupla).
          setCreationError({ kind: classifyCreationError(null, null), message: (err instanceof Error && err.message) || t('onboardingErrorUnexpected') });
        }
        setIsCreating(false);
        return;
      }
      // I4 PR-4 (item 21): contabilidade `Draft` ⇒ aviso que não bloqueia, antes de navegar.
      notifyAccountingDraft(created.accounting, t);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err) {
      setCreationError({ kind: 'retryable', message: (err instanceof Error ? err.message : String(err)) || t('onboardingErrorUnexpected') });
      setIsCreating(false);
    }
  }

  /**
   * W4 PR-2 (BRIEF item 13): a sessão expirou, sumiu ou não é do usuário — descarta a sessão local e volta à escolha
   * criar × customizar do mesmo preset (botões do W3, `reason: 'error'`); sem preset, volta à descoberta do negócio.
   */
  function handleSessionLost() {
    setSessionId(null);
    setCustomizationState(null);
    setShowCustomizationPanel(false);
    // Revisão do #785 (dono, 21/10): o painel de campos fecha junto — a tabela dele era da sessão que sumiu.
    setShowRightPanel(false);
    setSelectedTable(null);
    setMessages(prev => [...prev, { sender: 'ai', text: t('onboardingSessionExpired') }]);
    if (presetKey) {
      setCurrentStage('AWAITING_CREATION_TYPE_CONFIRMATION');
      setChoicePrompt({ kind: 'creation_type', reason: 'error' });
    } else {
      setCurrentStage('DISCOVERING_BUSINESS');
      setChoicePrompt(null);
    }
  }

  /** Posta um turno da entrevista; `choice` (W3 item 8/9) decide o estágio de criação sem ler o texto. */
  async function postTurn(newMessages: IMessage[], choice?: CreationChoice) {
    setIsLoading(true);

    try {
      let result: ChatInterviewReply;
      try {
        // W4: `ChatInterviewSchema` é `.strict()` — o corpo é tipado pelo contrato gerado (chave extra = 400).
        result = await InterviewService.chatInterview<ChatInterviewReply>({
          messages: newMessages,
          stage: currentStage,
          // `ChatInterviewSchema` aceita string ou ausente, nunca null (400) — omite o que ainda não existe.
          ...(presetKey ? { presetKey } : {}),
          ...(sessionId ? { sessionId } : {}),
          ...(choice ? { choice } : {}),
          // W1 (F-W1-6 a): a sessão de customização nasce com os módulos marcados.
          ...(choice === 'customize' && selectedModules.length > 0 ? { modules: selectedModules } : {})
        } satisfies ChatInterviewInput);
      } catch (requestError) {
        if (!(requestError instanceof InterviewApiError) || requestError.status === undefined) throw requestError;
        // W4 PR-2: a sessão de customização tem dono e TTL no servidor — 404/409 com code próprio não são "erro de comunicação".
        const code = requestError.body.code;
        if (requestError.status === 404 && code === 'INTERVIEW_SESSION_NOT_FOUND') {
          handleSessionLost();
          return;
        }
        if (requestError.status === 409 && code === 'INTERVIEW_SESSION_CONFLICT') {
          // Outra aba gravou a sessão: nada muda aqui (mensagens, estágio, sessionId, painel); o usuário reenvia.
          setMessages(prev => [...prev, { sender: 'ai', text: t('onboardingSessionConflict') }]);
          return;
        }
        throw new Error('Failed to get response from AI');
      }

      const { response: aiResponse, nextStage, presetKey: newPresetKey, sessionId: newSessionId, startCustomization, customizationState: newCustomizationState, choicePrompt: newChoicePrompt } = result;

      setMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
      setCurrentStage(nextStage);
      setChoicePrompt(newChoicePrompt ?? null);

      // W5 item 14: o turno do match traz `moduleOptions`; outro preset sem opções zera o que era do anterior.
      const newModuleOptions = result.moduleOptions;
      if (newModuleOptions) {
        setModuleOptions(newModuleOptions);
        setSelectedModules(newModuleOptions.filter((o) => o.suggested).map((o) => o.key));
      } else if (newPresetKey && newPresetKey !== presetKey) {
        setModuleOptions([]);
        setSelectedModules([]);
      }

      if (newPresetKey) {
        setPresetKey(newPresetKey);
      }
      
      if (newSessionId) {
        setSessionId(newSessionId);
      }
      
      if (newCustomizationState) {
        setCustomizationState(newCustomizationState);
        setShowCustomizationPanel(true);
        // W1: a sessão é a verdade dos módulos (a conversa pode ter tirado um módulo inteiro — F-W1-5 a).
        if (newCustomizationState.modules) setSelectedModules(newCustomizationState.modules);
      }

      if (nextStage === 'COMPLETED' && (newPresetKey || presetKey)) {
        if (!startCustomization) {
          // X13 PR-3 item 20: regime/porte vêm de pergunta FECHADA ao usuário — o modelo não os infere da conversa.
          // W1 item 6: o fim da customização traz `creation`; sem ele segue o caminho quick.
          setFiscalPendente({
            key: newPresetKey || presetKey!,
            conversa: [...newMessages, { sender: 'ai', text: aiResponse }],
            ...(result.creation ? { creation: result.creation } : {}),
          });
        }
      }

    } catch (error) {
      console.error('Failed to get response from AI:', error);
      setMessages(prev => [...prev, { sender: 'ai', text: t('onboardingTurnFailed') }]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendMessage() {
    if (userInput.trim() === '' || isLoading || isCreating) return;

    const userMessage: IMessage = { sender: 'user', text: userInput };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setUserInput('');
    await postTurn(newMessages);
  }

  /** W3 FE (itens 8–9, 12): clique nos botões criar × customizar — envia `choice` no corpo, uma vez por vez. */
  async function sendCreationChoice(choice: CreationChoice) {
    if (choiceInFlight.current || isLoading || isCreating) return;
    choiceInFlight.current = true;
    try {
      await postTurn(messages, choice);
    } finally {
      choiceInFlight.current = false;
    }
  }

  const handleSelectTable = (table: ITable) => {
    const tableWithKeysAndFields = {
      ...table,
      // Ensure key property exists, using name as fallback if needed
      key: table.key || table.name,
      fields: table.fields || []
    };
    setSelectedTable(tableWithKeysAndFields);
    setShowRightPanel(true);
  };

  const handleUpdateTable = (updatedTable: ITable) => {
    if (!customizationState) return;

    // Ensure the updatedTable has all required properties including key
    // If key doesn't exist, use the name as a fallback
    const tableWithKey = {
      ...updatedTable,
      key: updatedTable.key || updatedTable.name
    };

    const updatedTables = customizationState.tables.map(table => 
      table.name === tableWithKey.name ? tableWithKey : table
    );

    setCustomizationState({
      ...customizationState,
      tables: updatedTables
    });

    setSelectedTable(tableWithKey);
  };

  /** X13 PR-3 item 20: o usuário respondeu regime/porte (ou "não sei") — agora sim o sistema é criado. */
  function confirmarFiscal(fiscal: FiscalOnboarding) {
    if (!fiscalPendente) return;
    setFiscalPendente(null);
    void handleCreateSystem({ ...fiscalPendente, fiscal, modules: selectedModules });
  }

  /** W7 item 3 (F-W7-2 a): reenvia o último pedido de criação, igual — nunca recarrega a página (perderia a conversa). */
  const handleRetry = () => {
    const last = lastCreateRequest.current;
    if (!last || isCreating) return;
    void handleCreateSystem(last);
  };

  /** W7 item 5: fecha o erro e devolve a pergunta fiscal do pedido que falhou; a conversa fica como estava. */
  const backToConversation = () => {
    const last = lastCreateRequest.current;
    setCreationError(null);
    setIsCreating(false);
    if (last) setFiscalPendente({ key: last.key, conversa: last.conversa, ...(last.creation ? { creation: last.creation } : {}) });
  };

  /**
   * W5 item 15: marca/desmarca um módulo, fechando pelas dependências; travado não muda.
   * W1 (F-W1-6 a + sincronização, dono 2026-10-24): com a sessão de customização aberta, a sessão regrava as tabelas
   * dos módulos e a seleção passa a ser a que o servidor devolveu.
   */
  const toggleModule = (key: ModuleKey) => {
    const next = toggleModuleSelection(moduleOptions, selectedModules, key);
    if (!sessionId || !customizationState) {
      setSelectedModules(next);
      return;
    }
    if (isSyncingModules || next === selectedModules) return;
    void syncModules(sessionId, next);
  };

  async function syncModules(id: string, modules: ModuleKey[]) {
    setIsSyncingModules(true);
    try {
      const data = await InterviewService.interviewModules<{ customizationState: ICustomizationState }>(
        { sessionId: id, modules } satisfies InterviewModulesInput,
      );
      setCustomizationState(data.customizationState);
      setSelectedModules(data.customizationState.modules ?? modules);
    } catch (error) {
      const code = error instanceof InterviewApiError ? error.body.code : undefined;
      if (error instanceof InterviewApiError && error.status === 404 && code === 'INTERVIEW_SESSION_NOT_FOUND') {
        handleSessionLost();
      } else if (error instanceof InterviewApiError && error.status === 409 && code === 'INTERVIEW_SESSION_CONFLICT') {
        setMessages(prev => [...prev, { sender: 'ai', text: t('onboardingSessionConflict') }]);
      } else {
        console.error('Failed to sync interview modules:', error);
        setMessages(prev => [...prev, { sender: 'ai', text: t('onboardingModulesSyncFailed') }]);
      }
    } finally {
      setIsSyncingModules(false);
    }
  }

  return {
    messages,
    userInput,
    setUserInput,
    isLoading,
    isCreating,
    creationError,
    customizationState,
    showCustomizationPanel,
    setShowCustomizationPanel,
    showRightPanel,
    setShowRightPanel,
    selectedTable,
    chatEndRef,
    inputRef,
    sessionId,
    handleSendMessage,
    handleSelectTable,
    handleUpdateTable,
    handleSessionLost,
    handleRetry,
    backToConversation,
    presetKey,
    choicePrompt,
    sendCreationChoice,
    fiscalPendente: fiscalPendente !== null,
    confirmarFiscal,
    moduleOptions,
    selectedModules,
    toggleModule,
    isSyncingModules
  };
}
