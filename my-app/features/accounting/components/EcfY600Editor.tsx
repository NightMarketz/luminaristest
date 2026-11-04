// React default import: tsconfig uses jsx:"preserve", so vitest/esbuild transforms JSX with the classic runtime.
import React, { useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { FiPlus, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import { Field, inputClass } from './spedFormParts';
import { formatBp } from '../lib/simplesGrid';
import { resolveError } from '../lib/resolveError';
import { formatDate } from '../lib/formatDate';
import type { Y600VigenciasState } from '../hooks/useY600Vigencias';
import {
  QUALIF_DIRIGENTE,
  VALOR_KEYS,
  emptyDirigente,
  emptySocio,
  qualifOptions,
  qualifRepLegOptions,
  retainForVigencias,
  type DirigenteDraft,
  type RepresentanteDraft,
  type SocioDraft,
  type ValoresDraft,
  type Y600Draft,
  type Y600Vigencia,
} from '../lib/ecfY600';

type TFn = (key: string, fallback: string, opts?: Record<string, string>) => string;

export interface EcfY600EditorProps {
  /** Ano da ECF já validado pelo painel (null = inválido; o hook não busca). */
  year: number | null;
  /** Estado de `useY600Vigencias` do painel — o painel valida e monta o payload sobre a MESMA lista, sem nova busca. */
  vigencias: Y600VigenciasState;
  value: Y600Draft;
  onChange: (next: Y600Draft) => void;
}

/** Rótulos dos 5 valores (campos 13–17 do Y600, p. 573) — só o nome do campo; a ajuda não orienta rateio (P3/P4 do BE). */
const VALOR_LABEL: Record<(typeof VALOR_KEYS)[number], [string, string]> = {
  remTrab: ['sped.y600.valor.remTrab', 'Remuneração do trabalho (VL_REM_TRAB)'],
  lucDiv: ['sped.y600.valor.lucDiv', 'Lucros/dividendos (VL_LUC_DIV)'],
  jurCap: ['sped.y600.valor.jurCap', 'Juros s/ capital próprio (VL_JUR_CAP)'],
  demRend: ['sped.y600.valor.demRend', 'Demais rendimentos (VL_DEM_REND)'],
  irRet: ['sped.y600.valor.irRet', 'IR retido na fonte (VL_IR_RET)'],
};

/**
 * Fallback pt das mensagens do Y600 (a chave i18n do `accounting.json` de cada idioma manda): os códigos do
 * `validateY600Draft` (`sped.y600.<código>`) e os do servidor (`sped.error.ECF_Y600_*`, item 11). Texto fixo da tela —
 * nunca repete nome nem CPF que venha do servidor.
 */
const Y600_MSG_PT: Record<string, string> = {
  'y600.semOcorrencia': 'A ECF exige ao menos um sócio, titular ou dirigente no Y600: cadastre os sócios ou adicione um dirigente.',
  'y600.qualifObrigatoria': 'Escolha a qualificação (QUALIF) de cada sócio e dirigente.',
  'y600.qualifIncoerente': 'Qualificação fora da tabela para esse caso (residência × PF/PJ) — escolha uma das opções da lista.',
  'y600.valorObrigatorio': 'Preencha os 5 valores do Y600 de cada sócio e dirigente (zero se não houve: 0,00).',
  'y600.valorInvalido': 'Valor em R$ inválido no Y600 — use o formato 1.234,56.',
  'y600.paisObrigatorio': 'Informe o país (código do Sped, 3 dígitos) do sócio não residente.',
  'y600.paisInvalido': 'País inválido: 3 dígitos da tabela do Sped, diferente de 105 (Brasil).',
  'y600.representanteIncompleto': 'Representante legal: informe o CPF e a qualificação juntos, ou deixe os dois em branco.',
  'y600.cpfInvalido': 'CPF inválido no Y600 (dirigente ou representante legal).',
  'y600.dtFimForaDoAno': 'A data de fim do dirigente tem de cair no ano da ECF.',
  'y600.dtFimAntesDoInicio': 'A data de fim do dirigente não pode ser anterior à de início.',
  'y600.percVotInvalido': 'Capital votante inválido: um percentual entre 0 e 100.',
  'error.ECF_Y600_COMPLEMENTO_FALTANDO': 'O cadastro de sócios mudou: há sócio do ano sem complemento. A lista foi recarregada — complete a linha nova e gere de novo.',
  'error.ECF_Y600_PARTNER_FORA_DO_ANO': 'O cadastro de sócios mudou: um sócio da lista não tem mais vigência no ano. A lista foi recarregada — gere de novo.',
  'error.ECF_Y600_PAIS_INCOERENTE': 'O país informado não bate com a residência do sócio no cadastro (residente sai com 105; não residente exige o país).',
  'error.ECF_Y600_QUALIF_INCOERENTE': 'A qualificação de um sócio ou do representante legal não vale para esse caso no Manual da ECF (p. 574).',
  'error.ECF_Y600_SEM_SOCIOS': 'A ECF exige ao menos um sócio, titular ou dirigente no Y600.',
  'error.ECF_Y600_LIMITE': 'O Y600 passou do número de linhas que a ECF aceita.',
};

/** Texto de um código do Y600 sob `sped.*` (ex.: `y600.valorObrigatorio`, `error.ECF_Y600_LIMITE`). */
export function y600Message(t: (key: string, fallback: string) => string, code: string): string {
  return t(`sped.${code}`, Y600_MSG_PT[code] ?? t('sped.y600.invalido', 'Y600 incompleto.'));
}

function QualifSelect({
  t, value, options, onChange, label, descPrefix,
}: { t: TFn; value: string; options: readonly string[]; onChange: (v: string) => void; label: string; descPrefix: string }) {
  return (
    <Field label={label}>
      <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{t('sped.y600.selecione', '— selecione —')}</option>
        {options.map((c) => {
          const desc = t(`${descPrefix}.${c}`, '');
          return <option key={c} value={c}>{desc ? `${c} — ${desc}` : c}</option>;
        })}
      </select>
    </Field>
  );
}

function ValoresFields({ t, value, onChange }: { t: TFn; value: ValoresDraft; onChange: (v: ValoresDraft) => void }) {
  return (
    <>
      {VALOR_KEYS.map((k) => (
        <Field key={k} label={t(VALOR_LABEL[k][0], VALOR_LABEL[k][1])}>
          <input
            type="text"
            inputMode="decimal"
            className={inputClass}
            placeholder="0,00"
            value={value[k]}
            onChange={(e) => onChange({ ...value, [k]: e.target.value })}
          />
        </Field>
      ))}
    </>
  );
}

function RepresentanteFields({
  t, value, tipo, onChange,
}: { t: TFn; value: RepresentanteDraft; tipo: 'PF' | 'PJ'; onChange: (v: RepresentanteDraft) => void }) {
  return (
    <>
      <Field label={t('sped.y600.repCpf', 'CPF do representante legal (opcional)')}>
        <input type="text" inputMode="numeric" className={inputClass} placeholder="11 dígitos" value={value.cpf} onChange={(e) => onChange({ ...value, cpf: e.target.value })} />
      </Field>
      <QualifSelect
        t={t}
        label={t('sped.y600.repQualif', 'Qualif. do representante')}
        value={value.qualif}
        options={qualifRepLegOptions(tipo)}
        descPrefix={`sped.y600.qualifRepLegDesc.${tipo}`}
        onChange={(qualif) => onChange({ ...value, qualif })}
      />
    </>
  );
}

const maskTaxId = (v: Y600Vigencia) => `${v.tipoPessoa === 'PF' ? 'CPF' : 'CNPJ'} •••${v.taxIdFinal}`;

function SocioRow({ t, v, value, onChange }: { t: TFn; v: Y600Vigencia; value: SocioDraft; onChange: (s: SocioDraft) => void }) {
  return (
    <div className="rounded-xl border border-neutral-800 p-3" data-testid={`y600-socio-${v.partnerId}`}>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold text-neutral-200">{v.nome}</span>
        <span className="text-neutral-500">{maskTaxId(v)}</span>
        <span className="text-neutral-500">
          {v.tipoPessoa} · {v.residenteBrasil ? t('sped.y600.residente', 'residente') : t('sped.y600.naoResidente', 'não residente')}
        </span>
        <span className="text-neutral-500">{t('sped.y600.participacao', 'Participação')} {formatBp(v.participacaoBp)}</span>
        <span className="text-neutral-500">
          {formatDate(v.entradaEm)} → {v.saidaEm ? formatDate(v.saidaEm) : t('sped.y600.semSaida', 'sem saída')}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QualifSelect
          t={t}
          label={t('sped.y600.qualif', 'Qualificação (QUALIF)')}
          value={value.qualif}
          options={qualifOptions(v.tipoPessoa, v.residenteBrasil)}
          descPrefix="sped.y600.qualifDesc"
          onChange={(qualif) => onChange({ ...value, qualif })}
        />
        {!v.residenteBrasil && (
          <Field label={t('sped.y600.pais', 'País (tabela do Sped, 3 dígitos)')}>
            <input type="text" inputMode="numeric" maxLength={3} className={inputClass} value={value.pais} onChange={(e) => onChange({ ...value, pais: e.target.value })} />
          </Field>
        )}
        <Field label={t('sped.y600.percVot', 'Capital votante % (opcional)')}>
          <input type="text" inputMode="decimal" className={inputClass} placeholder={formatBp(v.participacaoBp).replace('%', '')} value={value.percVot} onChange={(e) => onChange({ ...value, percVot: e.target.value })} />
        </Field>
        <RepresentanteFields t={t} tipo={v.tipoPessoa} value={value.rep} onChange={(rep) => onChange({ ...value, rep })} />
        <ValoresFields t={t} value={value.valores} onChange={(valores) => onChange({ ...value, valores })} />
      </div>
    </div>
  );
}

function DirigenteRow({
  t, value, onChange, onRemove,
}: { t: TFn; value: DirigenteDraft; onChange: (d: DirigenteDraft) => void; onRemove: () => void }) {
  return (
    <div className="rounded-xl border border-neutral-800 p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label={t('sped.y600.dirNome', 'Nome')}>
          <input type="text" className={inputClass} value={value.nome} onChange={(e) => onChange({ ...value, nome: e.target.value })} />
        </Field>
        <Field label={t('sped.y600.dirCpf', 'CPF')}>
          <input type="text" inputMode="numeric" className={inputClass} placeholder="11 dígitos" value={value.cpf} onChange={(e) => onChange({ ...value, cpf: e.target.value })} />
        </Field>
        <QualifSelect
          t={t}
          label={t('sped.y600.qualif', 'Qualificação (QUALIF)')}
          value={value.qualif}
          options={QUALIF_DIRIGENTE}
          descPrefix="sped.y600.qualifDesc"
          onChange={(qualif) => onChange({ ...value, qualif })}
        />
        <Field label={t('sped.y600.dtAltSoc', 'Início (DT_ALT_SOC)')}>
          <input type="date" className={inputClass} value={value.dtAltSoc} onChange={(e) => onChange({ ...value, dtAltSoc: e.target.value })} />
        </Field>
        <Field label={t('sped.y600.dtFimSoc', 'Fim no ano (DT_FIM_SOC, opcional)')}>
          <input type="date" className={inputClass} value={value.dtFimSoc} onChange={(e) => onChange({ ...value, dtFimSoc: e.target.value })} />
        </Field>
        <RepresentanteFields t={t} tipo="PF" value={value.rep} onChange={(rep) => onChange({ ...value, rep })} />
        <ValoresFields t={t} value={value.valores} onChange={(valores) => onChange({ ...value, valores })} />
        <div className="flex items-end">
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-2 text-xs text-neutral-400 hover:bg-neutral-700"
            aria-label={t('sped.y600.dirRemover', 'Excluir dirigente')}
          >
            <FiTrash2 size={14} /> {t('sped.y600.dirRemover', 'Excluir dirigente')}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * FE-INCR-ECF-Y600 PR-1 (BRIEF item 7) — o Y600 da ECF: um componente para o Presumido e o Real, porque o servidor reusa
 * `SocioEcfSchema`/`DirigenteEcfSchema` nos dois (como o `EcfSignersEditor`). Sócios: uma linha por vigência que a rota de
 * leitura devolve (a mesma seleção do gerador), com o cadastro só para leitura e o CPF/CNPJ mascarado; ao lado, o
 * complemento da ECF. Dirigentes: editor de linhas manual (F-FE-Y600-3 → a). Nada persiste (F-FE-Y600-6 → a).
 * O texto de ajuda não orienta o rateio dos valores entre vigências (P3/P4 do BE, pendentes do contador): só cita o campo.
 */
export function EcfY600Editor({ year, vigencias, value, onChange }: EcfY600EditorProps) {
  const { t } = useTranslation('accounting');
  const tt = t as unknown as TFn;
  const { vigencias: lista, loading, error, reload, somaParticipacaoFimBp } = vigencias;

  // Item 8 — troca de ano: só fica o complemento dos partnerId que seguem na lista; os dirigentes ficam.
  useEffect(() => {
    if (loading) return;
    const kept = retainForVigencias(value, lista);
    if (Object.keys(kept.socios).length !== Object.keys(value.socios).length) onChange(kept);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reage só à lista nova; value/onChange mudam a cada tecla
  }, [lista, loading]);

  const setSocio = (id: string, s: SocioDraft) => onChange({ ...value, socios: { ...value.socios, [id]: s } });
  const setDirigente = (i: number, d: DirigenteDraft) =>
    onChange({ ...value, dirigentes: value.dirigentes.map((x, idx) => (idx === i ? d : x)) });

  return (
    <div className="mt-5" data-testid="ecf-y600-editor">
      <h3 className="text-sm font-semibold text-neutral-300">{tt('sped.y600.title', 'Sócios, titular e dirigentes (Y600)')}</h3>
      <p className="mb-2 text-xs text-neutral-500">
        {tt('sped.y600.help', 'Os sócios vêm do cadastro; complete a qualificação e os 5 valores do ano (campos 13 a 17 do Y600). Valor vazio não vira zero: digite 0,00.')}
      </p>

      {loading && (
        <p className="text-sm text-neutral-500" role="status">{tt('sped.y600.carregando', 'Carregando os sócios do ano…')}</p>
      )}
      {!loading && error !== null && (
        <div role="alert" className="flex items-center gap-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          <span>{resolveError(error, tt('sped.y600.erroCarga', 'Erro ao carregar os sócios do ano.'))}</span>
          <button type="button" onClick={reload} className="inline-flex items-center gap-1 rounded-lg border border-red-900/50 px-2 py-1 text-xs hover:bg-red-950/50">
            <FiRefreshCw size={12} /> {tt('sped.y600.tentarDeNovo', 'Tentar de novo')}
          </button>
        </div>
      )}
      {!loading && error === null && year !== null && lista.length === 0 && (
        <div className="rounded-xl border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-300">
          {tt('sped.y600.semVigencias', 'Nenhum sócio com vigência em {{year}}. Cadastre os sócios ou informe ao menos um dirigente.', { year: String(year) })}
        </div>
      )}

      {!loading && error === null && lista.length > 0 && (
        <div className="space-y-2">
          {lista.map((v) => (
            <SocioRow key={v.partnerId} t={tt} v={v} value={value.socios[v.partnerId] ?? emptySocio()} onChange={(s) => setSocio(v.partnerId, s)} />
          ))}
          <p className="text-xs text-neutral-500">
            {tt('sped.y600.somaFim', 'Soma das participações vigentes em 31/12: {{soma}} (informativo, não bloqueia).', { soma: formatBp(somaParticipacaoFimBp) })}
          </p>
        </div>
      )}

      <div className="mt-4 mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold text-neutral-400">{tt('sped.y600.dirigentes', 'Dirigentes e conselheiros não sócios')}</h4>
        <button
          type="button"
          onClick={() => onChange({ ...value, dirigentes: [...value.dirigentes, emptyDirigente()] })}
          className="inline-flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-700"
        >
          <FiPlus size={13} /> {tt('sped.y600.dirAdicionar', 'Incluir dirigente')}
        </button>
      </div>
      <div className="space-y-2">
        {value.dirigentes.map((d, i) => (
          <DirigenteRow
            key={i}
            t={tt}
            value={d}
            onChange={(next) => setDirigente(i, next)}
            onRemove={() => onChange({ ...value, dirigentes: value.dirigentes.filter((_, idx) => idx !== i) })}
          />
        ))}
      </div>
    </div>
  );
}
