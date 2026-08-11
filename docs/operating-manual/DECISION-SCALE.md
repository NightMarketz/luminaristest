# Escala de decisão — categoria (quem responde) × nível (quanta cerimônia)

> **Operacionalização do `[OPS-006]`.** Duas perguntas, nesta ordem, antes de qualquer decisão:
> **(1) que tipo de conhecimento responde isto?** → categoria `C1–C5`, define **quem** responde.
> **(2) quanto custa errar?** → nível `D1–D5`, define **quanta cerimônia** e se chega ao dono.
> Nenhuma das duas é sobre "importância" — são sobre **fonte** e **reversibilidade**, que são
> checáveis. A versão comprimida vive no `_OPERATING-GATES.md [OPS-006] §5` (é a que precisa
> sobreviver à compactação); esta página é a referência lida sob demanda.

---

## 1. Categorias — quem tem a resposta

| # | Categoria | O que é | **Quem responde** | Exemplo real deste repo |
|---|---|---|---|---|
| **C1** | **Realidade** | Um fato do mundo que só quem opera o negócio alcança | **Dono — insubstituível** | Uma NF-e real anonimizada como fixture; cópia do `dev.db` real; clicar no upload de OFX/CNAB |
| **C2** | **Negócio** | Como o negócio *deve* se comportar. Não exige nada técnico | **Dono** | "Cancelar uma conta a pagar estorna automático?" (F6→(a)); "SoD ligada com um usuário só?" (F3, desligada) |
| **C3** | **Domínio regulado** | Contábil, fiscal, legal. Tem resposta certa **fora** do projeto | **Contador / fonte oficial — NUNCA o dono** | Qual conta de controle usar; qual CFOP; se um aviso do PVA é grave |
| **C4** | **Técnica** | Arquitetura, camada, performance, estrutura de dados | **Agente**, dentro do `_ARCHITECTURE-CONTRACT.md` | Prisma first-class vs. DynamicTable (§2.1); `postEntry` direto vs. port/mapper (F0→(a)) |
| **C5** | **Produto / UX** | O que aparece na tela, texto, fluxo de cliques | **Agente em D1–D2, dono de D3 pra cima** | Detalhe em modal e não em rota; nome e ordem das abas do painel |

### A regra que mais economiza

**C3 nunca vai ao dono.** Domínio regulado perguntado a quem não é especialista volta como "não sei"
— ou, pior, como palpite que vira decisão travada e cara de desfazer.

> **Exemplo honesto, deste repo.** O fork `F7→(a) conta de controle dedicada 1.1.5 Clientes a Receber`
> (INCR-AR) é **C3** e foi ratificado pelo dono. Deu certo, mas por sorte de a recomendação estar
> correta — não porque a pergunta estava bem endereçada. Sob esta escala, o caminho seria: agente
> recomenda com a razão contábil escrita, e o **contador** carimba; ao dono cabe só o "vai".

**Quando C3 aparecer e não houver contador disponível**, as saídas legítimas são duas — e nenhuma
delas é perguntar ao dono:
1. **Derivar de artefato real** (uma nota fiscal emitida de verdade, um extrato, o plano de contas
   já em uso) — vira C1: o dono fornece o artefato, o agente lê a resposta nele. **Só vale sob o
   teste da fronteira abaixo.**
2. **Registrar como aberto e seguir com default declarado**, marcado no relatório como pendente de
   carimbo externo. Nunca silenciosamente.

### A fronteira perigosa é C1↔C3, não C3×D4/D5

A célula `C3 × D4/D5` é a trava **visível** — ninguém a atravessa por acidente. A saída "derivar de
artefato real → vira C1" é a trava **invisível**: é por ali que uma pergunta C3 sai reclassificada
como C1 e vira decisão silenciosa, que é precisamente o que a categoria existe para impedir.

**Teste literal (a resposta está no artefato, ou foi produzida a partir dele?):**

> **Consigo colar o trecho literal do artefato que contém a resposta?**

| | Classificação | Exemplo |
|---|---|---|
| **Sim** — o artefato **responde** | **C1 legítimo.** Cole o trecho no relatório | Tabela de alíquota publicada; o plano de contas já em uso mostrando a conta; uma NF-e real mostrando qual CFOP a operação usou |
| **Não** — o artefato dá **dado bruto** e eu apliquei norma para chegar na resposta | **C3 disfarçado.** Volta pra saída 2 (aberto + default declarado) | "O extrato mostra a movimentação, **logo** o lançamento deve debitar X"; "a nota tem esses itens, **logo** o CFOP correto é Y" |

