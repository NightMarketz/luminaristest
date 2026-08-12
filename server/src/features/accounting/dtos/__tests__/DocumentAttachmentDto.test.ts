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
 * DECLARAÇÃO SOBRE A AUSÊNCIA DE `.strict()` (achado reportado no PR, NÃO corrigido aqui):
 * os três schemas deste arquivo são os únicos DTOs de contabilidade sem `.strict()`. Não há
 * evidência de que seja deliberado — o arquivo nasceu assim em 35a3db2a (BE-INCR-5) e nunca
 * foi revisitado, e o irmão multipart `ImportReferentialCatalogSchema` É `.strict()`, o que
 * derruba "multipart" como justificativa. A severidade é BAIXA e não é mass-assignment: o Zod
 * DESCARTA a chave desconhecida (não repassa), e o controller monta a chamada de serviço campo
 * a campo (`documentAttachmentController.ts:55-61`), nunca espalhando `parsed.data`. O efeito
 * real é de ruído: um campo com typo é silenciosamente ignorado em vez de virar 400.
 *
 * O teste abaixo PINA o comportamento atual (descarte silencioso) em vez de corrigi-lo, porque
 * ligar `.strict()` muda o shape e exige atualizar o `__dto-shapes__.json` — mudança de
 * contrato deliberada, que deve ser visível num PR próprio e não folder num PR de teste.
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

describe('DocumentAttachmentDto — ausência de .strict() (comportamento PINADO, não sancionado)', () => {
  it('DESCARTA a chave desconhecida em vez de rejeitar (divergência dos demais DTOs)', () => {
    const parsed = UploadDocumentAttachmentSchema.safeParse({
      ...validUpload,
      targetTyp: 'JOURNAL_ENTRY', // typo: seria 400 em qualquer outro DTO de contabilidade
      fileSize: 999,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // O valor descartado NÃO chega ao serviço — por isso o achado é ruído, não mass-assignment.
      expect(parsed.data).toEqual({ ...validUpload, targetType: 'JOURNAL_ENTRY' });
    }
  });

  it('metadado de arquivo enviado pelo cliente é ignorado (é derivado no servidor)', () => {
    const parsed = UploadDocumentAttachmentSchema.safeParse({
      ...validUpload,
      sha256: 'deadbeef'.repeat(8),
      storageKey: '../../../etc/passwd',
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty('sha256');
      expect(parsed.data).not.toHaveProperty('storageKey');
    }
  });
});
