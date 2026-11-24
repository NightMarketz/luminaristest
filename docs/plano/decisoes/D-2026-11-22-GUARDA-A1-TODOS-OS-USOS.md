---
id: "D-2026-11-22-GUARDA-A1-TODOS-OS-USOS"
tipo: "decisao"
dominio: "gate"
titulo: "O certificado A1 do cliente (e o do escritório procurador) volta a ser guardado cifrado no servidor, para todos os usos; produção espera o parecer de advogado (L-ADN-5)"
estado: "decided"
autorizacao: "dono, questionário, 21–22/11/2026 (sessão de planejamento do INTEGRA-CONTADOR) — F-IC-2 \"onde fica o certificado e-CNPJ do contratante?\": \"Arquivo A1 no servidor\"; à pergunta de alcance (\"reverte o item 3 da decisão de 22/10… Qual o alcance da reversão?\"): \"Todos os usos\"; à pergunta \"O uso em produção espera o parecer?\": \"Produção espera (Recomendado)\". Não é 'executa' de nada"
atualizado: "2026-11-22"
---
# D-2026-11-22-GUARDA-A1-TODOS-OS-USOS

**Estado:** `decided`. **Autorização:** dono, questionário, 21–22/11/2026 (citação no frontmatter). **Não é
`executa`** (ORCH-006) e não autoriza merge.

## Decisão

1. **O Luminaris volta a guardar o certificado A1 do cliente, cifrado, para todos os usos:** a API Integra Contador
   (nó [[INTEGRA-CONTADOR]]) e também NF-e, NFC-e e NFS-e. Supera o item 3 de
   [[D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO]] (*"O Luminaris não guarda o certificado do cliente"*), que estava
   valendo também para o [[D5]] e para a escolha do assinador local de 30/10.
2. **Vale também para o A1 do escritório de contabilidade** que atua como procurador no Integra Contador (F-IC-1, modo
   `PROCURADOR`).
3. **Produção espera o parecer de advogado sobre a guarda** (L-ADN-5, `D-2026-10-12-QUESTIONARIO-DONO`). Código,
   testes e ambientes de teste seguem. A 1ª chamada real com o A1 de um terceiro só depois do parecer arquivado.
4. **Fica:** o item 1 de [[D-2026-10-30-D5-SEM-CONTRATACAO-BYOK]] (o Luminaris não contrata nem compra certificado;
   o A1 é do cliente).
   **Fica em aberto:** o item 2 dela define o BYOK da emissão como *"e-CNPJ em nuvem no PSC … autoriza no Luminaris
   pela API OAuth"*. Com a guarda de volta, ele pode deixar de ser o único caminho. Isso é do replanejamento do X10a e
   do X10i (lacuna `L-20261122-030533-63e8`), não desta nota.

## Contexto apresentado ao dono

- O token do Integra Contador exige o e-CNPJ do contratante como certificado de cliente no TLS do `/authenticate`
  (`pesquisas-legais/integra-contador-serpro` [D03]). Sem guarda, a saída recomendada era o assinador local da X10a
  EMENDA-4, que ainda não está em `main` e depende da máquina do cliente ligada.
- O dono escolheu o A1 no servidor e, na pergunta seguinte, estendeu a escolha a todos os usos.

## Efeitos

- **INTEGRA-CONTADOR:** o token sai do servidor, com o A1 da PJ (`FiscalCertificate`, X10i PR-1, já em `main`) ou o
  do escritório (cifrado na credencial). O assinador local deixa de ser dependência. O e-CNPJ em nuvem não serve ao
  Integra Contador, porque o TLS exige o arquivo .p12/.pfx.
- **X10a / X10i / D5 (fora desta sessão; vai à caixa de lacunas):**
  - abre a saída (a) do §4.1 de `D5-DECISAO-2026-10-30` (o cliente entrega o A1 para o transporte da NF-e e da NFC-e);
  - pode desarquivar o caminho de guarda do `BE-INCR-DFE-ADN-EMISSOR` (PR-0..PR-4, F-ADN-1..13 de 12/10);
  - os BRIEFs do assinador local (EMENDA-4 da NFC-e, emenda do ADN) precisam dizer se continuam como alternativa ou
    se saem.

  Replanejar é de outra sessão de planejamento, com autorização própria.
