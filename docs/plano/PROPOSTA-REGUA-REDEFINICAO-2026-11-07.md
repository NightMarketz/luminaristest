# Proposta — redefinir a régua contábil/financeiro/fiscal (07/11/2026)

> **Estado:** **ratificada** pelo dono em 07/11 ("Recomendado em todas": Q1 a, Q2 a, Q3 a) e gravada em
> [[D-2026-11-07-REGUA-REDEFINICAO]]. O texto abaixo é o da proposta, sem edição. Grau por claim: **V** = verificado (li o arquivo), **I** = inferido, **A** = assumido.

**Em duas linhas.** A régua está em 55/63 (87,3%) desde pelo menos 26/10 e, **pelas regras de hoje, o teto é 61/63**:
dois nós (C9, X6) estão feitos e não podem contar (V). Dos outros seis, só X7 e X9 avançam por código; F5, F6 e X10a
esperam gate humano ou decisão do dono (V). Esta proposta separa "régua parada por definição" de "régua parada por
trabalho que falta" e deixa o dono decidir o que entra no placar.

---

## 1. Os 8 nós que não contam (V, frontmatter e `estado_detalhe` lidos em 07/11)

| Nó | Domínio | Estado | Por que não conta | Tipo do bloqueio |
|---|---|---|---|---|
| [[C9]] | contábil | `done` | `fecha_regua: false`; D-3 do [[DUVIDAS-INVENTARIO]] (dono, 25/09): absorvido no C8 | **definição** |
| [[X6]] | fiscal | `done` | `fecha_regua: false`; D-1 (leitura ratificada de 22/09: crescimento do nó NF-e) | **definição** |
| [[X10a]] | fiscal | `blocked` | código até o PR-9 em `main`, só com SEFAZ e PSC falsos; a prova real exige PSC + e-CNPJ ([[D5]]); [[D-2026-10-30-D5-SEM-CONTRATACAO-BYOK]]: o Luminaris não contrata | **decisão do dono** |
| [[X11]] | fiscal | `blocked` | depende de [[X10i]]; só o cancelamento e101101 existe, sem janela de prazo, substituição nem CC-e | **código + emissão** |
| [[F6]] | financeiro | `blocked` | Payouts do MP debita só a conta de quem integra; reabrir é BYOK ou Pix pelo banco do cliente | **decisão do dono** |
| [[F5]] | financeiro | `inflight` | boleto/Pix/CSV reais só na sonda do [[M2]]; chave do MP no env do M2 | **gate humano** |
| [[X7]] | fiscal | `inflight` | emenda de rastreio em `main` (#1013, 04/11); falta fechar o nó | **código** |
| [[X9]] | fiscal | `inflight` | depende de X7 | **código** |

Observação sobre o cálculo (V, `scripts/plano-vault.mjs` linhas 73–80 e `plano-vault.test.mjs` linha 57): nó com
`fecha_regua: false` **fica no denominador por desenho e por teste**. Q1 abaixo muda um comportamento deliberado.

## 2. Por que o placar não anda mesmo com o trabalho andando

1. **Teto de 61/63** enquanto C9 e X6 ficarem no total (V).
2. **O trabalho recente está fora da régua** (I): ISS-TRANSICAO-IBS, EFD-REINF, RETENCOES-FONTE, EFICIENCIA-FISCAL,
   PACOTE-VALIDADE e os FIX-* não têm `tipo: "regua"`, então fechá-los não muda o número.
3. **A régua F** (22 nós, [[D-2026-10-20-COMPLEMENTO-FIN-CTB-FIS]] Q1 a) é "própria" e não entrou no total (V: o total
   segue em 63). Se algum dia for somada, o denominador salta e o placar cai sem perda de trabalho.
4. **Três dos bloqueios são humanos** (F5/M2, F6 e X10a/D5) e as decisões deles são suas, não de código (V).

## 3. Perguntas ao dono

### Q1 — Tirar C9 e X6 do denominador?

- **(a) Sim (recomendado).** Se a decisão do dono foi "não conta", o item sai do total em vez de ficar como um
  pendente impossível. Régua passa a 55/61 (90,2%): contábil 21/21, fiscal 17/21. Custo: mudar o cálculo e o teste
  (`fecha_regua=false` passa a excluir do total) e registrar a decisão em `decisoes/`. Supera a D-3 e fecha a D-1.
- **(b) Não.** Mantém 55/63 e o teto de 61/63, e o placar passa a trazer a nota "2 nós feitos que não contam".

### Q2 — X10a: dado como completo contra adaptadores falsos? (X11 fica aberto)

Reverte em parte a D-2 de 29/09 ("X10a e X11 abertos", [[D-2026-09-29-ENTREVISTA-ONDAS-E-1O-CLIENTE]], decisão 6).
Motivo da reversão: o D5 de 30/10 tirou do projeto a contratação que a prova real exigia.

- **(a) Fechar o X10a** com a definição "adaptador, QR Code v3/CSC e contingência implementados e testados contra
  SEFAZ/PSC falsos; **prova real fica no gate D5 em modo BYOK, que continua `human-open`**". Fiscal 18/21 (com Q1) ou
  18/22 (sem Q1). **Recomendado.**
- **(b) Fechar X10a e X11.** Só se você confirmar que o resíduo do X11 (janela de prazo, substituição, CC-e) também
  depende só da emissão real. **Não verifiquei isso (A):** o fold de 29/09 descreve lacunas de código, não de oráculo.
- **(c) Manter os dois abertos**, aceitando que não fecham dentro do escopo atual.

### Q3 — F6 (Pix de saída) passa a diferido?

- **(a) Diferir (recomendado).** Sai do total e ganha nota em `diferidos/` com a condição de reabertura: "cliente como
  integrador (BYOK, F-PP-1 b) ou Pix pelo banco do cliente (D6)". Financeiro 17/18.
- **(b) Manter `blocked`** no total.

## 4. Efeito combinado

| Cenário | Fechados | Total | % | Abertos que sobram |
|---|---|---|---|---|
| Hoje | 55 | 63 | 87,3% | C9*, X6*, F5, F6, X7, X9, X10a, X11 |
| Q1 (a) | 55 | 61 | 90,2% | F5, F6, X7, X9, X10a, X11 |
| Q1 (a) + Q2 (a) | 56 | 61 | 91,8% | F5, F6, X7, X9, X11 |
| Q1 (a) + Q2 (a) + Q3 (a) | 56 | 60 | 93,3% | F5, X7, X9, X11 |
| Q1 (a) + Q2 (b) + Q3 (a) | 57 | 60 | 95,0% | F5, X7, X9 |

\* feitos, mas não contados.

## 5. Riscos desta proposta (objeção calibrada)

- **Mover a trave.** Subir de 87% para 93% sem entregar código parece maquiagem. Mitigação: a nota do X10a e o
  placar passam a trazer a linha "**prova real pendente: D5 (BYOK)**", e o gate D5 continua aberto. Nada do Bloco A
  fecha por esta proposta.
- **Perder o histórico.** Mudar o denominador quebra a comparação com os banners antigos (9/16, 10/16…). Mitigação:
  guardar a nota "régua v1: 63 nós, medida até 07/11" e publicar o número novo como "v2".
- **Régua F.** Esta proposta **não** a soma ao total. Sugestão: manter dois placares (v2 e F) em vez de um só,
  para o salto do denominador não esconder o progresso.
- **Não é aparato de auditoria novo.** Muda um filtro do índice gerado e um teste; não cria gate, rodada nem revisor
  (⛔ do `CLAUDE.md` raiz respeitado).

## 6. Se aprovado, o trabalho é pequeno

1. Nota em `decisoes/` citando as respostas Q1–Q3 (autorização do dono).
2. Q1 (a): ajustar `scripts/plano-vault.mjs` para excluir `fecha_regua: false` do total, e o teste da linha 57.
3. Q2 (a): fold da nota X10a com a nova definição de "feito" e o item "prova real pendente: D5".
4. Q3 (a): mover F6 para `diferidos/` com a condição de reabertura; ajustar `depende_de` de quem apontar para ele.
5. `node scripts/plano-vault.mjs check` e regerar o índice.

**Fora do escopo:** esta proposta não diz nada sobre a lista de espera, os gates H1/H2/M2/D5 nem a régua F. A régua
mede o fechamento do escopo de setembro; a decisão de abrir a landing se apoia nos gates e nas promessas da página.
