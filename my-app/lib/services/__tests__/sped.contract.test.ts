/**
 * Guarda de TIPO do contrato gerado (PRE-ADR-FE-CONTRACT-TYPES, plano §6.2 item 9). Morde no
 * `npm run test:types` (tsc sobre os testes): cada `@ts-expect-error` abaixo vira erro de
 * compilação se o tipo gerado deixar de recusar a forma errada — p.ex. se o J930 voltar a
 * aceitar `identQualif` (a regressão do #353 que o FE-FIX-SPED-ECD-SIGNERS corrigiu).
 */
import type { GenerateEcdPayload } from '../sped.service';

type EcdSignerInput = GenerateEcdPayload['signers'][number];

const valido: EcdSignerInput = {
  identNom: 'Contadora',
  identCpfCnpj: '12345678909',
  codAssin: '900',
  indRespLegal: 'N',
  indCrc: 'SP-123456/O-1',
  ufCrc: 'SP',
  email: 'c@exemplo.com',
  fone: '11999999999',
};

const comIdentQualif: EcdSignerInput = {
  identNom: 'Sócio',
  identCpfCnpj: '12345678909',
  codAssin: '205',
  indRespLegal: 'S',
  // @ts-expect-error — J930 não tem identQualif desde o C12 (#353); mandar a chave é 400.
  identQualif: '',
};

const codAssinForaDaTabela: EcdSignerInput = {
  identNom: 'Sócio',
  identCpfCnpj: '12345678909',
  // @ts-expect-error — codAssin é a Tabela de Qualificação do Assinante, não texto livre.
  codAssin: '123',
  indRespLegal: 'S',
};

const drafts = [{ nome: 'Sócio' }];
const viaMapAnotado = drafts.map(
  (d): EcdSignerInput => ({
    identNom: d.nome,
    identCpfCnpj: '12345678909',
    codAssin: '205',
    indRespLegal: 'S',
    // @ts-expect-error — .map COM retorno anotado checa chave extra (regra do mapper, G10).
    identQualif: '',
  }),
);

describe('contrato gerado — SPED ECD J930', () => {
  it('o arquivo compila sob test:types (a mordida é o tsc, não o runtime)', () => {
    expect([valido, comIdentQualif, codAssinForaDaTabela, ...viaMapAnotado]).toHaveLength(4);
  });
});
