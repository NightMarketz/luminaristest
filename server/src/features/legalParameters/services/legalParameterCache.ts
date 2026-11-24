/**
 * Onda 3.2 fatia 5 — o armazenamento em memória das linhas publicadas mora em `models/legalParameterCache.ts` (folha: o DTO Zod
 * estático e os models o leem de forma síncrona, emenda §9 L-8, sem importar camada executável — regra L6 do `check:arch`).
 * Este arquivo só reexporta, para os importadores que já existiam apontarem para o mesmo módulo.
 */
export * from '../models/legalParameterCache';
