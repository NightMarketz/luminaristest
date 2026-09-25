# PEDIDO AO CONTADOR — D8 (dados do livro e signatários da ECD/ECF) — 2026-09-24

> Rascunho preparado pelo agente (skill `luminaris-contador-liaison`). **O dono envia** (CTD-001).
> Escopo: **só o D8** — P6 do `RUNBOOK-H1-PVA.md`, único bloqueio restante do H1 no preflight de 24/09
> (`docs/plano/gates/H1.md`). Os demais itens do follow-up 0.8 do `PLANO-POS-CONTADOR-2026-09-23.md`
> (a, b, d, e) **não** entram aqui — decisão do dono de 24/09 de pedir só o que destrava o H1.

---

## Texto para enviar

> Olá, [nome do contador],
>
> Obrigado pelo retorno do dia 23. Para gerarmos a **ECD e a ECF de teste do ano-calendário 2025** e
> passarmos no validador oficial (PVA), falta só um bloco de informações, que é do seu lado:
>
> **1. Livro Diário (ECD)**
> - Número de ordem do livro
> - Natureza do livro (ex.: "Diário Geral")
> - Data de encerramento do exercício social (ex.: 31/12/2025)
> - NIRE, se a empresa tiver registro na Junta — e as datas de arquivamento dos atos constitutivos e da
>   última conversão, se houver
>
> **2. Porte**
> - A empresa está obrigada à ECD como **grande porte** (sim/não)?
>
> **3. Quem assina a ECD e a ECF**
> Para **cada** signatário: nome completo, CPF, qualificação (código da tabela de qualificação de
> assinantes do SPED — ex.: 900 = contador, 203 = diretor, 205 = administrador), e-mail e telefone.
> Para o contador: número do CRC, UF do CRC e data de validade da certidão (se aplicável).
> Por favor, indique **qual deles é o responsável legal** (só um).
>
> **4. ECF (Lucro Presumido, ano-calendário 2025)**
> - Alíquota da CSLL: 9% ou 15%?
> - Critério de reconhecimento das receitas: caixa ou competência?
>
> Se algum campo não se aplicar, basta dizer "não se aplica".
>
> Um cuidado: por serem dados pessoais (CPF, telefone), prefiro receber por mensagem direta, não por
> planilha compartilhada.
>
> Obrigado!

---

## Itens pedidos — detalhe e critério de aceite INTERNO (não vai no texto)

Fonte dos campos e regras: `RUNBOOK-H1-PVA.md` §"Dados que precisam ser levantados antes de gerar
ECD/ECF (P6)" e os DTOs `server/src/features/accounting/dtos/SpedEcdDto.ts` / `SpedEcfDto.ts`.

| # | Item (em termos dele) | Campo(s) no sistema | Formato | Critério de aceite interno |
|---|---|---|---|---|
| 1a | Nº de ordem do livro | `numOrd` | texto | não vazio |
| 1b | Natureza do livro | `natLivr` | texto ≤80 | não vazio, ≤80 |
| 1c | Encerramento do exercício social | `dtExSocial` | `YYYY-MM-DD` | data real (`isValidDateOnly`) e em 2025 |
| 1d | NIRE / datas de arquivamento | `nire`, `dtArq`, `dtArqConv` | texto / datas | opcionais; se vier NIRE, `indNire` (🏢 dono) = `1` |
| 2 | Grande porte | `indGrandePorte` | `0`/`1` | resposta explícita sim/não |
| 3 | Signatários ECD (J930) | `identNom`, `identCpfCnpj`, `identQualif`, `codAssin`, `indRespLegal`, `indCrc`, `ufCrc`, `numSeqCrc`, `dtCrc`, `email`, `fone` | ver runbook | **exatamente 1** `indRespLegal='S'`; **≥1** `codAssin='900'` (contador) **e ≥1** diferente de `900` (regra de `SpedEcdDto.ts:96-116`); CPF com 11 dígitos |
| 3' | Signatários ECF (0930) | `identNom`, `identCpfCnpj`, `identQualif` (3 dígitos), `email`, `fone`, `indCrc` | ver runbook | mesmos dados; `indCrc` presente se `identQualif='900'` |
| 4a | Alíquota CSLL | `indAliqCsll` | `1` (9%) / `4` (15%) | resposta explícita (default `1` só se ele confirmar 9%) |
| 4b | Critério de receita | `indRecReceita` | `1` caixa / `2` competência | resposta explícita (default `2`) |

**Aceite do pacote inteiro (fecha o D8):** com os dados preenchidos no formulário da aba Compliance, a
geração da ECD e da ECF do `seed-presumido` responde **200 com arquivo** (sem 400 de validação). O PVA
é o passo seguinte (H1 passos 4 e 6) — é ele, não este pedido, que prova o conteúdo.

## Dados pessoais (CTD-003)

CPF, nome, telefone e e-mail dos signatários **não entram no repositório** — nem neste arquivo, nem em
runbook, nem em commit. O dono recebe e digita direto no formulário da aba Compliance na hora do H1. Na
evidência do runbook, mascare (ex.: `***.***.***-12`).

## O que NÃO estamos pedindo (já temos ou saiu da fila)

- Plano referencial RFB — importado pelo X2 em 24/09 (catálogo 2025, 1.123 contas).
- Mapeamento das contas ao referencial — feito e aprovado pelo dono em 24/09 (14/14, `ready=true`).
  As 3 escolhas de julgamento (cartão a receber, pacotes pré-pagos, despesas genéricas) ficam para
  **quando ele revisar a ECD no H1**, não agora.
- Dados cadastrais da empresa (CNPJ, razão social, endereço, CNAE, natureza jurídica, município) —
  vêm do **dono** (cartão CNPJ), não do contador.
- Follow-up 0.8 (a) M010/COD_PB_RFB, (b) referencial de juros/multa/imobilizado, (d) cClassTrib,
  (e) monofásico — fora deste envio por decisão do dono.

## Quando a resposta chegar

Chame com **"triagem do que o contador mandou"**. Cada item vira: dado (vai ao formulário na hora do
H1) · crítica (achado → ADR/emenda) · confirmação (registra e segue) · fora do pedido (volta ao dono).
