## FieldCustomizationService

The finest customization step: **add/remove/update fields** of one table of the interview session, through an AI
conversation in the field panel (`POST /api/dashboard/ai/CustomizeFields`). Node **W6**: BRIEF
`docs/accounting/WIZARD-W6-CUSTOMIZE-FIELDS-brief.md`, decision `docs/adr/ADR-W6-field-customization-ai.md`.

> Part of the [`interview`](../README.md) feature. Works on the persisted `InterviewSession` (W4) through the
> [`StateManager`](../CustomizationService/StateManager.ts). Built by the factory (`getFieldCustomizationService()`),
> never a singleton.

## Public API

| Method | Role |
|---|---|
| `handle(userId, dto)` | Dispatches on `dto.kind` (`CustomizeFieldsDto`). |
| `processMessage(userId, {sessionId, tableKey, message})` | One model call; returns a **proposal**, never changes the fields. |
| `processDecision(userId, {sessionId, tableKey, proposalId, decision, acknowledgeSensitive?})` | Applies or discards the pending proposal. |

Both return `CustomizeFieldsResult` (`sessionId`, `tableKey`, `table`, `conversationHistory`, `proposal`,
`discarded`, `applied?`).

## Rules (ADR-W6 §2.2)

1. **The model only proposes.** The output is bound to a strict `json_schema` (`ModelOutput.ts`, model
   `FALLBACK`), one call per turn; the preset match comes in the same schema (`presetKey`), plus the deterministic
   `FieldPresetMatcher.findExactFieldMatch`.
2. **Canonical validation.** Every `add`/`update` goes through `AdvancedFieldSchema` (`dynamicTables`); `relation`
   and `json` are not offered to the AI. Invalid changes are discarded with a reason (`FieldProposal.ts`).
3. **Sensitive data is marked** (LGPD art. 5, II): the model's `sensitiveCategory` plus a radical list that only adds
   marks. Applying a proposal with a sensitive field needs `acknowledgeSensitive: true`.
4. **History per table on the server**; the last 20 `user`/`assistant` lines go to the model, `system` lines
   (decisions) never do.
5. **A model failure keeps the session**: 200 with `proposal: null` and a default assistant message.

## Module components

- **`index.ts`** — the service.
- **`ModelOutput.ts`** — response format and Zod re-read of the model output.
- **`FieldProposal.ts`** — validation, discard reasons and sensitive marks.
- **`FieldUpdater`** — applies a validated proposal to the table fields.
- **`FieldPresetMatcher`** — catalog keys and the exact name/synonym match.
- **`PromptConfig`** — the system prompt and fixed messages.
- **`errors.ts`** — `TABLE_NOT_IN_SESSION` (404), `PROPOSAL_STALE` (409), `SENSITIVE_FIELD_NOT_ACKNOWLEDGED` (400).
