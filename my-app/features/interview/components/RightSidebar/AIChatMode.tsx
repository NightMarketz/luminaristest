import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { Button, Checkbox } from '@/components/ui';
import {
  InterviewApiError,
  InterviewService,
  type CustomizeFieldsChange,
  type CustomizeFieldsResult,
} from '@/lib/services/interview.service';
import type { CustomizeFieldsDtoInput } from '@/types/contracts/interview/CustomizeFields.dto.gen';
import { IAiMessage, ITable, ITableField } from '../../types/RightSidebarTypes';

interface AIChatModeProps {
  tableData: ITable;
  sessionId: string | null;
  onSaveChanges: (updatedTable: ITable) => void;
  onClose: () => void;
  /** W6 item 17: 404 `INTERVIEW_SESSION_NOT_FOUND` — a entrevista volta à escolha criar × customizar (F-W4-2 b). */
  onSessionLost?: () => void;
  presetKey: string | null;
}

type Proposal = NonNullable<CustomizeFieldsResult['proposal']>;
type Discarded = CustomizeFieldsResult['discarded'];

const DISCARD_REASON_KEY: Record<Discarded[number]['reason'], string> = {
  reserved: 'onboardingFieldsAiDiscardedReserved',
  type_not_allowed: 'onboardingFieldsAiDiscardedTypeNotAllowed',
  exists: 'onboardingFieldsAiDiscardedExists',
  not_found: 'onboardingFieldsAiDiscardedNotFound',
  invalid: 'onboardingFieldsAiDiscardedInvalid',
};

/** A pendente guardada na sessão volta como cartão; a ciência segue a regra do servidor (`FieldProposal.requiresSensitiveAck`). */
function toProposal(pending: ITable['pendingProposal']): Proposal | null {
  if (!pending) return null;
  const requiresSensitiveAck = pending.changes.some(c => c.action !== 'remove' && c.sensitiveCategory !== null);
  return { id: pending.id, changes: pending.changes, requiresSensitiveAck };
}

/** O conteúdo (fala do usuário e do modelo) é texto: escapa antes da formatação simples, que é a única marcação. */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** W6 item 14: a linha do histórico do servidor vira mensagem; `system` (decisão) é nota, não fala. */
function toMessage(entry: ITable['conversationHistory'][number]): IAiMessage {
  const role: IAiMessage['role'] = entry.role === 'user' || entry.role === 'assistant' ? entry.role : 'system';
  return { role, content: entry.content, ...(entry.at ? { timestamp: new Date(entry.at) } : {}) };
}

/**
 * Modo IA do painel de campos (W6, BRIEF WIZARD-W6 itens 13–18; ADR-W6). O turno `message` só traz uma proposta;
 * quem muda a tabela é o `decision:'apply'`, e a tabela que sobe é a que o servidor devolveu.
 */
