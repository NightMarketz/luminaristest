# RUNBOOK: H2 — Ativação da contabilidade pela tela (LAC-B)

> Formato: [`RUNBOOK-FORMAT.md`](../operating-manual/RUNBOOK-FORMAT.md). Preparado **em branco** pelo agente
> (FE-INCR-BINDING-ACTIVATION-screen-brief item 12). **Evidência, desfecho e assinatura são do dono.**

Executor: ____________           Data: ____
Autorização: FE-INCR-BINDING-ACTIVATION-screen-brief.md item 12 + EMENDA-1 (13/10); execução da LAC-B pedida pelo dono no chat em 14/10/2026
Pré-condições:
- PR-0 (guarda 409 + recarga dos mappers) e PR-1 (faixa) da LAC-B integrados (commit ___)
- Servidor e `my-app` em **build de produção** (`npm run build && npm start`), a partir desse commit
- Um usuário com uma unidade **sem** binding `Active` (linha nova em `units`), e perfil fiscal cadastrado nela
  (aba "Perfil fiscal"). Sem o perfil, a ativação devolve `KIT_FISCAL_PROFILE_REQUIRED` (emenda E-5 do KIT-SETOR)

## Passos

1. Abrir Contabilidade e selecionar a unidade sem binding.
   Resultado esperado: acima das abas aparece a faixa âmbar *"A contabilidade automática desta unidade não está ativa —
   as vendas não geram lançamento."*, com o seletor "Setor" (Salão de beleza / Clínica de estética) e o botão
   "Ativar contabilidade".
   EVIDÊNCIA: [screenshot]

2. Clicar "Ativar contabilidade".
   Resultado esperado: a confirmação mostra o setor e os 2 efeitos (plano de contas padrão se vazio; período do mês
   corrente se não existir).
   EVIDÊNCIA: [screenshot]

3. Confirmar.
   Resultado esperado: um toast de sucesso aparece e a faixa some. A aba Pendências ainda não existe (I5 PR-3), então o
   link "Ver pendências da unidade" não aparece.
   EVIDÊNCIA: [screenshot]

4. **Sem reiniciar o servidor**, finalizar uma venda dessa unidade no módulo de vendas.
   Resultado esperado: a aba "Lançamentos" da unidade mostra o lançamento da venda (`sale.finalized`).
   EVIDÊNCIA: [screenshot]

5. (Guarda do 2º setor) Na mesma unidade, chamar `POST /api/accounting-binding/activate-default` com
   `{"unitId":"<id>","sectorKey":"aestheticClinic"}`.
   Resultado esperado: HTTP 409, `code: BINDING_SECTOR_CONFLICT`. Nenhum binding novo.
   EVIDÊNCIA: [saída do comando]

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): ____
- Atualização do artefato de rastreio: nota [LAC-B](../plano/nos/LAC-B.md) (`estado_detalhe`) com o desfecho + data
- Assinatura do executor: ____________
