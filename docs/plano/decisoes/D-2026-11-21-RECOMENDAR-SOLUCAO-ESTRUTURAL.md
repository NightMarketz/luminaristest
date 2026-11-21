---
id: "D-2026-11-21-RECOMENDAR-SOLUCAO-ESTRUTURAL"
tipo: "decisao"
dominio: "processo"
titulo: "Ao propor solução, a opção estrutural (causa raiz no lugar certo da arquitetura) é sempre gerada e é a recomendação padrão; o remendo entra só como alternativa"
estado: "decided"
autorizacao: "dono, chat, 2026-11-21: \"Vamos pesquisar pq suas sugestões de solução sempre vem a opção recomendada como remendo e a completa que leva em consideração arquitetura, qualidade de código e solução real as vezes nem é citada\"; depois do diagnóstico e da proposta de correção: \"Sim, aplica tudo\""
atualizado: "2026-11-21"
---
# D-2026-11-21-RECOMENDAR-SOLUCAO-ESTRUTURAL

**Estado:** `decided`. Estende a memória `dono-quer-completude-nao-mvp` (07/09) de "fork e escopo funcional" para
**arquitetura e qualidade de código**, e a torna regra sempre carregada (`CLAUDE.md` §Como propor solução).

## Por quê (diagnóstico de 21/11)

O dono observou: a opção recomendada vinha como remendo, e a solução completa às vezes nem aparecia.

**Caso que mostra o padrão (verificado).** PR #1250 (wizard, 13/11) recomendou "Correção (menor raio)": `!` nas
utilitárias de 4 arquivos. A estrutural só apareceu como "(b) zerar a especificidade em todo o app", recusada porque
mudaria 84 inputs sem revisão visual. A solução que ficou ([D-2026-11-13-REGRA-GLOBAL-INPUT-MIGRACAO-POR-TELA](D-2026-11-13-REGRA-GLOBAL-INPUT-MIGRACAO-POR-TELA.md))
foi uma **terceira**, não gerada no PR: a correção estrutural com opt-in por campo (`data-own-style`), migrada tela a
tela, removendo o `!`. O dilema foi montado como "remendo × big-bang", e o risco do big-bang virou argumento para o remendo.

**Contraexemplo (verificado).** Em fork formal (W3, X11), a memória de completude funcionou: o regex tolerante foi
rejeitado como "remendo" na [D-2026-10-15-W3-CONFIRMACAO-RESUMO](D-2026-10-15-W3-CONFIRMACAO-RESUMO.md). A falha mora nas
propostas de improviso: corpo de PR, pergunta de fim de turno, relatório de sessão de correção.

**Causas:**

1. A regra de completude vivia só na memória, com escopo "fork" e "escopo funcional", e o item 2 dela mantinha
   "minimalismo na forma do código (… sem camada extra)", o que autorizava o remendo arquitetural. (verificado no texto)
2. Regras sempre carregadas puxavam para o mínimo, sem dizer que tratam de outra coisa: "o minimalismo morde no fix
   pontual" (`CLAUDE.md`), T6 "patch não rewrite" (sobre revisar artefato quase certo, lido como "prefira remendo"),
   `sessao-correcao` "diff mínimo" + "PARE" quando a causa raiz está fora da localização (a estrutural saía da conversa),
   regra de lacuna "não corrigir fora do escopo". (verificado no texto)
3. Custo de processo como argumento implícito: classe vermelha (`prisma`/`accounting`), saída do OPS-006 leve (> 30
   linhas), revisão visual. (inferido; sinal no "menor raio" do #1250)
4. Prompt do harness: "não narre opções que não vai seguir", "dê uma recomendação, não um levantamento", `wrap_up` com 1–2
   botões. Fora do repo; instrução do `CLAUDE.md` tem precedência. (verificado no texto)
5. Investigação rasa: a estrutural só nasce se a arquitetura em volta foi lida. (inferido)

## Regra

1. **Sempre gere a opção estrutural**: a que corrige a causa raiz no lugar que a arquitetura do projeto (Contrato, ADRs,
   camada dona) designa. Se ela parecer arriscada ou grande, **gere a versão incremental dela** (opt-in, migração por
   etapa, flag, PR-0 de contrato) antes de cogitar o remendo. "Remendo × tudo de uma vez" é dilema falso até prova em contrário.
2. **A recomendação padrão é a estrutural** (ou sua versão incremental). O remendo só entra como alternativa, nomeando o
   que deixa aberto e quando sai; só é recomendado quando é **etapa declarada** da estrutural (contenção com data e
   item na caixa), nunca como destino.
3. **Raio, tamanho de PR, classe vermelha e cerimônia são insumo de plano, não argumento.** Viram fatiamento (pilha,
   integração, PR-0), não opção menor.
4. **Não sei descrever a estrutural → investigo antes de propor** (ler a camada dona, o ADR, o canônico). Propor só o
   remendo por falta de leitura é a falha que esta decisão fecha.
5. **Estrutural fora do escopo da sessão não some**: vai descrita no relatório/PR e na pergunta ou cartão (e na caixa,
   OPS-007). "Não é desta sessão" muda quem faz, não se é citada.
6. **O minimalismo continua valendo só para a forma**: sem abstração especulativa, sem generalização sem segundo caso.
   Camada, contrato, dono certo do dado e correção na causa não são "forma"; são a solução.

## Onde a regra entra

- `CLAUDE.md` §Como propor solução (sempre carregado).
- `.claude/skills/sessao-correcao/SKILL.md` — nota aditiva: o "PARE e reporte" leva a descrição da estrutural.
- `docs/operating-manual/REASONING-TRAITS.md` T6 — fronteira: trata de revisar artefato quase certo, não da escolha
  remendo × causa raiz.
- Memória `dono-quer-completude-nao-mvp` — estendida a arquitetura; o item "sem camada extra" sai.
