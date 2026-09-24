# TRIAGEM — resposta do contador ao pedido D8 (2026-09-24)

> Pedido: `PEDIDO-CONTADOR-2026-09-24-D8.md`. Triagem pela skill `luminaris-contador-liaison` (Phase 3).
> Resposta do contador = **dado externo**, não sign-off (CTD-002). Decisões do dono no mesmo dia, via questionário.

## Itens

| # | Item | Resposta (resumo) | Classe | Trilho / efeito |
|---|---|---|---|---|
| 0 | Regime | Pedido diz Presumido, mas o sistema discutido (e-Lalur, Parte B, PIS/COFINS não-cumulativo) é Lucro Real; no Presumido o bloco M não é preenchido e PIS/COFINS é cumulativo. "Se foi engano, gerem em Lucro Real, que é o que o produto precisa validar primeiro." | **crítica** → decisão do dono | Não foi engano: H1 em Presumido é deliberado (`RUNBOOK-H1-PVA.md`, EMENDA 2026-09-02); Real = 2ª passada (H1b, tenant `seed-real`). **Dono (24/09): rodar os dois em sequência agora** — H1 (Presumido, `seed-presumido`) e em seguida H1b (Real, `seed-real`). |
| — | Dados pessoais | Não fornece dados reais; para validar no PVA sem transmitir, usar dados **fictícios** com DV válido, marcados como fixture; assinatura digital só é exigida na transmissão. Produção: dados reais do contador e do sócio, por mensagem direta. | **dado** (muda o plano) | **Dono (24/09): tudo fictício, inclusive a empresa.** Fixture gerada fora do repo (`%USERPROFILE%\luminaris-h1-fixture.json`): CNPJ/CPF com DV válido, rótulo SEED/FIXTURE, nunca transmitida. |
| 1 | Livro | `numOrd` 1 (primeiro livro); natureza "Diário Geral" (tipo G); encerramento 31/12/2025; NIRE depende do tipo societário — escolher e ser consistente; datas de arquivamento do mesmo cadastro, conversão "não se aplica" | **dado** | **Dono (24/09): LTDA com NIRE** → `indNire=1`, NIRE e `dtArq` fictícios, `dtArqConv` vazio. |
| 2 | Grande porte | Não (Lei 11.638: ativo > R$ 240 mi ou receita > R$ 300 mi) | **dado** | `indGrandePorte=0` |
| 3 | Signatários | Dois: sócio-administrador (205 ou 203) como responsável legal + contador (900) com CRC, UF e data da certidão | **confirma** | Estrutura já prevista no DTO (1 `indRespLegal='S'`, ≥1 `900`, ≥1 não-900). Nada muda. |
| 4 | ECF (Presumido) | CSLL 9% (15% só instituições financeiras); receitas por competência (caixa exige controle por nota e mesmo critério para PIS/COFINS) | **confirma** | Defaults `indAliqCsll='1'`, `indRecReceita='2'` já corretos. Nada muda. |

## Ressalvas do próprio contador

Respondeu **de memória** sobre o limite de grande porte e as regras de opção pelo caixa no Presumido — declarou
que nenhum dos dois afeta a validação no PVA. Registro, sem ação agora; revisitar antes de operar cliente real.

## Fora do pedido / para o produto

A pergunta do dono no mesmo dia ("o Luminaris vai criar empresas de micro a médias") aponta que estes campos são
**cadastro por empresa**, não entrada de formulário a cada geração, e que a obrigatoriedade de ECD/ECF varia por
regime. Não é item deste D8 — candidato a BRIEF próprio (perfil de obrigações SPED por empresa, no onboarding),
decisão do dono.

## Estado

- **D8:** dado recebido e resolvido por fixture — `done`.
- **H1 P6:** coberto pela fixture (fora do repo). **H1b:** mapeamento referencial 2025 do `seed-real` gravado
  (14/14, `ready=true`, mesma tabela aprovada para o `seed-presumido`).
