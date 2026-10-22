/**
 * FIX-CHAT-AGENTE lote B, §3.3 #15 do ACHADOS-2026-10-19 — `POST /documents/token-cost` aceita DOCX no upload
 * (`TOKEN_COST_MIME_TYPES`) mas o handler só extrai PDF/XLSX/CSV e responde 400 para DOCX.
 * Autorização: dono, chat, 2026-10-21 e 2026-10-22 ("Todos os 22 em série").
 */
import type { Request, Response } from 'express';

jest.mock('@/lib/authUtils', () => ({ getUserContextFromRequest: () => ({ id: 'user_A', userId: 'user_A' }) }));
jest.mock('@/features/documents/services/DocumentProcessingService', () => ({
  DocumentProcessingService: jest.fn().mockImplementation(() => ({ extractText: jest.fn().mockResolvedValue('abcdefgh') })),
}));

import { computeTokenCost } from '@/controllers/documentsController';

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('#15 — estimativa de tokens para DOCX', () => {
  it('DOCX devolve 200 com a contagem, não 400', async () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    const req = { file: { mimetype: DOCX, buffer: Buffer.from('PK fake docx') } } as unknown as Request;

    await computeTokenCost(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: { tokens: 2, charCount: 8 } });
  });
});
