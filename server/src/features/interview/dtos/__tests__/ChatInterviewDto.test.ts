/**
 * BE-INCR-INTERVIEW-SESSION (nó W4) — item 7: `ChatInterviewSchema` sai do controller, `.strict()` no corpo e na
 * mensagem, `sessionId` uuid (id da linha `InterviewSession`).
 */
import { ChatInterviewSchema } from '../ChatInterviewDto';

describe('ChatInterviewSchema', () => {
  it('aceita o corpo que o useAiInterview manda hoje', () => {
    const r = ChatInterviewSchema.safeParse({
      messages: [{ sender: 'user', text: 'tenho um salão' }, { sender: 'ai', text: 'Olá' }],
      stage: 'CUSTOMIZATION_IN_PROGRESS',
      presetKey: 'beautySalon',
      sessionId: '3f1c2a8e-5b7d-4c1e-9a2f-0e6d8b4c7a91',
      choice: 'customize',
    });
    expect(r.success).toBe(true);
  });

  it('chave desconhecida no corpo → rejeita', () => {
    expect(ChatInterviewSchema.safeParse({ stage: 'GREETING', userId: 'outro' }).success).toBe(false);
  });

  it('chave desconhecida na mensagem → rejeita', () => {
    expect(ChatInterviewSchema.safeParse({ messages: [{ sender: 'user', text: 'oi', extra: 1 }] }).success).toBe(false);
  });

  it('sessionId que não é uuid → rejeita', () => {
    expect(ChatInterviewSchema.safeParse({ sessionId: 'sess-1' }).success).toBe(false);
  });

  it('corpo vazio → defaults (GREETING, sem mensagens)', () => {
    expect(ChatInterviewSchema.parse({})).toEqual({ stage: 'GREETING', messages: [] });
  });
});
