import type { CustomizeFieldsTable } from '@/lib/services/interview.service';

export interface ITableField {
  name: string;
  label: string;
  type: string;
  /** W6 emenda (F-MS-2 a): `email`/`phone` do formulário manual são `format` de um campo `string`. */
  format?: string;
  required?: boolean;
  hidden?: boolean;
}

export interface ITable {
  /** W6: histórico do painel de campos, gravado pelo servidor (`at` = ISO do turno). */
  conversationHistory: Array<{ role: string; content: string; at?: string }>;
  pendingProposal?: CustomizeFieldsTable['pendingProposal'];
  key: string;
  name: string;
  description: string;
  fields?: ITableField[];
  isCore?: boolean;
}

export interface IAiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  isError?: boolean;
}

export type InteractionMode = 'manual' | 'ai';

export interface RightSidebarProps {
  selectedTable: ITable | null;
  isVisible: boolean;
  sessionId: string | null;
  onUpdateTable?: (updatedTable: ITable) => void;
  /** W6 item 17: a sessão de customização sumiu (404 `INTERVIEW_SESSION_NOT_FOUND`) — o hook volta a entrevista à escolha. */
  onSessionLost?: () => void;
  presetKey: string | null;
}
