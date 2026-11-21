# Handoff — aba "1 · Regime" do Simulador Tributário do Salão (20/11/2026)

> **Atualização de 20/11/2026, à noite: a aba Regime está FEITA (versão 9 do artefato, sobre a v8 da aba DAS).**
> Lacuna a3a5 também na caixa: o Anexo XX soma 100,01% nas faixas 3 e 4.
> - Pesquisa: `relatorio.md` §1.10, com D22–D37. D37 é o Decreto 3.048, Anexo V, capturado no navegador.
> - Fonte publicada: `artefatos/simulador-tributario-salao.html`. É a v7, mesclada sobre a v6 com cadastro de equipe.
> - Lacunas na caixa: 3f49 (revenda), 2539 (INSS sobre 13º e férias), 7064 (prazo da opção § 10 × § 11), c574 (FPAS
>   515) e 4e7d (dossiê duplicado entre worktrees).
> - O texto abaixo é o pedido original, mantido como histórico.

## Pedido do dono (chat, 20/11/2026)
"agora o regime". No questionário, o dono marcou as 4 opções para a aba **1 · Regime** do simulador:
1. **Os 3 regimes** lado a lado (Simples, Presumido e Real), com a conta aberta tributo por tributo. Antes, pesquisar
   a lei do Lucro Real (PIS/Cofins não cumulativos e créditos) e salvar no dossiê.
2. **2026 e 2027 lado a lado**: CBS/IBS no lugar de PIS/Cofins, e a opção do Simples pelo regime regular de IBS/CBS.
3. **Simples × Presumido mais didático**, no estilo da aba Demonstrativo.
4. **Ponto de virada**: a partir de qual faturamento ou folha o Presumido (ou o Real) passa a valer mais que o Simples.

## Feito
- **Parecer** `pesquisas-legais/parecer-salao-sp-4-pessoas/relatorio.md` (21 normas com hash em `docs/`).
  - Errata: o teto do lucro isento desconta **só o IRPJ do DAS** (Res. CGSN 140 art. 145 § 1º, [D13]).
  - Nada foi commitado.
- **Artefato 1**, Máquina Fiscal do Salão: https://claude.ai/artifact/R4Pyd5H1wfU73J6GCZ4Nc3
  (fonte: `artefatos/maquina-fiscal-salao.html`).
- **Artefato 2**, Simulador Tributário do Salão (v3): https://claude.ai/artifact/4T2JYWqnJXm9e6p2aUfDLu
  (fonte: `artefatos/simulador-tributario-salao.html`).
  - Tem 10 abas, com rota por hash: `ficha`, `catalogo`, `regime`, `das`, `equipe`, `parceria`, `lucro`, `calendario`,
    `decisoes`, `demonstrativo`.
  - A conta fica entre `/* ===== CALC` e `/* ===== /CALC` (função pura `cenario(x, modo)`).
  - Tabelas conferidas no texto da lei:
    - `T3` = Anexo III de 2026 e 2027 (na 6ª faixa de 2027, 32,90%);
    - `T1` = Anexo I;
    - `P3` = partilha (2027 pelo Anexo XX da LC 214 [D11]).
  - A aba Regime é renderizada no bloco `// 1 regime` de `render()` (`#o1`).
  - Hoje compara só Simples × Presumido (2026), sem RAT nem terceiros.
- **Lacunas na caixa** (`node scripts/lacunas.mjs list`): cf77, 94cc, f599, 7668, 5fda (e217 resolvida).

## Pendente (o pedido acima)
1. **Pesquisa legal** (método: `legal.py` no dossiê `parecer-salao-sp-4-pessoas`; acervo primeiro):
   - **Lucro Real:**
     - PIS 1,65%: Lei 10.637 art. 2º; créditos no art. 3º.
     - Cofins 7,6%: Lei 10.833 art. 2º; créditos no art. 3º (aluguel pago a PJ, energia, insumo do serviço, depreciação).
     - IRPJ 15% + adicional (Lei 9.249 art. 3º, já em [D08]); CSLL 9% ([D17]); estimativa mensal × trimestral (Lei 9.430).
   - **Encargos da folha fora do Simples:**
     - RAT 1/2/3%: Lei 8.212 art. 22 II, já em [D05]; conferir o grau do CNAE 9602-5/01.
     - Terceiros: salário-educação 2,5% (Lei 9.424 art. 15) e Sistema S (SESC/SENAC/SEBRAE/INCRA).
     - Se não achar o texto vigente, deixar como campo da ficha, não como número inventado.
   - **2027 fora do Simples:**
     - CBS e IBS no regime regular (LC 214): alíquota de referência de 2027.
     - Fim de PIS/Cofins: LC 214 art. 542.
     - Crédito amplo e serviço estético sem crédito ao tomador (art. 57, já lido).
   - **Simples em 2027:** opção semestral pelo regime regular de IBS/CBS (LC 123 art. 13 § 10, red. LC 214; ver o
     PRE-ADR-SIMPLES-NACIONAL-CALCULO).
   - Registrar tudo no `relatorio.md` (seções 1, 2 e 3) com [Dnn].
2. **Aba Regime:**
   - três colunas (Simples, Presumido, Real) × dois anos, com a conta aberta;
   - ponto de virada: varrer o faturamento e a folha e achar onde as curvas se cruzam, num gráfico em escala;
   - novos campos na ficha, se preciso: RAT e terceiros (%), despesas que dão crédito de PIS/Cofins no Real.
3. **Testar:**
   - extrair o bloco CALC e rodar com node (o exemplo precisa continuar dando DAS de R$ 3.930 e Presumido de
     R$ 9.732 em 2026, sem RAT nem terceiros);
   - uma olhada só: `python -m http.server 8765 --bind 127.0.0.1` numa pasta com a cópia embrulhada em
     `<meta charset="utf-8">`, depois abrir no navegador embutido.
4. **Publicar no mesmo link.** De outra sessão: `Artifact` com `action: "read"` e o `url` do simulador primeiro;
   depois publicar com `url`.
5. Atualizar `artefatos/simulador-tributario-salao.html` com a versão publicada.

## Próximo comando exato
```
python ~/.claude/tools/pesquisa-legal/legal.py acervo parecer-salao-sp-4-pessoas federal/leis-ordinarias/2002/lei-10637-2002-12-30.md federal/leis-ordinarias/2003/lei-10833-2003-12-29.md federal/leis-ordinarias/1996/lei-9430-1996-12-27.md federal/leis-ordinarias/1996/lei-9424-1996-12-24.md
```
(Se o nome do arquivo não bater: `gh api "repos/ctresb/leis/git/trees/main:federal/leis-ordinarias/2002" --jq '.tree[].path' | grep 10637`.)
