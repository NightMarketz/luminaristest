/**
 * Dependente do trabalhador — BE-INCR-DP-F2 itens 14 e 15 (PR-1). Funções puras; o número de regra (idade máxima do
 * salário-família) vem de `FOLHA_REGRA` (item 67), não do código.
 */
import { ValidationError } from '../../../lib/errors';
import { mensagemComRegra, type ValorRegra } from './regrasFolha';
import { vigenteEm, type Vigencia } from './vigencia';
import { idadeEm } from './vinculo';

export interface DependenteVigencia extends Vigencia {
  deduzIrrf: boolean;
}

/**
 * Item 14 — quantos dependentes vigentes em `data` deduzem o IRRF (Lei 9.250/1995 art. 4º III [D05]). O valor por
 * dependente vem da tabela do IRRF (G2), não daqui.
 */
export function dependentesIrrfNaData(dependentes: readonly DependenteVigencia[], data: string): number {
  return dependentes.filter((d) => d.deduzIrrf && vigenteEm(d, data)).length;
}

/**
 * Item 15 — tipos da Tabela 07 do eSocial que são "filho ou equiparado" para o salário-família: Lei 8.213/1991 art. 65
 * remete ao art. 16 § 2º [D03], que equipara a filho "o enteado, o menor sob tutela e o menor sob guarda judicial"
 * (redação da Lei 15.108/2025). Leitura do executor, registrada no PR: 03 (filho ou enteado), 06 (irmão, neto ou bisneto
 * sob guarda judicial), 10 (menor pobre sob guarda judicial) e 11 (absolutamente incapaz sob tutela ou curatela).
 */
export const TIPOS_DEPENDENTE_SALARIO_FAMILIA = ['03', '06', '10', '11'] as const;

export interface DadosSalarioFamilia {
  tipo: string;
  nascimento: string;
  invalido: boolean;
  vigenteDesde: string;
}

/**
 * Item 15 — o dependente marcado para o salário-família tem de ser filho ou equiparado e, se não for inválido, ter menos
 * de `SALARIO_FAMILIA_IDADE_MAX` anos completos em `vigenteDesde` (Lei 8.213 art. 66: "até 14 anos de idade ou inválido
 * de qualquer idade" [D03]; leitura: o direito cessa ao completar a idade). O cálculo da cota não entra no F2 (F-DPF-7).
 * 400 sem `reason` (o BRIEF não nomeia código para o item 15), com o campo em `details.campo`.
 */
export function assertSalarioFamilia(d: DadosSalarioFamilia, idadeMax: ValorRegra<number>): void {
  if (!(TIPOS_DEPENDENTE_SALARIO_FAMILIA as readonly string[]).includes(d.tipo)) {
    throw new ValidationError(
      `O tipo ${d.tipo} da Tabela 07 não é filho nem equiparado (Lei 8.213/1991 arts. 65 e 16 § 2º); salarioFamilia exige ${TIPOS_DEPENDENTE_SALARIO_FAMILIA.join(', ')}.`,
      { campo: 'tipo' },
    );
  }
  if (!d.invalido && idadeEm(d.nascimento, d.vigenteDesde) >= idadeMax.valor) {
    throw new ValidationError(
      mensagemComRegra(`O salário-família vale para filho ou equiparado até {n} anos ou inválido ({fonte}); em ${d.vigenteDesde} o dependente já tem a idade.`, idadeMax),
      { campo: 'nascimento' },
    );
  }
}
