import React, { useState, useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { Checkbox } from '@/components/ui';
import { InterviewApiError, InterviewService } from '@/lib/services/interview.service';
import { nonEmpty } from '@/lib/utils/nonEmpty';
import type { CustomizeFieldsDtoInput } from '@/types/contracts/interview/CustomizeFields.dto.gen';
import { ITable, ITableField, RightSidebarProps, InteractionMode } from '../../types/RightSidebarTypes';
import FieldList from './FieldList';
import NewFieldForm from './NewFieldForm';
import AIChatMode from './AIChatMode';
import { diffManualChanges, fromFormType } from './manualChanges';

/** Motivos do 400 `MANUAL_CHANGE_INVALID` (BRIEF WIZARD-W6-MANUAL-SESSION §2.2) → chave de texto. */
const MANUAL_REASON_KEY: Record<string, string> = {
  reserved: 'onboardingFieldsAiDiscardedReserved',
  exists: 'onboardingFieldsAiDiscardedExists',
  not_found: 'onboardingFieldsAiDiscardedNotFound',
  duplicate: 'onboardingFieldsManualDuplicate',
  required_hidden: 'onboardingFieldsManualRequiredHidden',
  invalid: 'onboardingFieldsAiDiscardedInvalid',
};

/** `details.changes` do 400, lido sem confiar na forma. */
function manualIssues(body: Record<string, unknown>): Array<{ name: string; reason: string }> {
  const details = body.details;
  if (typeof details !== 'object' || details === null || !('changes' in details) || !Array.isArray(details.changes)) return [];
  return details.changes.flatMap((c: unknown) =>
    typeof c === 'object' && c !== null && 'name' in c && 'reason' in c && typeof c.name === 'string' && typeof c.reason === 'string'
      ? [{ name: c.name, reason: c.reason }]
      : [],
  );
}

/**
 * Painel lateral direito para customização de campos das tabelas
 */
function RightSidebar({ selectedTable, isVisible, sessionId, onUpdateTable, onSessionLost }: RightSidebarProps) {
  const { t } = useTranslation('common');
  const [tableData, setTableData] = useState<ITable | null>(selectedTable);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  // Revisão do #786: o servidor decide quais campos pedem a ciência (`details.fields` do 400).
  const [sensitiveNames, setSensitiveNames] = useState<string[]>([]);
  const [showNewFieldForm, setShowNewFieldForm] = useState<boolean>(false);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('manual');
  const [newField, setNewField] = useState<ITableField>({
    name: '',
    label: '',
    type: 'string',
    required: false
  });

  // Limpar o formulário de novo campo quando mudar de tabela
  useEffect(() => {
    setShowNewFieldForm(false);
    setNewField({
      name: '',
      label: '',
      type: 'string',
      required: false
    });
  }, [selectedTable]);

  // Atualizamos o estado local quando o selectedTable mudar
  useEffect(() => {
    console.log("RightSidebar: selectedTable changed:", selectedTable?.name || "null");
    console.log("RightSidebar: isVisible=", isVisible);
    
    // Log detalhado da tabela selecionada para debug
    if (selectedTable) {
      console.log("RightSidebar: Detalhes da tabela:", {
        name: selectedTable.name,
        hasFields: Boolean(selectedTable.fields),
        fieldsCount: selectedTable.fields?.length || 0,
        isCore: selectedTable.isCore
      });
      
      // Log dos campos da tabela, se existirem
      if (selectedTable.fields && selectedTable.fields.length > 0) {
        console.log("RightSidebar: Campos da tabela:", selectedTable.fields);
      } else {
        console.log("RightSidebar: A tabela não possui campos definidos.");
      }
    }
    
    setTableData(selectedTable);

    // Definir um timeout para forçar rerender após 100ms
    setTimeout(() => {
      console.log("RightSidebar: Estado atualizado após timeout");
    }, 100);
    // W6 (revisão do #785): só ao trocar de TABELA ou de visibilidade. A sincronização do modo IA atualiza a mesma
    // tabela no hook e não pode apagar a edição manual ainda não salva da cópia local.
  }, [selectedTable?.key, isVisible]);

  // Limpa mensagem de salvamento, erro e ciência ao mudar de TABELA — não quando o hook devolve a mesma tabela
  // gravada (W6 emenda: o Salvar sobe a tabela do servidor, e isso apagaria o "salvo" na hora).
  useEffect(() => {
    setSaveMessage("");
    setSaveError(null);
    setAcknowledged(false);
  }, [selectedTable?.key]);

  // Toggle de visibilidade de um campo
  const handleToggleFieldVisibility = (index: number) => {
    if (!tableData || !tableData.fields) return;
    
    const updatedFields = [...tableData.fields];
    updatedFields[index] = {
      ...updatedFields[index],
      hidden: !updatedFields[index].hidden
    };
    
    setTableData({
      ...tableData,
      fields: updatedFields
    });
  };

  // Adiciona um novo campo
  const handleAddField = () => {
    if (!tableData) return;
    
    // Adiciona o hidden=false por padrão; F-MS-2 (a): email/telefone viram `format` de um campo texto
    const fieldToAdd: ITableField = {
      name: newField.name,
      label: newField.label,
      required: newField.required,
      ...fromFormType(newField.type),
      hidden: false
    };
    
    const updatedFields = tableData.fields ? [...tableData.fields, fieldToAdd] : [fieldToAdd];
    
    setTableData({
      ...tableData,
      fields: updatedFields
    });
    
    // Limpa o formulário
    setNewField({
      name: '',
      label: '',
      type: 'string',
      required: false
    });
    
    setShowNewFieldForm(false);
    // O lote mudou: a ciência dada valia para o anterior; o servidor decide de novo no próximo Salvar.
    setSensitiveNames([]);
    setAcknowledged(false);
  };

  // W6 emenda (BRIEF WIZARD-W6-MANUAL-SESSION item 9): o diff entre a tabela do hook e a editada é o que vai à sessão
  const pendingChanges = selectedTable && tableData ? diffManualChanges(selectedTable, tableData) : [];
  const sensitiveFields = (tableData?.fields ?? []).filter(f => sensitiveNames.includes(f.name));

  /** Item 10: ramifica pelo `code` do corpo; a edição local fica na tela para o usuário corrigir. */
  const saveErrorMessage = (error: unknown): string | null => {
    const body = error instanceof InterviewApiError ? error.body : {};
    if (body.code === 'INTERVIEW_SESSION_NOT_FOUND') {
      onSessionLost?.();
      return t('onboardingFieldsAiSessionLost');
    }
    if (body.code === 'MANUAL_CHANGE_INVALID') {
      const lines = manualIssues(body).map(i => `${i.name}: ${t(MANUAL_REASON_KEY[i.reason] ?? 'onboardingFieldsAiDiscardedInvalid')}`);
      return [t('onboardingFieldsManualInvalid'), ...lines].join('\n');
    }
    if (body.code === 'INTERVIEW_SESSION_CONFLICT') return t('onboardingFieldsManualConflict');
    if (body.code === 'SENSITIVE_FIELD_NOT_ACKNOWLEDGED') {
      const details = body.details;
      const fields = typeof details === 'object' && details !== null && 'fields' in details && Array.isArray(details.fields)
        ? details.fields.filter((f: unknown): f is string => typeof f === 'string')
        : [];
      setSensitiveNames(fields);
      return null; // não é erro: o bloco de ciência aparece
    }
    console.error('[RightSidebar] Falha ao salvar o modo manual:', error);
    return t('onboardingFieldsManualSaveFailed');
  };

  // Salva as alterações na sessão do servidor e sobe ao hook a tabela que ele devolveu
  const handleSave = async () => {
    const changes = nonEmpty(pendingChanges);
    if (!tableData || !sessionId || !changes) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const tableKey = tableData.key;
      // Item 11 (F-MS-3 a): a ciência só vai depois que o servidor apontou campo sensível e a caixa foi marcada.
      const body: CustomizeFieldsDtoInput = sensitiveNames.length > 0 && acknowledged
        ? { kind: 'manual', sessionId, tableKey, changes, acknowledgeSensitive: true }
        : { kind: 'manual', sessionId, tableKey, changes };
      const data = await InterviewService.customizeFields(body);
      setTableData(data.table);
      onUpdateTable(data.table);
      setAcknowledged(false);
      setSensitiveNames([]);
      setSaveMessage(t('onboardingFieldsSaved'));
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (error) {
      setSaveError(saveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  // Só retornamos null se não houver tabela selecionada, caso contrário, renderizamos
  // com a classe de transformação para animação
  if (!tableData) {
    return null;
  }

  return (
    <div 
      className={`fixed top-0 right-0 h-full z-50 transition-transform duration-300 ease-in-out w-[400px] md:w-[500px] ${isVisible ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="bg-white dark:bg-neutral-800 h-full shadow-xl flex flex-col border-l border-neutral-200 dark:border-neutral-700">
        {/* Cabeçalho */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
              {t('onboardingFieldsTitle')}
            </h3>
          </div>
          
          {/* Toggle entre modos manual e IA */}
          {tableData && (
            <div className="mt-4">
              <div className="bg-neutral-100 dark:bg-neutral-700 p-1 rounded-lg flex">
                <button 
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${
                    interactionMode === 'manual' 
                      ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                  onClick={() => setInteractionMode('manual')}
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    {t('onboardingFieldsModeManual')}
                  </div>
                </button>
                <button 
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors duration-200 ${
                    interactionMode === 'ai' 
                      ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                      : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                  onClick={() => setInteractionMode('ai')}
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                    </svg>
                    {t('onboardingFieldsModeAi')}
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Área de conteúdo com scroll */}
        {tableData && interactionMode === 'ai' ? (
          // Modo de IA humanizada
          // W6: `key` por tabela — o histórico do modo IA é o da tabela aberta, não o da anterior.
          <AIChatMode 
            key={tableData.key}
            tableData={selectedTable ?? tableData}
            sessionId={sessionId}
            onSaveChanges={(updatedTable) => {
              setTableData(updatedTable);
              if (onUpdateTable) onUpdateTable(updatedTable);
            }}
            onSync={(sync) => {
              if (selectedTable && onUpdateTable) onUpdateTable({ ...selectedTable, ...sync });
            }}
            onSessionLost={onSessionLost}
            onClose={() => setInteractionMode('manual')}
          />
        ) : (
          // Modo manual (original)
          <div className="flex-grow p-6 overflow-y-auto">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl">
              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-lg font-medium text-neutral-900 dark:text-white">
                    {tableData?.name} 
                    {tableData?.isCore && (
                      <span className="ml-2 text-xs text-white bg-blue-500 px-2 py-1 rounded">
                        {t('onboardingFieldsCore')}
                      </span>
                    )}
                  </h4>
                  
                  {!showNewFieldForm && (
                    <button 
                      onClick={() => setShowNewFieldForm(true)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center text-sm font-medium focus:outline-none"
                    >
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        {t('onboardingFieldsNewField')}
                      </span>
                    </button>
                  )}
                </div>
                
                {showNewFieldForm && (
                  <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-700 rounded-2xl">
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="font-medium text-neutral-700 dark:text-neutral-200">{t('onboardingFieldsAddNewField')}</h5>
                      <button 
                        onClick={() => setShowNewFieldForm(false)}
                        className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                    
                    <NewFieldForm 
                      newField={newField}
                      setNewField={setNewField}
                      onAddField={handleAddField}
                      onCancel={() => setShowNewFieldForm(false)}
                    />
                  </div>
                )}
                
                {tableData?.fields && tableData.fields.length > 0 ? (
                  <FieldList 
                    tableData={tableData}
                    onToggleFieldVisibility={handleToggleFieldVisibility} 
                  />
                ) : (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {t('onboardingFieldsEmpty')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Rodapé com botão de salvar - Só aparece no modo manual */}
        {tableData && interactionMode === 'manual' && (
          <div className="p-6 border-t border-neutral-200 dark:border-neutral-700">
            {saveMessage && (
              <div className="mb-3 text-sm text-center text-green-600 dark:text-green-400">
                {saveMessage}
              </div>
            )}
            {saveError && (
              <div data-testid="manual-save-error" role="alert" className="mb-3 whitespace-pre-line rounded-2xl bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-300">
                {saveError}
              </div>
            )}
            {sensitiveNames.length > 0 && (
              <div data-testid="manual-sensitive" className="mb-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-800 dark:text-neutral-100">
                  <span className="rounded-md bg-amber-100 dark:bg-amber-900 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-100">
                    {t('onboardingFieldsAiSensitiveBadge')}
                  </span>
                  {sensitiveFields.map(f => <span key={f.name} className="font-medium">{f.label}</span>)}
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-300">{t('onboardingFieldsAiSensitiveNotice')}</p>
                <Checkbox checked={acknowledged} onChange={setAcknowledged} label={t('onboardingFieldsAiSensitiveAck')} />
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || !sessionId || pendingChanges.length === 0 || (sensitiveNames.length > 0 && !acknowledged)}
              className="w-full flex justify-center items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('onboardingFieldsSaving')}
                </>
              ) : t('onboardingFieldsSave')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RightSidebar;
