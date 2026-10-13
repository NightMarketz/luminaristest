import { LISTA_LC116_SEMENTE } from '@test/helpers/legalParams';
import { KIT_REGISTRY } from '../registry';
import { CATALOGO_SERVICOS_FISCAIS } from '../kits/_shared/catalogoServicosFiscais';
import { normalizarTermos, suggestFromCatalog } from '../models/suggestFromCatalog';
import type { ServiceFiscalCatalogItem } from '../dtos/SectorKitDto';

/**
 * BE-INCR-KIT-SETOR-EMENDA-1, PR-K3 — catálogo de sugestões (7a) e camada 1 determinística (7b).
 * "cTribNac ∈ lista LC 116 vigente" é teste de BUILD do kit, não refine: a lista mora em `features/accounting`/
 * `legalParameters`, fora da fronteira do `sectorKits` (L2 de 13/10). Roda sobre a semente da migração `LC116_SERVICO`.
 */
function codigosForaDaLista(catalogo: readonly ServiceFiscalCatalogItem[]): string[] {
  return catalogo.filter((i) => !LISTA_LC116_SEMENTE.has(i.cTribNac)).map((i) => `${i.key}:${i.cTribNac}`);
}

describe('catálogo do kit × lista nacional LC 116 (7a, teste de build)', () => {
  it('todo kit publicado só sugere cTribNac da lista nacional', () => {
    const fora = Object.values(KIT_REGISTRY).flatMap((versions) => versions.flatMap((k) => codigosForaDaLista(k.serviceFiscalDefaults)));
    expect(fora).toEqual([]);
  });

  it('a checagem pega código fora da lista (prova na condição que falha)', () => {
    expect(codigosForaDaLista([{ ...CATALOGO_SERVICOS_FISCAIS[0], key: 'inventado', cTribNac: '999999' }])).toEqual(['inventado:999999']);
  });

  it('os dois setores levam a tabela inteira do relatório (L4): 7 entradas, 6.01–6.05 e 4.01', () => {
    for (const kitKey of ['beautySalon', 'aestheticClinic']) {
      const versions = KIT_REGISTRY[kitKey];
      const vigente = versions[versions.length - 1];
      expect(vigente.serviceFiscalDefaults.map((i) => i.cTribNac)).toEqual(['060101', '060101', '060201', '060301', '060501', '040101', '040102']);
    }
  });
});

describe('suggestFromCatalog — camada 1 (7b)', () => {
  const sugere = (nome: string) => suggestFromCatalog(nome, CATALOGO_SERVICOS_FISCAIS);

  it.each([
    ['Escova progressiva', 'cabeleireiro', '060101'],
    ['Design de sobrancelha', 'estetica', '060201'],
    ['Drenagem linfática', 'massagem', '060301'],
    ['Unhas em gel', 'manicure', '060101'],
    ['CORTE MASCULINO', 'cabeleireiro', '060101'],
  ])('"%s" → %s (%s), origem dicionario', (nome, key, cTribNac) => {
    const [primeira] = sugere(nome);
    expect(primeira).toMatchObject({ key, cTribNac, origem: 'dicionario' });
    expect(primeira.termo).toBeDefined();
  });

  it('nome sem casamento ⇒ []', () => {
    expect(sugere('Consultoria financeira')).toEqual([]);
  });

  it('6.02 × 4.01 depende de quem executa: "Preenchimento labial" sugere médico E biomédico, o usuário escolhe', () => {
    expect(sugere('Preenchimento labial').map((s) => s.cTribNac)).toEqual(['040101', '040102']);
  });

  it('sinônimo mais longo vem primeiro e o máximo é 3', () => {
    const catalogo: ServiceFiscalCatalogItem[] = [
      { key: 'a', label: 'A', cTribNac: '060101', sinonimos: ['pele'], fonte: 'x' },
      { key: 'b', label: 'B', cTribNac: '060201', sinonimos: ['limpeza de pele'], fonte: 'x' },
      { key: 'c', label: 'C', cTribNac: '060301', sinonimos: ['limpeza'], fonte: 'x' },
      { key: 'd', label: 'D', cTribNac: '060501', sinonimos: ['profunda'], fonte: 'x' },
    ];
    expect(suggestFromCatalog('Limpeza de pele profunda', catalogo).map((s) => s.key)).toEqual(['b', 'a', 'c']);
  });

  it('normaliza acento, caixa, pontuação, stopword e plural simples', () => {
    expect(normalizarTermos('Hidratações  CAPILARES, das pontas!')).toEqual(['hidratacoe', 'capilare', 'ponta']);
    expect(normalizarTermos('Hidratação capilar')).toEqual(['hidratacao', 'capilar']);
  });
});
