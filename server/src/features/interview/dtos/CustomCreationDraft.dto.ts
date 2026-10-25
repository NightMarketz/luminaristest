import { z } from 'zod';
import { CustomCreationSchema } from '../../dynamicTables/dtos/CreateDashboard.dto';

/**
 * W1 (BRIEF §2, F-W1-1 a / F-W1-2 a) — `creation` do turno `done` da customização: o servidor consolida a sessão
 * persistida e devolve a parte do body do `POST /dashboard/create` que a conversa decide. O front completa com
 * `unit`, `fiscal` e `modules`. Derivado do `CustomCreationSchema` para não divergir do create.
 */
export const CustomCreationDraftSchema = CustomCreationSchema.pick({
  mode: true,
  presetKey: true,
  removedTables: true,
  addedFields: true,
  addedTables: true,
}).required({ removedTables: true, addedFields: true, addedTables: true });

export type CustomCreationDraft = z.infer<typeof CustomCreationDraftSchema>;
