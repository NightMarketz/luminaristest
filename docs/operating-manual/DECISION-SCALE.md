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
   já em uso) — vira C1: o dono fornece o artefato, o agente lê a resposta nele.
2. **Registrar como aberto e seguir com default declarado**, marcado no relatório como pendente de
   carimbo externo. Nunca silenciosamente.

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

---

## 3. Matriz de roteamento — categoria × nível

Onde as duas se cruzam, quem decide:

| | **D1–D2** | **D3** | **D4** | **D5** |
|---|---|---|---|---|
| **C1 Realidade** | agente decide | **dono fornece o artefato** | dono fornece + ADR | dono fornece + oráculo externo |
| **C2 Negócio** | agente decide e anota | **dono escolhe** (com recomendação) | dono + ADR | dono + ADR + confirmação nomeada |
| **C3 Domínio** | agente decide pelo contrato | **contador ou artefato real** — nunca o dono | contador + ADR | **contador obrigatório** (é o Bloco A) |
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

**O gap:** o nível e a categoria são **declarados pelo agente**, e nada impede rotular um `D4` como
`D3` para evitar a pergunta — que é exatamente o risco nº 1 do OPS-006 (a regra virar desculpa para
não perguntar). O contrapeso é o §2: **o nível exige artefato nomeado**, e artefato nomeado é
checável no diff por um terceiro. O que **não** é checável é a categoria — ninguém verifica de fora
que "isto é C4" quando era C2. Esse gap não tem fechamento honesto por instrumento; fecha com o dono
dizendo *"isso aí era escolha minha"* quando for. **Se isso acontecer duas vezes, a categoria está
sendo usada para evitar conversa, e a regra falhou.**