function AIChatMode({ tableData, sessionId, onSaveChanges, onClose, onSessionLost }: AIChatModeProps) {
  const { t } = useTranslation('common');
  // Item 14: o histórico é o do servidor; o cliente só acrescenta notas locais de erro até a próxima resposta.
  const [history, setHistory] = useState<IAiMessage[]>(() => (tableData.conversationHistory ?? []).map(toMessage));
  const [notes, setNotes] = useState<IAiMessage[]>([]);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(() => toProposal(tableData.pendingProposal));
  const [discarded, setDiscarded] = useState<Discarded>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Rolar para o final da conversa quando novas mensagens chegarem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, notes, pendingMessage, proposal]);

  const applyResult = (data: CustomizeFieldsResult) => {
    setHistory(data.conversationHistory.map(toMessage));
    setNotes([]);
    setProposal(data.proposal);
    setDiscarded(data.discarded);
    setAcknowledged(false);
    // O hook guarda a tabela do servidor depois de todo turno: ao remontar, histórico e pendente são os da sessão.
    onSaveChanges(data.table);
  };

  const addNote = (content: string) => {
    setNotes(prev => [...prev, { role: 'system', content, timestamp: new Date(), isError: true }]);
  };

  /** Item 17: ramifica pelo `code` do corpo, não pelo status. */
  const handleError = (error: unknown, fallback: string) => {
    const code = error instanceof InterviewApiError ? error.body.code : undefined;
    if (code === 'INTERVIEW_SESSION_NOT_FOUND') {
      setProposal(null);
      addNote(t('onboardingFieldsAiSessionLost'));
      onSessionLost?.();
      return;
    }
    if (code === 'PROPOSAL_STALE') {
      setProposal(null);
      addNote(t('onboardingFieldsAiProposalStale'));
      return;
    }
    console.error('[AIChatMode] Falha no painel de campos:', error);
    addNote(fallback);
  };

  const handleSendMessage = async () => {
    const message = inputMessage.trim();
    if (!message || !sessionId) return;

    setInputMessage('');
    setPendingMessage(message);
    setIsSending(true);
    try {
      const body = { kind: 'message', sessionId, tableKey: tableData.key, message } satisfies CustomizeFieldsDtoInput;
      applyResult(await InterviewService.customizeFields(body));
    } catch (error) {
      handleError(error, t('onboardingFieldsAiSendFailed'));
    } finally {
      setPendingMessage(null);
      setIsSending(false);
    }
  };

  const handleDecision = async (decision: 'apply' | 'discard') => {
    if (!proposal || !sessionId) return;

    setIsSending(true);
    try {
      // Item 16: a ciência só vai quando a proposta tem campo sensível e a caixa foi marcada.
      const tableKey = tableData.key;
      const proposalId = proposal.id;
      const body: CustomizeFieldsDtoInput = decision === 'apply' && proposal.requiresSensitiveAck && acknowledged
        ? { kind: 'decision', sessionId, tableKey, proposalId, decision, acknowledgeSensitive: true }
        : { kind: 'decision', sessionId, tableKey, proposalId, decision };
      // Item 15: sobe a tabela que o servidor devolveu (no `applyResult`), não uma montada no cliente.
      applyResult(await InterviewService.customizeFields(body));
    } catch (error) {
      handleError(error, t('onboardingFieldsAiDecisionFailed'));
    } finally {
      setIsSending(false);
    }
  };

  const formatMessageContent = (content: string | undefined) => {
    if (!content) {
      return ''; // Retorna string vazia se o conteúdo for nulo ou indefinido
    }
    // Formatação simples para negrito e listas
    return escapeHtml(content)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/• (.*?)$/gm, '<li>$1</li>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
  };

  // Sem histórico no servidor, a conversa abre com as boas-vindas locais (não vão ao servidor).
  const intro: IAiMessage[] = history.length > 0 ? [] : [
    { role: 'system', content: t('onboardingFieldsAiWelcome') },
    { role: 'assistant', content: t('onboardingFieldsAiGreeting', { name: tableData.name }) },
  ];
  const pending: IAiMessage[] = pendingMessage ? [{ role: 'user', content: pendingMessage }] : [];
  const messages = [...intro, ...history, ...pending, ...notes];

  return (
    <div className="flex flex-col h-full">
      {/* Área de mensagens */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            data-testid="ai-message"
            data-role={message.role}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                message.role === 'assistant' ? 'bg-blue-100 dark:bg-blue-900 text-neutral-800 dark:text-neutral-100' :
                message.role === 'user' ? 'bg-blue-500 text-white' :
                'bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-100 text-xs italic w-full'
              }`}
            >
              <div
                dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                className="whitespace-pre-wrap"
              />

              {message.timestamp && (
                <div className="text-xs opacity-70 mt-1 text-right">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        ))}

        {discarded.length > 0 && (
          <div data-testid="ai-discarded" className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-3 text-xs text-neutral-700 dark:text-neutral-200">
            <p className="font-medium">{t('onboardingFieldsAiDiscardedTitle')}</p>
            <ul className="mt-1 list-disc pl-4">
              {discarded.map((d, i) => (
                <li key={`${d.name}-${i}`}>{d.name} — {t(DISCARD_REASON_KEY[d.reason])}</li>
              ))}
            </ul>
          </div>
        )}

        {proposal && (
          <ProposalCard
            proposal={proposal}
            currentFields={tableData.fields ?? []}
            acknowledged={acknowledged}
            onAcknowledge={setAcknowledged}
            disabled={isSending}
            onApply={() => handleDecision('apply')}
            onDiscard={() => handleDecision('discard')}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Área de entrada de mensagem */}
      <div className="border-t border-neutral-200 dark:border-neutral-700 p-4">
        <div className="flex space-x-2">
          <div className="flex-grow relative">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={t('onboardingFieldsAiInputPlaceholder')}
              className="w-full border border-neutral-300 dark:border-neutral-600 rounded-md p-3 pr-10 resize-none focus:ring-blue-500 focus:border-blue-500 dark:bg-neutral-700 dark:text-neutral-100"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <div className="absolute right-3 bottom-3 text-xs text-neutral-400">
              {t('onboardingFieldsAiEnterHint')}
            </div>
          </div>
          <button
            onClick={handleSendMessage}
            disabled={isSending || !inputMessage.trim() || !sessionId}
            className="ml-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed self-end"
          >
            {isSending ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-send-horizontal"><path d="m3 3 3 9-3 9 19-9Z"/><path d="M6 12h16"/></svg>
            )}
          </button>
        </div>

        {/* Dono, 20/10/2026: o antigo "Concluir conversa" só fecha o modo IA — aplicar é o botão da proposta. */}
        <Button variant="secondary" onClick={onClose} className="mt-4 w-full">
          {t('onboardingFieldsAiClose')}
        </Button>
      </div>
    </div>
  );
}

interface ProposalCardProps {
  proposal: Proposal;
  currentFields: ITableField[];
  acknowledged: boolean;
  onAcknowledge: (checked: boolean) => void;
  disabled: boolean;
  onApply: () => void;
  onDiscard: () => void;
}

/** W6 itens 15–16: o diff da proposta, o selo de dado sensível e a ciência que libera o Aplicar. */
function ProposalCard({ proposal, currentFields, acknowledged, onAcknowledge, disabled, onApply, onDiscard }: ProposalCardProps) {
  const { t } = useTranslation('common');
  const actionLabel: Record<CustomizeFieldsChange['action'], string> = {
    add: t('onboardingFieldsAiChangeAdd'),
    update: t('onboardingFieldsAiChangeUpdate'),
    remove: t('onboardingFieldsAiChangeRemove'),
  };

  return (
    <div data-testid="ai-proposal" className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-4 space-y-3">
      <h5 className="text-sm font-semibold text-neutral-900 dark:text-white">{t('onboardingFieldsAiProposalTitle')}</h5>
      <ul className="space-y-2">
        {proposal.changes.map((change, index) => {
          // Remoção não traz o campo: rótulo e tipo saem da tabela atual.
          const field = change.action === 'remove'
            ? currentFields.find(f => f.name === change.originalName) ?? { name: change.originalName, label: change.originalName, type: '' }
            : change.field;
          const sensitive = change.action !== 'remove' && change.sensitiveCategory !== null;
          return (
            <li key={`${change.action}-${field.name}-${index}`} data-testid="ai-proposal-change" className="text-sm text-neutral-800 dark:text-neutral-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:text-neutral-200">
                  {actionLabel[change.action]}
                </span>
                <span className="font-medium">{field.label}</span>
                {field.type && <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">{field.type}</span>}
                {sensitive && (
                  <span data-testid="ai-sensitive-badge" className="rounded-md bg-amber-100 dark:bg-amber-900 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-100">
                    {t('onboardingFieldsAiSensitiveBadge')}
                  </span>
                )}
              </div>
              {sensitive && (
                <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-300">{t('onboardingFieldsAiSensitiveNotice')}</p>
              )}
            </li>
          );
        })}
      </ul>
      {proposal.requiresSensitiveAck && (
        <Checkbox checked={acknowledged} onChange={onAcknowledge} label={t('onboardingFieldsAiSensitiveAck')} />
      )}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onDiscard} disabled={disabled}>
          {t('onboardingFieldsAiDiscard')}
        </Button>
        <Button onClick={onApply} disabled={disabled || (proposal.requiresSensitiveAck && !acknowledged)}>
          {t('onboardingFieldsAiApply')}
        </Button>
      </div>
    </div>
  );
}

export default AIChatMode;
