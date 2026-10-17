# Relatório de pesquisa legal — lgpd-versoes-dt

**Pergunta:** Histórico de versões de linhas com dado pessoal: precisa ser eliminado junto com a linha (LGPD arts. 15, 16, 18)?
**Aberto em:** 2026-10-17T17:54:01-03:00 · **Atualizado em:** 2026-10-17T17:54:27-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
Sim. Versão antiga de uma linha com dado pessoal é o mesmo dado pessoal sob outro registro, e o término do
tratamento obriga a eliminá-lo ([D01] art. 16, caput). Quando o titular pede eliminação, ela alcança tudo
o que foi tratado ([D01] art. 18, VI). Na prática, para o ledger de versões das DynamicTables: as versões
de uma linha somem quando a linha é eliminada de vez (purga de 90 dias, exclusão da tabela, exclusão da
conta). O que se conserva são só as hipóteses do art. 16, I–IV, e nenhuma delas cobre "histórico de
edição" de tabela desenhada pelo usuário.

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Eliminação no término | LGPD art. 16, caput | [D01] | "serão eliminados após o término de seu tratamento" |
| Direito do titular | LGPD art. 18, VI | [D01] | "eliminação dos dados pessoais tratados com o consentimento do titular" |

## 3. Vigência conferida
- Alertas do acervo e como foram resolvidos (fonte oficial conferida? [Dnn]): nenhum alerta (compilada, cópia de 13/10/2026).
- Redação atual / alterações posteriores: art. 16 caput e art. 18 VI sem nota de redação posterior no trecho lido.
- Regulamentação pendente ou norma mais específica: não pesquisada; a conclusão de design (versões seguem o ciclo de vida da linha) não depende dela.

## 4. Ambiguidades (só o que precisa de decisão humana)
Nenhuma para o desenho. O prazo de 90 dias da purga já existe no código e não é alterado por este item.

## 5. Lacunas
Não se verificou se algum preset de DT carrega dado com obrigação legal de guarda (art. 16, I) — tabelas
desenhadas pelo usuário, por desenho (ADR-PERSISTENCE-BOUNDARY), não são o registro legal.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Lei nº 13.709 de 14/08/2018 — Acervo ctresb/leis (espelho de fonte oficial)  
  Acervo: <https://github.com/ctresb/leis/blob/183a6accb5801eb88fe63d57acdd375ae6339401/federal/leis-ordinarias/2018/lei-13709-2018-08-14.md>  
  Fonte oficial declarada: <https://normas.leg.br/?urn=urn:lex:br:federal:lei:2018-08-14;13709> · versao_texto: compilada (texto vigente) · cópia de 2026-10-13  
  Lido em 2026-10-17T17:54:07-03:00 · arquivo local `docs/D01_lei-13709-2018-08-14.md` · SHA-256 `72d32431037ce85955c6f959f50f11d10971a8ec36f93cdae5ee3459ec66a4dd`

## Registro de buscas
_Nenhuma busca registrada._
