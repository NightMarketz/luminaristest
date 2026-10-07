/**
 * BE-INCR-LEGAL-PARAMS PR-2 (emenda §9 L-8) — "hoje" do DTO estático, que não tem escopo (fuso da unidade): o dia
 * civil em America/Sao_Paulo, o fuso padrão do `AccountingScope`. Só decide qual linha de LC 116 / ISS máximo vale
 * para um cadastro feito agora; vigência nova entra no dia, nunca em UTC (memória teste-de-hoje-quebra-em-janela-utc).
 */
export function hojeDateOnly(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(agora);
}