O separador é a palavra **"logo"**. Se ela aparece entre o artefato e a resposta, houve interpretação
regulatória — e interpretação regulatória é C3, tenha o artefato vindo do dono ou não.

**Grau, mesmo quando o teste passa:** um artefato real mostra **o que foi feito**, não **o que está
correto** — pode carregar o erro de outra pessoa. Resposta derivada de artefato entra como
`assumido com lastro`, nunca `verificado`, e sobe de grau só com carimbo de contador ou com N
artefatos independentes concordando (OPS-003).

### Toda categoria carrega um claim falsificável (espelho da regra do nível)

O nível exige artefato nomeado; a categoria exigia nada — era asserção pura, e era por aí que ela
viraria desculpa para não perguntar. Espelhado:

| Categoria | O que a classificação **tem de trazer junto** — checável em 30 s de leitura |
|---|---|
| **C1** | qual artefato, e **o trecho literal** que responde (quando derivada) |
| **C2** | nada extra — vai ao dono, que é a autoridade e lê a pergunta inteira |
| **C3** | **quem carimbou** (contador / fonte oficial, nomeada) — ou "aberto, default declarado" |
| **C4** | **a negativa nomeada:** *"não muda comportamento de negócio visível; muda a camada `<X>`"* |
| **C5** | qual tela/rota é afetada |

A linha do **C4** é a que faz trabalho: transforma *"isto é técnico"* em claim que o dono derruba
lendo uma frase, sem abrir o código. C4 sem negativa nomeada é C4 não classificado.

---

## 2. Níveis — quanto custa errar

O teste é **reversibilidade**, não tamanho do diff. Aplique de baixo para cima e pare no primeiro que
casar:

| Nível | Teste objetivo (o que o diff toca) | Ação | Chega ao dono? |
|---|---|---|---|
| **D5** | **Sai do sistema e não volta**: arquivo fiscal transmitido (SPED/NF-e), e-mail enviado, dado a terceiro, dinheiro real movido | **PARA.** Exige confirmação nomeada **e** oráculo externo antes (contador / PVA) | **Sempre** — e nunca por micro-autonomia |
| **D4** | Toca **dado existente ou schema de forma não-aditiva**: migração destrutiva, `NOT NULL`/rename, ou qualquer escrita em `JournalEntry` / `Posting` / `AuditEvent` já postado | **PARA.** ADR em disco + sinal humano (já é norma: T12 e §1 do master map) | **Sempre** |
| **D3** | **Aditivo mas visível**: `ADD COLUMN` opcional, endpoint novo, regra de validação nova, mudança de comportamento que o usuário percebe | Agente **propõe com recomendação**; uma pergunta no formato OPS-006 | **Sim — "aceito o recomendado" fecha** |
| **D2** | **Reversível num commit, visível, não toca dado**: rótulo, layout, mensagem de erro, ordenação default | Agente **decide, anota e mostra** no relatório | Não — mas fica visível pra reverter |
| **D1** | **Invisível e reversível em minutos**: nome de variável, ordem de campo, formatação, qual entre abordagens equivalentes | Agente **decide e anota** | **Não.** É a micro-autonomia do `MODEL-TUNING.md §1` |

### Regra de arredondamento

**Na dúvida entre dois níveis, suba.** Errar pra cima custa uma pergunta; errar pra baixo custa uma
migração desfeita. E **o nível é justificado por artefato nomeado, não asserido** — dizer "isto é D3"
sem apontar *o que* o diff toca é o mesmo defeito que o OPS-003 descreve (grau sem evidência).

### D5 — "oráculo externo" é relativo à categoria (e o dono NÃO basta em C3)

A primeira redação dizia *"confirmação nomeada + oráculo externo (contador / PVA)"* e era ambígua nos
dois sentidos — lida como "sempre contador", exagera; lida como "o dono basta", **anula exatamente a
trava que a matriz acabou de nomear**. Um `D5 · C3` passaria satisfeito com a confirmação do dono, e
o Bloco A deixaria de ser bloqueante por defeito de redação. Definição fechada:

> **"Externo" = fora de quem tem o incentivo de seguir em frente.** Para o agente, isso é sempre o
> dono. **Para C3, o dono tem o mesmo déficit que o agente** — nenhum dos dois sabe se o resultado
> está certo — então externo significa fora dos dois.

