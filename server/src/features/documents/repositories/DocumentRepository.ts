import prisma from '../../../lib/prisma';
import { IDocument, DocumentContextUpdateInput, DocumentCreateInput, DocumentUpdateInput, DocumentStatus, DocumentPurpose } from '../models/Document.model';
import { IDocumentRepository } from './IDocumentRepository';
import type { Document as PrismaDocument } from 'generated/prisma';
import { ProcessingStatus as PrismaProcessingStatus, DocumentPurpose as PrismaDocumentPurpose, Prisma } from 'generated/prisma';

/**
 * Prisma implementation of the Document repository.
 * Handles all database operations for Document entities.
 */
export class DocumentRepository implements IDocumentRepository {
  async create(data: DocumentCreateInput): Promise<IDocument> {
    const document = await prisma.document.create({
      data: {
        userId: data.userId,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize,
        textContent: data.textContent,
        mimeType: data.mimeType,
        documentPurpose: data.documentPurpose,
        status: data.status,
      },
    });
    return this.toDomain(document);
  }

  async update(id: string, data: DocumentUpdateInput): Promise<IDocument> {
    const updated = await prisma.document.update({
      where: { id },
      data: {
        status: data.status as unknown as PrismaProcessingStatus,
        summary: data.summary,
        ...(data.contextJson !== undefined && { contextJson: data.contextJson as unknown as Prisma.InputJsonValue }),
        processingDate: data.processingDate,
        processingError: data.processingError,
        ...(data.textContent !== undefined && { textContent: data.textContent }),
      },
    });
    return this.toDomain(updated);
  }

  async findAllForUser(userId: string): Promise<{ id: string; fileName: string }[]> {
    const documents = await prisma.document.findMany({
      where: { userId },
      select: {
        id: true,
        fileName: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return documents;
  }

  async findAll(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [documents, totalCount] = await Promise.all([
      prisma.document.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.document.count({ where: { userId } }),
    ]);

    return {
      documents: documents.map(this.toDomain),
      totalCount,
    };
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<IDocument | null> {
    const document = await (tx ?? prisma).document.findUnique({
      where: { id },
    });

    return document ? this.toDomain(document) : null;
  }

  async updateContext(id: string, data: DocumentContextUpdateInput, tx: Prisma.TransactionClient): Promise<IDocument> {
    const updated = await tx.document.update({
      where: { id },
      data: {
        ...(data.fileName !== undefined && { fileName: data.fileName }),
        ...(data.documentPurpose !== undefined && { documentPurpose: data.documentPurpose as unknown as PrismaDocumentPurpose }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.generatedContext !== undefined && { generatedContext: data.generatedContext as Prisma.InputJsonValue }),
      },
    });
    return this.toDomain(updated);
  }

  async runInTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }

  async delete(id: string): Promise<void> {
    await prisma.document.delete({
      where: { id },
    });
  }

  async deleteWithChunks(id: string): Promise<void> {
    // Batch transaction: both statements commit together or roll back together.
    await prisma.$transaction([
      prisma.chunk.deleteMany({ where: { documentId: id } }),
      prisma.document.delete({ where: { id } }),
    ]);
  }

  private toDomain(prismaDocument: PrismaDocument): IDocument {
    return {
      id: prismaDocument.id,
      userId: prismaDocument.userId,
      fileName: prismaDocument.fileName,
      fileType: prismaDocument.fileType,
      fileSize: prismaDocument.fileSize,
      textContent: prismaDocument.textContent,
      mimeType: prismaDocument.mimeType,
      status: prismaDocument.status as unknown as DocumentStatus,
      documentPurpose: prismaDocument.documentPurpose as unknown as DocumentPurpose,
      summary: prismaDocument.summary,
      contextJson: (prismaDocument.contextJson ?? null) as Record<string, unknown> | null,
      generatedContext: (prismaDocument.generatedContext ?? null) as Record<string, unknown> | null,
      uploadDate: prismaDocument.uploadDate,
      processingDate: prismaDocument.processingDate,
      processingError: prismaDocument.processingError,
      createdAt: prismaDocument.createdAt,
      updatedAt: prismaDocument.updatedAt,
    };
  }
} 