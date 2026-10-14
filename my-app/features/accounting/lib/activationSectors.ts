/**
 * Setores que a tela de ativação oferece (FE-INCR-BINDING-ACTIVATION-screen-brief item 9, F-BA-5 → a) — espelho do
 * `SECTOR_BINDING_REGISTRY` do server (`features/accountingBinding/fixtures/sectorBindingRegistry.ts`). Duplicação
 * declarada: não há rota que liste setores. Um setor novo no BE sem o FE só deixa de aparecer aqui; o teste fixa os dois.
 */
export const ACTIVATION_SECTORS = ['beautySalon', 'aestheticClinic'] as const;

export type ActivationSector = (typeof ACTIVATION_SECTORS)[number];

/** O `DEFAULT_SECTOR_KEY` do server. */
export const DEFAULT_ACTIVATION_SECTOR: ActivationSector = 'beautySalon';

export const ACTIVATION_SECTOR_LABELS: Record<ActivationSector, { key: string; fallback: string }> = {
  beautySalon: { key: 'activation.sectors.beautySalon', fallback: 'Salão de beleza' },
  aestheticClinic: { key: 'activation.sectors.aestheticClinic', fallback: 'Clínica de estética' },
};
