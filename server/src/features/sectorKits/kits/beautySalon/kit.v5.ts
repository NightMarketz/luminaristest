import { SectorKitV1Schema, type SectorKitV1 } from '../../dtos/SectorKitDto';
import { SALE_BINDING_V1, SALE_OPERATIONAL_SCHEMA_SNAPSHOT } from '../../../accountingBinding/fixtures/saleBinding';
import { REFERENCIAL_2025_CANONICO } from '../_shared/referencial2025Canonico';
import { CONTAS_FISCAIS, PERFIL_FISCAL_PADRAO, REFERENCIAL_2025_FISCAL } from '../_shared/conteudoFiscalCanonico';
import { REFERENCIAL_2025_EMENDA_3_3 } from '../_shared/referencialEmenda33';
import { CATALOGO_SERVICOS_FISCAIS } from '../_shared/catalogoServicosFiscais';

const REFERENCIAL_2025 = [...REFERENCIAL_2025_CANONICO, ...REFERENCIAL_2025_FISCAL, ...REFERENCIAL_2025_EMENDA_3_3];

/**
 * Kit "Salão de beleza", v5 — o v4 + o referencial 2025 das 9 folhas canônicas da emenda 3.3 (3.5.1–3.5.3, 4.3.1–4.3.3,
 * 4.4.1, 4.4.2 e 4.6), que o plano canônico passa a criar (BE-INCR-ENCARGOS-DESCONTOS PR-1, E1/E26; F-HR-4 a, dono 11/10;
 * "a próxima versão" — dono, 13/10: v3 e v4 já publicados pelo KIT-SETOR). As contas vêm do canônico, não do kit:
 * `chartExtension` é o do v4. Publicado: nunca edite este arquivo; uma versão nova é `kit.v6.ts`.
 */
export const BEAUTY_SALON_KIT_V5: SectorKitV1 = SectorKitV1Schema.parse({
  kitKey: 'beautySalon',
  kitVersion: 5,
  label: 'Salão de beleza',
  changelog: [
    'v1: migração literal do binding padrão do salão (SALE_BINDING_V1), sem conteúdo novo.',
    'v2: referencial 2025 das 15 folhas canônicas (Presumido e Real); 3.4 → 3.01.01.01.01.98 por delegação do contador ' +
      'via dono (D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO D-1; D-2026-10-11-QUESTIONARIO-DONO (b)).',
    'v3: contas de imposto (2.1.3–2.1.6 a recolher, 3.6.1/3.6.2 PIS/COFINS como dedução da receita, 4.5.1/4.5.2 IRPJ/CSLL), ' +
      'contas-padrão do perfil fiscal (só campo nulo) e o referencial 2025 delas (F-KE-1 a, F-KE-2 a, F-PCB-1R a; dono 13/10).',
    'v4: catálogo de sugestões fiscais por serviço (cTribNac/cNBS da LC 116 e do Anexo B v1.01; F-KE-3 b, F-KE-4; dono 13/10) — ' +
      'só sugere, nada é gravado sem o usuário escolher.',
    'v5: referencial 2025 das 9 folhas da emenda 3.3 (juros/multa/desconto em 3.5.x e 4.3.x, multas indedutíveis 4.4.x, ' +
      'tarifa bancária 4.6), PROPOSTA-REFERENCIAL-D1 §1.2 (F-HR-4 a, dono 11/10; 4.6 em vez de 4.5, dono 13/10).',
  ],
  chartExtension: CONTAS_FISCAIS,
  binding: SALE_BINDING_V1,
  operationalSchema: SALE_OPERATIONAL_SCHEMA_SNAPSHOT,
  roleDefaults: { fiscalProfile: PERFIL_FISCAL_PADRAO },
  serviceFiscalDefaults: CATALOGO_SERVICOS_FISCAIS,
  referential: [
    { regime: 'PRESUMIDO', mappingVersion: '2025', entries: REFERENCIAL_2025 },
    { regime: 'REAL', mappingVersion: '2025', entries: REFERENCIAL_2025 },
  ],
});
