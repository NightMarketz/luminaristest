import type { DocumentSearchHit } from '@/features/documents/dtos/DocumentDto';
import type { ChatResponseDto, RagCitation, RagDetail, RagMode, RagTechnical } from '../dtos/ChatDto';

type SourceDocument = NonNullable<ChatResponseDto['sourceDocuments']>[number];

/** Um trecho entregue ao modelo neste turno, com o marcador `[n]` que recebeu (1-based, contínuo no turno). */
export type NumberedHit = DocumentSearchHit & { marker: number };

/**
 * Trechos de documento entregues ao modelo num turno de chat (BE-INCR-RAG-DOCUMENTOS, emenda 07/11, itens 15b–15f).
 *
 * - A numeração `[n]` é do TURNO inteiro: uma 2ª chamada de `search_documents` continua de `n+1` (15f).
 * - `citations(answer)` só devolve marcador que corresponde a trecho entregue; o resto é descartado, nunca
 *   inventado (F-RAG-M4).
 * - `technical` sai daqui, com o carimbo do embedding usado na busca (F-RAG-M5); sem `userId` (15d).
 */
export class RagTurn {
  private readonly hits: Array<NumberedHit & { stamp: string }> = [];

  constructor(readonly mode: RagMode) {}

  get descriptive(): boolean {
    return this.mode === 'DESCRITIVO';
  }

  /** Registra os acertos de uma busca e devolve-os numerados a partir do próximo marcador livre. */
  add(hits: DocumentSearchHit[], stamp: string): NumberedHit[] {
    return hits.map((h) => {
      const numbered = { ...h, marker: this.hits.length + 1, stamp };
      this.hits.push(numbered);
      return { ...h, marker: numbered.marker };
    });
  }

  get size(): number {
    return this.hits.length;
  }

  /** Marcadores `[n]` da resposta que apontam para um trecho entregue, na ordem da 1ª aparição, sem repetição. */
  citations(answer: string): RagCitation[] {
    const seen = new Set<number>();
    const out: RagCitation[] = [];
    for (const m of answer.matchAll(/\[(\d+)\]/g)) {
      const marker = Number(m[1]);
      if (seen.has(marker)) continue;
      seen.add(marker);
      const hit = this.hits[marker - 1];
      if (hit) out.push({ marker, chunkId: hit.chunkId });
    }
    return out;
  }

  sourceDocuments(): SourceDocument[] {
    return this.hits.map((h) => ({
      id: h.chunkId,
      score: h.score,
      payload: { documentId: h.documentId, textContent: h.text, fileName: h.fileName, chunkId: h.chunkId, index: h.chunkIndex },
      technical: technicalOf(h, h.stamp),
    }));
  }

  /** O que vai para `ChatMessage.ragDetail` (15e); `null` quando o turno não entregou trecho nenhum. */
  detail(response: Pick<ChatResponseDto, 'citations' | 'answerModel'>): RagDetail | null {
    if (this.hits.length === 0) return null;
    return {
      mode: this.mode,
      citations: response.citations ?? [],
      sources: this.hits.map((h) => technicalOf(h, h.stamp)),
      ...(response.answerModel ? { answerModel: response.answerModel } : {}),
    };
  }
}

function technicalOf(h: DocumentSearchHit, stamp: string): RagTechnical {
  return { chunkId: h.chunkId, documentId: h.documentId, fileName: h.fileName, chunkIndex: h.chunkIndex, score: h.score, embeddingStamp: stamp };
}
