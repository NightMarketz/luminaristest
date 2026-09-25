# RUNBOOK: ECD substituta — geração + Termo de Verificação + retificação da ECF

> Formato: `docs/operating-manual/RUNBOOK-FORMAT.md`. **Agente prepara os passos e as
> pré-condições; não preenche EVIDÊNCIA, não marca desfecho, não assina.** Runbook sem
> assinatura de executor humano é nulo — não promove nó de mapa nem libera entrega ao
> contador.
>
> Escopo: BE-INCR-FIXED-ASSETS (C8) PR-4 — retificação versionada ECD/ECF (itens 26-31).
> Cobre a decisão de substituir uma ECD já entregue (0000.IND_FIN_ESC=1), o Termo de
> Verificação (J801+J932) e a consequência sobre a ECF do mesmo ano (item 22).

```
# RUNBOOK: ECD substituta — geração + Termo de Verificação + retificação da ECF

Executor: [nome — humano, profissional da contabilidade que assina os livros substitutos]
Data: [____]
Autorização: [decisão que pede esta substituição — ADR/ata/comunicação do dono + data]

Pré-condições (verificar ANTES de abrir o Termo):
  [ ] A ECD original do ano está EXPORTED no sistema (job id: ____) e foi de fato entregue/
      transmitida — uma ECD nunca entregue não se "substitui", corrige-se antes de entregar.
  [ ] O prazo do art. 8º §4 (Instrução Normativa RFB nº 2.003/2021) ainda está aberto: só é
      admitida a substituição da ECD até o fim do prazo de entrega do ano-calendário
      SUBSEQUENTE ao da escrituração substituída. Confirmar a data-limite: ____.
  [ ] ITG 2000 (Conselho Federal de Contabilidade), itens 31-36 — pressupostos de retificação
      contábil: o erro é de período já encerrado, a correção não é um lançamento extemporâneo
      disfarçado, e a natureza do erro está identificada (qual dos 6 códigos COD_MOT_SUBS
      abaixo se aplica).
  [ ] Existe UM motivo preponderante de substituição, code-de-3-dígitos (Manual ECD L9 p. 193):
      001 mudança de saldos que não pode ser lançamento extemporâneo · 002 alteração de
      assinatura · 003 alteração de demonstrações contábeis · 004 alteração da forma de
      escrituração · 005 alteração do número do livro · 099 outros.
  [ ] Redação do Termo de Verificação pronta (livre forma, mas TEM que conter, Manual p. 192):
      (I) identificação da escrituração substituída; (II) descrição pormenorizada dos erros;
      (III) identificação clara dos registros com erro; (IV) autorização expressa de acesso do
      CFC às modificações; (V) procedimentos do auditor independente, se houver.
  [ ] O Termo está assinado por quem a regra exige (Manual p. 192): SEMPRE o profissional da
      contabilidade que assina os livros substitutos; TAMBÉM o auditor independente se as
      demonstrações tiverem sido auditadas. Este sistema (BE-INCR-FIXED-ASSETS PR-4) só aceita
      signatário código 910 (Contador/Contabilista) — 920 (Auditor Independente) está FORA do
      escopo implementado; se o caso exigir auditor independente, este runbook BLOQUEIA aqui.
  [ ] O Termo foi salvo como .rtf (procedimento do Manual p. 192): 1) digitar no Word;
      2) salvar como .rtf; 3) abrir no Bloco de Notas; 4) copiar todo o conteúdo; 5) ter o
      arquivo .rtf pronto para upload (≤ 30 MB).
  [ ] id do job EXPORTED da ECD original a substituir (supersedesJobId): ____
  [ ] codHashSub — hash de 40 caracteres da ECD substituída (recibo/arquivo original): ____

## Passos

1. Gerar a ECD substituta via `POST /api/accounting/sped/ecd/generate` (multipart), com
   `declarant.indFinEsc=1`, `declarant.codHashSub`, `supersedesJobId` e `verificationTerm`
   (codMotSubs + signers, ≥1 código 910), anexando o .rtf no campo `rtf`.
   Resultado esperado: 201, job novo EXPORTED, `ecfRectificationRequired=true` no job.
   EVIDÊNCIA: [colar aqui a resposta ou id do job novo]

2. Confirmar no PVA da ECD (validador oficial) que o arquivo substituto é aceito — a
   substituição SÓ é válida se o PGE do Sped Contábil não gerar erro nos registros J801/J932
   (REGRA_REGISTRO_NAO_DEVE_EXISTIR_NO_RTF, REGRA_VALIDA_HASH_ARQUIVO,
   REGRA_OBRIGATORIO_CONTADOR_ASS_TERMO, REGRA_IDENT_CPF_CNPJ_COD_ASSIN_DUPLICIDADE).
   Resultado esperado: PVA aceita sem crítica bloqueante nos registros J801/J932.
   EVIDÊNCIA: [colar tela/protocolo do PVA]

3. Verificar que o job SUBSTITUÍDO permanece inalterado (status/sha256/storageKey) —
   `GET /api/accounting/data-exchange/jobs/{supersedesJobId}` deve devolver os MESMOS valores
   de antes do passo 1.
   Resultado esperado: sha256/status/storageKey idênticos ao registro anterior a este runbook.
   EVIDÊNCIA: [colar a resposta do GET, antes e depois]

4. Gerar (ou já ter) uma ECF retificadora do MESMO ano (`retificadora=S`, `numRec`,
   `supersedesJobId` apontando para a ECF anterior do ano) — isto zera
   `ecfRectificationRequired` da ECD substituta automaticamente (item 21). Se este ano NÃO
   precisar de ECF retificadora (motivo puramente formal, ex.: alteração de assinatura sem
   efeito na apuração), usar a dispensa no passo 5 em vez deste.
   Resultado esperado: ECF EXPORTED; `GET` na ECD mostra `ecfRectificationRequired=false`.
   EVIDÊNCIA: [colar id do job da ECF retificadora, ou "não aplicável — ver passo 5"]

5. [SÓ se o passo 4 não se aplica] Dispensar a exigência de retificação via
   `POST /api/accounting/data-exchange/jobs/{jobId}/waive-ecf-rectification` com
   justificativa (≥20 caracteres) nomeando por que este motivo de substituição NÃO afeta a
   apuração da ECF.
   Resultado esperado: 200, `ecfRectificationWaivedAt` preenchido.
   EVIDÊNCIA: [colar a resposta]

6. Montar o pacote ao contador (`buildDeliveryPackage`) e confirmar que ele SAI (não bloqueia
   mais no gate do item 22).
   Resultado esperado: manifesto gerado sem 400 de retificação pendente.
   EVIDÊNCIA: [colar o manifesto ou o erro, se bloquear]

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava (ex.: exige auditor independente/código
    920, fora do escopo implementado); execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [linha do plano/mapa atualizada com o desfecho + data]
- Assinatura do executor: ____________
```
