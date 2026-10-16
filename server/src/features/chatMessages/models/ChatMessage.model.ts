/**
 * Represents the core ChatMessage entity within the application domain.
 * This interface decouples the application logic from the specific ORM (Prisma).
 */
export interface IChatMessage {
  id: string;
  content: string;
  role: ChatMessageRole;
  chatInstanceId: string;
  userId?: string;
  createdAt: Date;
  updatedAt: Date;
  /** Uso de tokens do turno (I11). null = USER ou anterior ao I11; 0 = ASSISTANT sem chamada ao LLM. */
  promptTokens: number | null;
  completionTokens: number | null;
  model: string | null;
  // ChatInstance is loaded separately when needed
  // chatInstance?: IChatInstance;
}

/**
 * A simplified version of ChatMessage used for lists and summaries
 */
export interface IChatMessageSummary {
  id: string;
  content: string;
  role: ChatMessageRole;
  createdAt: Date;
}

// Added ChatMessageRole enum
export enum ChatMessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
} 