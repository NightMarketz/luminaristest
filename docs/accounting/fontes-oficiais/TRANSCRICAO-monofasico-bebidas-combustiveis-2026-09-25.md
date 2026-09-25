# Transcrição — monofásico de PIS/COFINS: bebidas frias e combustíveis (2026-09-25)

> Passo 1.5 do `docs/accounting/PLANO-POS-CONTADOR-2026-09-23.md` (Fase 1, lacuna **C-2**), autorizado pelo dono
> em 25/09 ("Instrumenta a Fase 1"). Insumo do teste-guarda C-2 e da correção futura (passo 1.8, **não autorizada**).
>
> **Método** (memória `tabela-transcrita-de-lei`): redação **vigente** da versão compilada do Planalto; trechos
> em `<strike>` (redação revogada) descartados; **chave = ordinal da fonte** (artigo + inciso), nunca um número
> nosso. Texto copiado do HTML baixado por `node scripts/baixar-fontes-oficiais.mjs --so=<id>`; sha no `MANIFEST.md`.
> **Nada aqui é sign-off** — o contador segue sendo o oráculo.

## A. Bebidas frias — Lei 13.097/2015 (`lei-13097-2015`, sha256 `c6679a9a9fa3`)

URL: <http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13097.htm> — baixada em 2026-09-25.
O art. 14 não tem nota "Redação dada por" na versão compilada (redação original = vigente).

**Art. 14** — produtos alcançados, por código da TIPI (Decreto 7.660/2011):

| chave | texto vigente (literal) | prefixo NCM derivado | exceções não avaliáveis pelo NCM |
|---|---|---|---|
| `L13097-art14-I` | "2106.90.10 Ex 02;" | `21069010` | o regime vale **só** para o Ex 02 — o código inteiro NÃO é monofásico; não derivável do NCM |
| `L13097-art14-II` | "22.01, exceto os Ex 01 e Ex 02 do código 2201.10.00;" | `2201` | Ex 01/02 de 2201.10.00 |
| `L13097-art14-III` | "22.02, exceto os Ex 01, Ex 02 e Ex 03 do código 2202.90.00; e" | `2202` | Ex 01/02/03 de 2202.90.00 |
| `L13097-art14-IV` | "22.02.90.00 Ex 03 e 22.03." | `2203` (+ `22029000` Ex 03) | — |

**Parágrafo único do art. 14** (restrição de produto nas posições 22.01 e 22.02): alcança "exclusivamente, água e
refrigerantes, chás, refrescos, cerveja sem álcool, repositores hidroeletrolíticos, bebidas energéticas e compostos
líquidos prontos para o consumo" com inositol, glucoronolactona, taurina ou cafeína como ingrediente principal.

**O que decide o crédito na aquisição** (é isto que o C-2 mede):

| chave | regra vigente (resumo; texto no HTML) |
|---|---|
| `L13097-art17` | varejista = receita de venda de bens **e serviços** a consumidor final ≥ 75% da receita total do ano anterior |
| `L13097-art28` | alíquota **zero** na receita de venda dos produtos do art. 14 auferida pelo **varejista** (art. 17); § 1º I: não se aplica a quem industrializa/importa/é equiparado (art. 18) |
| `L13097-art29` | **vedado** o crédito (arts. 30/31 desta lei e art. 3º I das Leis 10.637/10.833) sobre os produtos do art. 14 **revendidos com a redução do art. 28** (red. Lei 13.137/2015) |
| `L13097-art30` | não-cumulativo **pode** creditar na aquisição dos produtos do art. 14; § 1º: crédito = **valores informados na nota** pelo vendedor (art. 36), não 1,65%/7,6%; § 2º: de fornecedor do Simples, 0,38% + 1,60% sobre o valor de aquisição |

**Leitura (inferida, rotulada):** para o varejista (salão com receita ≥ 75% a consumidor final) que revende a
bebida, art. 28 + art. 29 ⇒ **sem crédito** — é o `MONOFASICO` do código. Para quem **não** é varejista, o
art. 30 dá crédito **pelo valor da nota**, regra que o modelo atual (`TRIBUTADO` = 1,65% + 7,6% sobre base) não
tem. Isso é ACHADO para a correção (1.8), não decisão desta transcrição.

## B. Combustíveis — BLOQUEADO (fonte oficial abre, mas não traz NCM)

| fonte lida (Planalto, versão compilada, 2026-09-25) | o que traz |
|---|---|
| Lei 9.718/1998 art. 4º (`lei-9718-1998`, sha256 `dab540ec7cd2`) | "gasolinas e suas correntes, exceto gasolina de aviação" (I), "óleo diesel e suas correntes" (II), "gás liquefeito de petróleo - GLP derivado de petróleo e de gás natural" (III, red. Lei 11.051/2004) — **produtos, sem código TIPI** |
| Lei 9.718/1998 art. 5º | álcool (produtor/importador) — sem código TIPI |
| Lei 10.865/2004 (`lei-10865-2004`) | só 2711.12/2711.13 como **propelente de aerossol** (fora do monofásico) |
| Lei 10.560/2002, Lei 11.116/2005, MP 2.158-35/2001, Decreto 5.059/2004 (baixados fora do corpus, grep por 27.10/27.11/22.07/38.26) | nenhum código TIPI |

**Conclusão:** a correspondência produto → NCM dos combustíveis **não está em lei** lida; vive em ato infralegal ou
na Tabela 4.3.10 da EFD-Contribuições (tabela externa do SPED, cuja página de consulta não expôs link de download
nesta sessão). Pela regra do pedido ("se a fonte oficial não abrir, PARE; não transcreva de memória"), **nenhum NCM
de combustível foi transcrito** e a metade "combustível" do teste C-2 **não foi escrita**. Destrava com: a fonte
oficial da correspondência (Tabela 4.3.10 do SPED ou IN RFB) baixada para o corpus.
