import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { getCookie } from 'cookies-next';
import { useTranslation } from 'next-i18next';
import { IMessage, ICustomizationState, ICreationChoicePrompt, CreationChoice, ICreationError, InterviewModuleOption, ModuleKey } from '../types/InterviewTypes';
import { ITable } from '../types/RightSidebarTypes';
import type { CreateDashboardPayload, CreateDashboardResult } from '../../../lib/services/setup.service';
import { notifyAccountingDraft } from '../setup/accountingDraftNotice';
import { classifyCreationError } from '../setup/classifyCreationError';
import { toggleModuleSelection } from '../setup/moduleSelection';
import type { OnboardingFiscalInput } from '@/types/contracts/accounting/CompanyFiscalProfileDto.gen';

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
  const lastCreateRequest = useRef<{ key: string; conversa: IMessage[]; fiscal: FiscalOnboarding; modules: ModuleKey[] } | null>(null);
  // X13 PR-3 item 20: a entrevista terminou; falta a pergunta fechada de regime/porte antes do create.
  const [fiscalPendente, setFiscalPendente] = useState<{ key: string; conversa: IMessage[] } | null>(null);
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
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/dashboard/ai/ChatInterview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getCookie('auth_token')}` },
          body: JSON.stringify({ messages: [], stage: 'GREETING' }),
          signal: controller.signal
        });
        const data = await response.json();
        if (controller.signal.aborted) return;
        if (data.response) {
          setMessages([{ sender: 'ai', text: data.response }]);
          setCurrentStage(data.nextStage);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
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

  async function handleCreateSystem(key: string, conversa: IMessage[], fiscal: FiscalOnboarding, modules: ModuleKey[]) {
    lastCreateRequest.current = { key, conversa, fiscal, modules };
    setIsCreating(true);
    setCreationError(null);
    try {
      const token = getCookie('auth_token');
      // W5 item 16: os módulos escolhidos na entrevista vão no create (somados ao padrão da suíte no servidor).
      const body: CreateDashboardPayload = { suiteKey: key, unit: { name: nomeDaUnidadeDaEntrevista(conversa, key) }, fiscal, modules };
      let response: Response;
      try {
        response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/dashboard/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
      } catch (err) {
        // W7 item 4: falha de rede — o pedido pode ser reenviado (o 403 one-shot barra a criação dupla).
        setCreationError({ kind: classifyCreationError(null, null), message: (err instanceof Error && err.message) || t('onboardingErrorUnexpected') });
        setIsCreating(false);
        return;
      }

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as { error?: string; errorCode?: string } | null;
        setCreationError({
          kind: classifyCreationError(response.status, errorData),
          message: errorData?.error || t('onboardingErrorCreateFailed'),
        });
        setIsCreating(false);
        return;
      }
      // I4 PR-4 (item 21): contabilidade `Draft` ⇒ aviso que não bloqueia, antes de navegar.
      const created = (await response.json().catch(() => ({}))) as { data?: CreateDashboardResult };
      notifyAccountingDraft(created.data?.accounting, t);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err) {
      setCreationError({ kind: 'retryable', message: (err instanceof Error ? err.message : String(err)) || t('onboardingErrorUnexpected') });
      setIsCreating(false);
    }
  }

  /** Posta um turno da entrevista; `choice` (W3 item 8/9) decide o estágio de criação sem ler o texto. */
  async function postTurn(newMessages: IMessage[], choice?: CreationChoice) {
    setIsLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/dashboard/ai/ChatInterview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getCookie('auth_token')}` },
        body: JSON.stringify({ 
          messages: newMessages, 
          stage: currentStage, 
          // `ChatInterviewSchema` aceita string ou ausente, nunca null (400) — omite o que ainda não existe.
          ...(presetKey ? { presetKey } : {}),
          ...(sessionId ? { sessionId } : {}),
          ...(choice ? { choice } : {})
        })
      });

      if (!response.ok) throw new Error('Failed to get response from AI');

      const result = await response.json();
      const { response: aiResponse, nextStage, presetKey: newPresetKey, sessionId: newSessionId, startCustomization, customizationState: newCustomizationState, choicePrompt: newChoicePrompt } = result;

      setMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
      setCurrentStage(nextStage);
      setChoicePrompt(newChoicePrompt ?? null);

      // W5 item 14: o turno do match traz `moduleOptions`; outro preset sem opções zera o que era do anterior.
      const newModuleOptions = result.moduleOptions as InterviewModuleOption[] | undefined;
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
      }

      if (nextStage === 'COMPLETED' && (newPresetKey || presetKey)) {
        if (!startCustomization) {
          // X13 PR-3 item 20: regime/porte vêm de pergunta FECHADA ao usuário — o modelo não os infere da conversa.
          setFiscalPendente({ key: newPresetKey || presetKey!, conversa: [...newMessages, { sender: 'ai', text: aiResponse }] });
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
    const { key, conversa } = fiscalPendente;
    setFiscalPendente(null);
    void handleCreateSystem(key, conversa, fiscal, selectedModules);
  }

  /** W7 item 3 (F-W7-2 a): reenvia o último pedido de criação, igual — nunca recarrega a página (perderia a conversa). */
  const handleRetry = () => {
    const last = lastCreateRequest.current;
    if (!last || isCreating) return;
    void handleCreateSystem(last.key, last.conversa, last.fiscal, last.modules);
  };

  /** W7 item 5: fecha o erro e devolve a pergunta fiscal do pedido que falhou; a conversa fica como estava. */
  const backToConversation = () => {
    const last = lastCreateRequest.current;
    setCreationError(null);
    setIsCreating(false);
    if (last) setFiscalPendente({ key: last.key, conversa: last.conversa });
  };

  /** W5 item 15: marca/desmarca um módulo, fechando pelas dependências; travado não muda. */
  const toggleModule = (key: ModuleKey) => {
    setSelectedModules((prev) => toggleModuleSelection(moduleOptions, prev, key));
  };

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
    handleRetry,
    backToConversation,
    presetKey,
    choicePrompt,
    sendCreationChoice,
    fiscalPendente: fiscalPendente !== null,
    confirmarFiscal,
    moduleOptions,
    selectedModules,
    toggleModule
  };
}
