import type { Request, Response } from 'express';
import { handleApiError } from '@/lib/apiUtils';
import { getUserContextFromRequest } from '@/lib/authUtils';
import { getFactory } from '@/lib/factory';
import { ChatInterviewSchema, InterviewMessageDto } from '@/features/interview/dtos/ChatInterviewDto';
import { InterviewStage, IMessage } from '@/features/interview/models/InterviewTypes';

/**
 * Normalises the mixed frontend/backend message shape into the IMessage format
 * expected by InterviewService.
 */
function normaliseMessages(raw: InterviewMessageDto[]): IMessage[] {
  return raw
    .map((m): IMessage | null => {
      // Determine role
      let role: 'user' | 'assistant';
      if (m.role) {
        role = m.role;
      } else if (m.sender === 'user') {
        role = 'user';
      } else if (m.sender === 'ai') {
        role = 'assistant';
      } else {
        return null; // unknown shape — skip
      }

      const content = m.content ?? m.text ?? '';
      return { role, content };
    })
    .filter((m): m is IMessage => m !== null);
}

/**
 * POST /api/dashboard/ai/ChatInterview
 *
 * Drives the AI onboarding interview. Authentication is required (auth middleware
 * must have set x-user-id etc. in the request headers upstream).
 *
 * Request body:
 *   { stage?: InterviewStage, messages?: IMessage[], presetKey?: string, sessionId?: string,
 *     choice?: 'create' | 'customize' }
 *
 * Response:
 *   { response: string, nextStage: InterviewStage, presetKey?: string,
 *     sessionId?: string, startCustomization?: boolean, customizationState?: object,
 *     choicePrompt?: { kind: 'creation_type', reason: 'initial' | 'unclear' | 'declined_customize' | 'error' } }
 *
 * Erros da sessão (W4): 404 `INTERVIEW_SESSION_NOT_FOUND` (inexistente, expirada ou de outro usuário) e
 * 409 `INTERVIEW_SESSION_CONFLICT` (outro turno gravou a sessão no meio), via `handleApiError`.
 */
export async function postChatInterview(req: Request, res: Response) {
  try {
    const ctx = getUserContextFromRequest(req);
    if (!ctx) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const parse = ChatInterviewSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, error: parse.error.flatten() });
    }

    const { stage, messages: rawMessages, presetKey, sessionId, choice } = parse.data;

    // Validate that the stage is a known InterviewStage (fall back to GREETING if unknown)
    const validStages: InterviewStage[] = [
      'GREETING',
      'DISCOVERING_BUSINESS',
      'CONFIRMING_BUSINESS',
      'MATCHING_PRESET',
      'AWAITING_CREATION_TYPE_CONFIRMATION',
      'CUSTOMIZATION_INTRO',
      'CUSTOMIZATION_IN_PROGRESS',
      'CUSTOMIZATION_COMPLETED',
      'IDENTIFYING_ENTITIES',
      'CANNOT_PROCEED',
      'COMPLETED',
    ];
    const currentStage: InterviewStage = validStages.includes(stage as InterviewStage)
      ? (stage as InterviewStage)
      : 'GREETING';

    const messages = normaliseMessages(rawMessages);

    // W4 item 6: o dono da sessão é quem está autenticado — `ctx.userId` atravessa a cadeia.
    const result = await getFactory().getInterviewService().processTurn(
      currentStage,
      messages,
      ctx.userId,
      presetKey,
      sessionId,
      choice
    );

    return res.status(200).json(result);
  } catch (error) {
    return handleApiError(error, res);
  }
}
