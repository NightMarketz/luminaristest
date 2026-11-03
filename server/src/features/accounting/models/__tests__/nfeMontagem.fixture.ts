import { montarNfe, numerarNfe, type MontagemNfeInput } from '../nfeMontagem';
import type { NfePayload } from '../../dtos/NfePayloadDto';

/** BE-INCR-NFCE PR-3 — NFC-e do Simples válida (CRT 1, SP capital), base dos testes do schema e da montagem. */
export function inputNfce(over: Partial<MontagemNfeInput> = {}): MontagemNfeInput {
  return {
    mod: 65,
    ambiente: 'producao',
    serie: 1,
    dhEmi: '2026-10-26T14:30:00-03:00',
    codMun: '3550308',
    crt: 1,
    emit: {
      cnpj: '11222333000181',
      razaoSocial: 'Salao Exemplo Ltda',
      ie: '111222333444',
      logradouro: 'Rua Exemplo',
      numero: '100',
      complemento: null,
      bairro: 'Centro',
      municipio: 'Sao Paulo',
      cep: '01001000',
    },
    dest: null,
    itens: [
      {
        productRef: 'prod-1',
        xProd: 'Shampoo 300ml',
        qty: 2,
        vProdCents: 5999,
        perfil: { ncm: '33051000', cest: null, origem: 0, cfopPadrao: '5102', csosn: '102', uCom: 'UN', cEan: 'SEM GTIN', cstPis: '49', cstCofins: '49' },
      },
    ],
    tPag: '17',
    ...over,
  };
}

/** A mesma nota, numerada (nNF 7, cNF fixo) — a forma que o `NfePayloadSchema` valida. */
export function nfceNumerada(over: Partial<MontagemNfeInput> = {}): NfePayload {
  return numerarNfe(montarNfe(inputNfce(over)), 7, '48151623');
}
