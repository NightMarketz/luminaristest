/** Ator da plataforma — só o que a policy olha (o papel vem do JWT, `getUserContextFromRequest`). */
export interface LegalParameterActor {
  userId: string;
  role: string;
}

export interface ILegalParameterPolicy {
  /** Ler a tabela e o lookup: qualquer autenticado (BRIEF item 11). */
  canRead(actor: LegalParameterActor): boolean;
  /** Propor, publicar, revogar: só `PLATFORM_ADMIN` (F-LP-2 b); um admin faz tudo (F-LP-3 b). */
  canManage(actor: LegalParameterActor): boolean;
}
