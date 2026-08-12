/**
 * DocumentAttachmentDto — a guarda anti-travessia do upload, mais a ÚNICA fronteira de
 * contabilidade que NÃO declara `.strict()`.
 *
 * Por que este arquivo existe: o `idLike` (`^[A-Za-z0-9_-]+$`) é defesa em profundidade contra
 * travessia de caminho via `unitId`/`targetId` — a guarda primária é o `assertInsideBase` do
 * util de storage. O snapshot de forma registra o regex como `pattern`, mas registrar a
 * DECLARAÇÃO não é o mesmo que provar a REJEIÇÃO: um `pattern` presente e uma barreira que
 * morde são fatos diferentes, e é o segundo que importa numa superfície de upload.
 *
 * `.strict()` — HISTÓRICO DA DECISÃO: este arquivo nasceu sem `.strict()` em 35a3db2a
 * (BE-INCR-5) e nunca foi revisitado. O PR de teste PINOU o descarte silencioso sem sancioná-lo;
 * o PR de contrato seguinte ligou `.strict()` (endpoint sem cliente vivo, e o irmão multipart
 * `ImportReferentialCatalogSchema` já era `.strict()` — "é multipart" não sustentava a exceção).
 *
 * NÃO era mass-assignment nem antes: o Zod descarta a chave desconhecida (não repassa) e o
 * controller monta a chamada de serviço campo a campo (`documentAttachmentController.ts:55-61`),
 * nunca espalhando `parsed.data`. O ganho é de ruído: campo com typo vira 400 em vez de silêncio.
 * E NÃO fecha a classe — 34 outros object-schemas de contabilidade seguem abertos.
 */
import {
  UploadDocumentAttachmentSchema,
  ListDocumentAttachmentsQuerySchema,
  DocumentAttachmentScopeQuerySchema,
} from '../DocumentAttachmentDto';

const validUpload = { unitId: 'clx1unit0000abcd', targetId: 'clx1entry000abcd' };

/** Formas que a travessia de caminho assume num id vindo do cliente. */
const TRAVERSAL = ['../etc/passwd', '..', '.', 'a/b', 'a\\b', 'a.b', '%2e%2e%2f', 'unit 1', ''];

describe('UploadDocumentAttachmentSchema — guarda anti-travessia (idLike)', () => {
  it('accepts ids no charset de cuid (CONTROLE — sem isto todo negativo abaixo é vazio)', () => {
    expect(UploadDocumentAttachmentSchema.safeParse(validUpload).success).toBe(true);
    expect(
      UploadDocumentAttachmentSchema.safeParse({ unitId: 'UNIT_1-a', targetId: 'e-1_B' }).success,
    ).toBe(true);
  });

  it('rejects travessia de caminho em unitId', () => {
    for (const bad of TRAVERSAL) {
      expect(UploadDocumentAttachmentSchema.safeParse({ ...validUpload, unitId: bad }).success).toBe(false);
    }
  });

  it('rejects travessia de caminho em targetId', () => {
    for (const bad of TRAVERSAL) {
      expect(UploadDocumentAttachmentSchema.safeParse({ ...validUpload, targetId: bad }).success).toBe(false);
    }
  });

  it('rejects id ausente (unitId é a chave de tenancy — nunca opcional)', () => {
    const { unitId: _u, ...noUnit } = validUpload;
    const { targetId: _t, ...noTarget } = validUpload;
    expect(UploadDocumentAttachmentSchema.safeParse(noUnit).success).toBe(false);
    expect(UploadDocumentAttachmentSchema.safeParse(noTarget).success).toBe(false);
  });

  it('aplica o default JOURNAL_ENTRY e rejeita qualquer outro alvo', () => {
    const parsed = UploadDocumentAttachmentSchema.safeParse(validUpload);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.targetType).toBe('JOURNAL_ENTRY');
    expect(
      UploadDocumentAttachmentSchema.safeParse({ ...validUpload, targetType: 'PAYABLE' }).success,
    ).toBe(false);
  });

  it('a mesma guarda vale nas queries de listagem e de escopo', () => {
    expect(ListDocumentAttachmentsQuerySchema.safeParse({ unitId: 'clx1unit0000abcd' }).success).toBe(true);
    expect(DocumentAttachmentScopeQuerySchema.safeParse({ unitId: 'clx1unit0000abcd' }).success).toBe(true);
    for (const bad of TRAVERSAL) {
      expect(ListDocumentAttachmentsQuerySchema.safeParse({ unitId: bad }).success).toBe(false);
      expect(DocumentAttachmentScopeQuerySchema.safeParse({ unitId: bad }).success).toBe(false);
    }
  });
});

describe('DocumentAttachmentDto — .strict() (mudança de contrato)', () => {
  it('rejects chave desconhecida em vez de descartar (campo com typo é 400, não silêncio)', () => {
    expect(
      UploadDocumentAttachmentSchema.safeParse({ ...validUpload, targetTyp: 'JOURNAL_ENTRY' }).success,
    ).toBe(false);
    expect(UploadDocumentAttachmentSchema.safeParse({ ...validUpload, fileSize: 999 }).success).toBe(false);
  });

  it('rejects metadado de arquivo vindo do cliente (é derivado no servidor, nunca aceito)', () => {
    // Antes do .strict() estes campos eram silenciosamente descartados; agora a tentativa é
    // um erro alto — o cliente descobre que o servidor não aceita, em vez de crer que aceitou.
    expect(
      UploadDocumentAttachmentSchema.safeParse({ ...validUpload, sha256: 'deadbeef'.repeat(8) }).success,
    ).toBe(false);
    expect(
      UploadDocumentAttachmentSchema.safeParse({ ...validUpload, storageKey: '../../../etc/passwd' }).success,
    ).toBe(false);
  });

  it('as duas queries também rejeitam chave desconhecida', () => {
    expect(
      ListDocumentAttachmentsQuerySchema.safeParse({ unitId: 'clx1unit0000abcd', page: '1' }).success,
    ).toBe(false);
    expect(
      DocumentAttachmentScopeQuerySchema.safeParse({ unitId: 'clx1unit0000abcd', targetType: 'JOURNAL_ENTRY' }).success,
    ).toBe(false);
  });
});
