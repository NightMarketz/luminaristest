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

## B. Combustíveis — DESTRAVADO 2026-09-27 (fonte: Tabela 4.3.10 da EFD-Contribuições, v1.25)

> **O que estava bloqueado e por quê.** A leitura de 25/09 (mantida abaixo, em B.2) concluiu certo: a Lei
> 9.718/1998 art. 4º nomeia **produtos**, não códigos TIPI, e nenhuma das leis lidas traz a correspondência.
> Ela também nomeou a fonte que faltava — a **Tabela 4.3.10 da EFD-Contribuições** — e registrou que a página
> de consulta não expôs link de download. Em 27/09 o link foi obtido (`/arquivo/download/1638`), o arquivo
> baixado e adicionado ao corpus (`tabela-4310-efd` no MANIFEST). A conclusão de 25/09 não estava errada;
> faltava o arquivo.

### B.1 Linhas VIGENTES do grupo COMBUSTÍVEIS (chave = **código da própria tabela**)

Critério: só entram linhas com **"Término de Escrituração" vazio** na v1.25 (30.03.2026) e com NCM preenchido.
As alíquotas são por unidade de medida (R$/m³, R$/t) e **não** são usadas pelo modelo — ele classifica regime,
não calcula tributo do vendedor.

| chave | descrição (literal) | NCM na tabela | prefixo derivado | início |
|---|---|---|---|---|
| `T4310-101` | Gasolinas, Exceto Gasolina de Aviação | 2710.12.59 | `27101259` | 01/2012 |
| `T4310-102` | Óleo Diesel | 2710.19.21 | `27101921` | 01/2011 |
| `T4310-103` | Gás Liqüefeito de Petróleo – GLP | 2711.19.10 | `27111910` | 01/2011 |
| `T4310-104` | Querosene de Aviação | 2710.19.11 | `27101911` | 01/2011 |
| `T4310-109` | Biodiesel | 3826.00.00 (+ Ex 01) | `38260000` | 01/2012 |
| `T4310-112` | Álcool, Inclusive para Fins Carburantes – Venda por Produtor ou Importador | 2207.10 · 2207.20.1 · 2208.90.00 Ex 01 | `220710` · `2207201` | 01/05/2025 |
| `T4310-117` | Álcool … venda direta do produtor/importador às PJ do art. 68-B II e III da Lei 9.478/1997 | 2207.10.00 · 2207.20.10 · 2208.90.00 Ex 01 | (mesmos prefixos do 112) | 01/05/2025 |

**Encerradas — NÃO entram** (a tabela as mantém por histórico de escrituração): `101` com 2710.11.59 (até
31/12/2011, a NCM mudou para 2710.12.59), `109` com 3824.90.29 (até 31/12/2011), `112`/`113`/`117` com
2207.10.00/2207.20.10 (até 30/04/2025) — a partir de 01/05/2025 as linhas vigentes usam os prefixos `2207.10`
e `2207.20.1`. Aplica a memória `tabela-transcrita-de-lei-conferir-redacao-vigente`: a versão compilada tem as
duas redações e só a de término vazio vale.

**Sem NCM na fonte (não modeláveis):** `105`/`106` correntes destinadas à formulação de gasolina/diesel,
`107`/`108` nafta petroquímica para formulação, `150`–`153` nafta/condensado para centrais petroquímicas — a
coluna NCM traz `-`. Continuam fora da tabela do código; se aparecerem numa nota, caem no caminho do CST.

**`2208.90.00 Ex 01`** (álcool etílico dentro de um código de bebida) **não entra**: "Ex" da TIPI não é
avaliável pelo NCM de 8 dígitos, e aqui o conservador é o inverso do usual — marcar `22089000` inteiro como
monofásico classificaria bebida alcoólica comum como sem crédito. Mesmo tratamento que o `2106.90.10 Ex 02`
recebeu em A (lá o código inteiro entrou porque a exceção é do próprio grupo de bebidas frias).

**Limite declarado:** a tabela distingue vendedor (produtor/importador × distribuidor × varejista) por
**código**, não por NCM. O modelo classifica só o regime do produto — a distinção de vendedor muda alíquota,
não o fato de ser monofásico, e é isso que a regra do crédito usa.

### B.2 Leitura de 25/09 — por que as leis não bastavam (mantida como registro)

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