| D5 na categoria | Confirmação nomeada | Oráculo externo exigido | Por quê |
|---|---|---|---|
| **C1 Realidade** | dono | **gate mecânico** (smoke-gate / cópia do `dev.db` real) | O dono confirma que o artefato é o certo; a máquina confirma que a operação não corrompe |
| **C2 Negócio** | dono | **dry-run/preview do que exatamente vai sair** | O dono É a autoridade de negócio; o que falta é ele ver o efeito antes, não outra pessoa |
| **C3 Domínio regulado** | dono | **contador ou validador oficial (PVA/SEFAZ) — obrigatório** | A confirmação do dono **não substitui**. É a célula do Bloco A |
| **C4 Técnica** | dono | **smoke-migration-gate sobre cópia do dado real** (norma T12) | Correção técnica é verificável por máquina; o dono autoriza, o gate prova |
| **C5 Produto** | — | — | C5 não tem D5 |

**Regra anti-lavagem (a que fecha o buraco):** a categoria de um D5 é determinada pelo **conteúdo do
que sai**, não pela natureza da decisão. Uma migração destrutiva é decisão C4 — mas se a tabela é
`JournalEntry`/`Posting`, o **conteúdo é regulado** e o oráculo exigido é o de C3. Formulação curta:

> **Todo D5 que toca matéria fiscal, contábil ou legal é C3 para efeito de oráculo, mesmo quando a
> decisão parece técnica.**

---

## 3. Matriz de roteamento — categoria × nível

Onde as duas se cruzam, quem decide:

| | **D1–D2** | **D3** | **D4** | **D5** |
|---|---|---|---|---|
| **C1 Realidade** | agente decide | **dono fornece o artefato** | dono fornece + ADR | dono fornece + oráculo externo |
| **C2 Negócio** | agente decide e anota | **dono escolhe** (com recomendação) | dono + ADR | dono + ADR + confirmação nomeada |
| **C3 Domínio** | agente decide pelo contrato | **contador, ou artefato real sob o teste literal** — nunca o dono | contador + ADR | **contador obrigatório**; confirmação do dono não substitui (é o Bloco A) |
| **C4 Técnica** | agente decide | agente decide e **reporta** | **ADR + sinal humano** (§2.1, §1/§4 do master map) | ADR + confirmação |
| **C5 Produto** | agente decide | dono escolhe | dono + ADR | — |

**A célula que trava este projeto é `C3 × D4/D5`.** Domínio regulado com efeito irreversível não tem
saída interna: nem processo, nem gate, nem revisor a mais resolve — só o oráculo externo. É
literalmente o Bloco A do `ACCOUNTING-MASTER-MAP.md` §5.1 e o diagnóstico do `ORACLE-DEFICIT.md`.

---

## 4. Como classificar — três perguntas, nesta ordem

1. **"Se eu responder isto errado, quem percebe e quando?"**
   Ninguém / só num fechamento contábil futuro → suba o nível, é risco silencioso (OPS-004).
2. **"Qual conhecimento responde? Um fato da operação (C1), uma preferência do negócio (C2), uma
   norma externa (C3), ou uma consequência do contrato de arquitetura (C4/C5)?"**
   Se a resposta é "norma externa" → **não pergunte ao dono**, vá ao §1 acima.
3. **"O que exatamente o diff toca?"** — nomeie o arquivo/tabela. É isso que fixa o nível, não a
   sensação de importância.

Se as três não fecharem em uma frase, a decisão está mal fatiada — fatie antes de perguntar
(é o sinal 2 do OPS-002).

---

## 5. Auto-aplicação (T3, uma vez, gap declarado)

**Esta página é `C4 × D2`:** decisão técnica de processo, reversível num commit, visível. Pela
própria escala, o agente poderia tê-la decidido sozinho e anotado — o dono a pediu, o que a torna
`C2` no efeito, mas não muda o nível.

**O gap, e o que mudou nele (revisão externa, 2026-08-11).** Nível e categoria são **declarados pelo
agente**, e nada impede rotular um `D4` como `D3` para evitar a pergunta — risco nº 1 do OPS-006. A
primeira redação desta página tinha só um backstop: o dono dizendo *"isso era escolha minha"*. Um
revisor apontou que isso é **detector tardio** — só pega o que o dono notar. Três reduções aplicadas,
nenhuma delas substituindo o backstop:

1. **Claim falsificável por categoria** (§1) — em especial a *negativa nomeada* do C4, que vira algo
   derrubável em uma frase, sem ler código.
2. **Teste literal na fronteira C1↔C3** (§1) — a via de lavagem real; o separador é a palavra "logo".
3. **Oráculo do D5 definido por categoria** (§2) — a redação anterior deixava um `D5 · C3` passar com
   a confirmação do dono sozinha, o que **anularia a trava do Bloco A por defeito de redação**.

**O que continua sem fechamento:** a categoria segue não-auditável por instrumento — um C2 rotulado
C4 com negativa nomeada plausível passa. O backstop permanece o dono. **Duas vezes = a categoria está
sendo usada para evitar conversa, e a regra falhou.**
