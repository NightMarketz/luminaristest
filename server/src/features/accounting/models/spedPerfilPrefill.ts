/**
 * BE-INCR-FISCAL-OBLIGATION-PROFILE (nó X13, PR-2, BRIEF itens 12–13; PRE-ADR F-OBP-7 → a; F-XP-1 → c).
 *
 * Funções PURAS que o `spedController` aplica ANTES do `.strict()` dos DTOs de geração — mesma "via barata" do
 * `expandSignerContacts` (F-CD8-a): serviços e DTOs de geração NÃO mudam.
 *
 * Preenchimento (item 12): cada chave do perfil entra no corpo SÓ se o corpo não a trouxe. Chave presente no corpo
 * VENCE e vai para `sobrescritos` quando o perfil tinha valor para ela — sobrescrita explícita, nunca ignorada
 * (memória `param-aceito-e-ignorado-e-bug`). Signatários: se o corpo traz `signers` ou `signerContactIds`, o perfil
 * não injeta nenhum (injetar o representante legal junto quebraria "exatamente 1 responsável legal" do J930).
 *
 * Gate de regime (item 13): só com perfil no ano. ECD nunca é recusada por regime (facultativa para quem não é
 * obrigado — IN RFB 2.003/2021 art. 3º §6º).
 */
import type { RegimeEmpresa } from './regimeEmpresa';

export type SpedTarget = 'ecd' | 'ecf' | 'ecfReal';

export interface RepresentanteParaPrefill {
  nome: string;
  cpf: string;
  qualifEcd: string;
  qualifEcf: string;
  email: string;
  fone: string;
}

export interface PerfilParaPrefill {
  regime: RegimeEmpresa;
  grandePorte: boolean | null;
  declarante: Record<string, unknown> | null;
  ecdIndNire: string | null;
  ecdNire: string | null;
  ecdNumOrd: string | null;
  ecdNatLivr: string | null;
  ecfIndAliqCsll: string | null;
  ecfIndRecReceita: string | null;
  contadorContactId: string | null;
  representante: RepresentanteParaPrefill | null;
}

export interface ResultadoPrefill {
  body: Record<string, unknown>;
  sobrescritos: string[];
}

/** Chaves do declarante aceitas por arquivo — as do `DeclarantSchema` de cada DTO (0000 da ECD; 0000/0030 da ECF). */
const DECLARANTE_ECD = ['nome', 'cnpj', 'uf', 'ie', 'codMun', 'im'] as const;
const DECLARANTE_ECF = ['cnpj', 'nome', 'codNat', 'cnaeFiscal', 'endereco', 'num', 'compl', 'bairro', 'uf', 'codMun', 'cep', 'numTel', 'email'] as const;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Preenche `grupo` do corpo com `valores` (só as chaves com valor no perfil), acumulando os sobrescritos. */
function preencherGrupo(
  body: Record<string, unknown>,
  grupo: string,
  valores: Record<string, unknown>,
  sobrescritos: string[],
): void {
  const comValor = Object.entries(valores).filter(([, v]) => v !== null && v !== undefined);
  if (comValor.length === 0) return;
  const atual = body[grupo];
  if (atual !== undefined && !isObj(atual)) return; // forma errada: o DTO recusa com 400, como sempre
  const destino: Record<string, unknown> = { ...(atual ?? {}) };
  for (const [k, v] of comValor) {
    if (k in destino) sobrescritos.push(`${grupo}.${k}`);
    else destino[k] = v;
  }
  body[grupo] = destino;
}

export function aplicarPerfilNoCorpo(raw: Record<string, unknown>, perfil: PerfilParaPrefill, target: SpedTarget): ResultadoPrefill {
  const body: Record<string, unknown> = { ...raw };
  const sobrescritos: string[] = [];
  const dec = perfil.declarante ?? {};
  const pick = (keys: readonly string[]) => Object.fromEntries(keys.map((k) => [k, dec[k]]));

  if (target === 'ecd') {
    preencherGrupo(
      body,
      'declarant',
      {
        ...pick(DECLARANTE_ECD),
        indNire: perfil.ecdIndNire,
        indGrandePorte: perfil.grandePorte === null ? null : perfil.grandePorte ? '1' : '0',
      },
      sobrescritos,
    );
    preencherGrupo(body, 'book', { numOrd: perfil.ecdNumOrd, natLivr: perfil.ecdNatLivr, nire: perfil.ecdNire }, sobrescritos);
  } else {
    preencherGrupo(body, 'declarant', pick(DECLARANTE_ECF), sobrescritos);
    preencherGrupo(body, 'fiscal', { indAliqCsll: perfil.ecfIndAliqCsll, indRecReceita: perfil.ecfIndRecReceita }, sobrescritos);
  }

  const perfilTemSignatario = !!perfil.representante || !!perfil.contadorContactId;
  if (body.signers !== undefined || body.signerContactIds !== undefined) {
    if (perfilTemSignatario) sobrescritos.push('signers');
  } else {
    const r = perfil.representante;
    if (r) {
      body.signers = [
        target === 'ecd'
          ? { identNom: r.nome, identCpfCnpj: r.cpf, codAssin: r.qualifEcd, email: r.email, fone: r.fone, indRespLegal: 'S' }
          : { identNom: r.nome, identCpfCnpj: r.cpf, identQualif: r.qualifEcf, email: r.email, fone: r.fone },
      ];
    }
    // O contador entra pela via já existente (`expandSignerContacts` → contactToJ930Signer / contactToEcf0930Signer).
    if (perfil.contadorContactId) body.signerContactIds = [perfil.contadorContactId];
  }
  return { body, sobrescritos };
}

export interface RecusaDeRegime {
  code: 'REGIME_DIVERGENTE' | 'OBRIGACAO_NAO_SE_APLICA';
  message: string;
}

/** Item 13 — recusa a geração da ECF para o regime errado. `null` = pode gerar. */
export function recusaDeRegime(target: SpedTarget, regime: RegimeEmpresa, ano: number): RecusaDeRegime | null {
  if (target === 'ecd') return null;
  if (regime === 'MEI' || regime === 'SIMPLES') {
    return {
      code: 'OBRIGACAO_NAO_SE_APLICA',
      message: `A empresa está no regime ${regime} em ${ano}: não entrega ECF (IN RFB 2.004/2021 art. 1º §1º I).`,
    };
  }
  const esperado: RegimeEmpresa = target === 'ecf' ? 'PRESUMIDO' : 'REAL';
  if (regime !== esperado) {
    return {
      code: 'REGIME_DIVERGENTE',
      message: `O perfil fiscal da empresa de ${ano} está em ${regime}; esta rota gera a ECF do ${esperado === 'PRESUMIDO' ? 'Lucro Presumido' : 'Lucro Real'}.`,
    };
  }
  return null;
}
