import type { QuickCreationInput } from '@/types/contracts/dynamicTables/CreateDashboard.dto.gen';

export interface IMessage {
  sender: 'user' | 'ai';
  text: string;
}

export interface ITableField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  hidden?: boolean;
}

export interface ITable {
  key: string;
  name: string;
  description: string;
  fields?: ITableField[];
  isCore?: boolean;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface ICustomizationState {
  presetKey: string;
  presetName: string;
  tables: ITable[];
}

/** W3 FE: espelha `CreationChoiceReason`/`choicePrompt` de `server/.../InterviewTypes.ts` (BE #455). */
export type CreationChoice = 'create' | 'customize';
export type CreationChoiceReason = 'initial' | 'unclear' | 'declined_customize' | 'error';
export interface ICreationChoicePrompt {
  kind: 'creation_type';
  reason: CreationChoiceReason;
}

/**
 * W7 item 4 (F-W7-2 a): o que a falha do `POST /dashboard/create` permite — só `retryable` reenvia o pedido;
 * `partial` (`ONBOARDING_ROLLBACK_FAILED`) e `already-provisioned` (403 one-shot) nunca, `invalid` (400) volta à conversa.
 */
export type CreationErrorKind = 'retryable' | 'partial' | 'already-provisioned' | 'invalid';
export interface ICreationError {
  kind: CreationErrorKind;
  /** texto do servidor quando veio; senão já traduzido via t() */
  message: string;
}

/** W5 PR-3: chave atômica de módulo — do contrato gerado do create, sem a chave de grupo `CRM-2`. */
export type ModuleKey = Exclude<NonNullable<QuickCreationInput['modules']>[number], 'CRM-2'>;

/**
 * W5 PR-3 (FE-INCR-W5-MODULES): espelha `InterviewModuleOption` de `server/.../InterviewTypes.ts` (W5 PR-2) — o turno da
 * entrevista é interface, sem `.gen.ts`. Só vem no turno MATCHING_PRESET com preset casado.
 */
export interface InterviewModuleOption {
  key: ModuleKey;
  name: { pt: string; en: string };
  dependsOn: ModuleKey[];
  /** a suíte já instala: marcado e desabilitado */
  locked: boolean;
  /** começa marcado */
  suggested: boolean;
}
