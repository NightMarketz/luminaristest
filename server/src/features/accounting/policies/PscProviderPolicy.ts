/** Ator da plataforma — só o que a policy olha (o papel vem do JWT, `getUserContextFromRequest`). */
export interface PscProviderActor {
  userId: string;
  role: string;
}

/**
 * X10a PR-7 (EMENDA-PSC E-2; F-PSC-2 a: "tabela gerida pela plataforma (admin)") — policy PRÓPRIA: o cadastro dos PSCs
 * é da plataforma, não da empresa, então não reusa `AccountingPolicy`. Mesma régua da `LegalParameterPolicy`: só
 * `PLATFORM_ADMIN` (o `ADMIN` é gestão de usuários). Tenant comum não lê nem escreve.
 */
export class PscProviderPolicy {
  canManage(actor: PscProviderActor): boolean {
    return !!actor.userId && actor.role === 'PLATFORM_ADMIN';
  }
}
