# RUNBOOK: D5 — produção restrita de NF-e/NFC-e com credencial BYOK (em branco)

> Formato: `docs/operating-manual/RUNBOOK-FORMAT.md`. Gate de **dado externo** (SEFAZ, PSC, certificado), então a
> exceção de 25/10 **não vale**. O desfecho e a assinatura são **só do dono**. O agente prepara o runbook e, sob comando
> do dono no chat, cola na EVIDÊNCIA só a saída literal de comando que ele mesmo executou na sessão.
>
> **Estado ao preparar (30/10/2026): BLOQUEADO de antemão.** As pré-condições P3 e P4 não têm resposta
> ([`D5-DECISAO-2026-10-30.md`](../plano/gates/D5-DECISAO-2026-10-30.md) §4.1 e §4.2). Não comece antes.

```
# RUNBOOK: D5 — produção restrita NF-e/NFC-e (BYOK)

Executor: [nome — humano]           Data: [____]
Autorização: [decisão que pede esta execução — doc + data; hoje NÃO existe:
  D-2026-10-30-D5-SEM-CONTRATACAO-BYOK só decide o caminho, e o X10a PR-7..PR-9
  de 29/10 vale contra o PSC falso, sem transmitir]
Pré-condições:
  P1. Adaptador do X10a PR-7 (SEFAZ) e PR-8 (NFC-e on-line) em main:
      commit ___ (PR #___ e #___ mergeados)
  P2. Credencial BYOK do cliente de teste: e-CNPJ em nuvem no PSC ___,
      comprado PELO CLIENTE (o Luminaris não compra nada — decisão 30/10);
      titular CNPJ ___ ; sem guarda de arquivo de certificado pelo Luminaris
  P3. Luminaris cadastrado como aplicação nesse PSC (DOC-ICP-17.01 §6.4.5.3
      ou §6.4.6.1): client_id ___ ; sem compra (resposta do PSC à pergunta 1
      colada em ___)
  P4. Saída do mTLS escolhida pelo dono (D5-DECISAO §4.1 a/b/c):
      ___ ; decisão em docs/plano/decisoes/___
  P5. O PSC aceita hash_algorithm SHA-1 em RAW (pergunta 3): resposta
      colada em ___
  P6. Inscrição estadual do cliente de teste em SP habilitada para NF-e/NFC-e
      em homologação; CSC de homologação da NFC-e (id ___) cadastrado no app
      (NfceCsc, X10a PR-8)
  P7. Ambiente = homologação (tpAmb=2) conferido na configuração do tenant:
      ___

## Passos

1. Pedir a signature_session no PSC do cliente pelo app (fluxo OAuth
   /v0/oauth/authorize → /oauth/token, escopo signature_session); o titular
   aprova no celular dele.
   Resultado esperado: token com lifetime ___ s; nenhum fator de autenticação
   do titular passou pelo Luminaris (DOC-ICP-17.01 6.4.3.2.1).
   EVIDÊNCIA: [colar a saída do log do app com o token mascarado e o lifetime]

2. Assinar pelo PSC um XML de teste (NF-e modelo 55, homologação) pelo
   adaptador do PR-7, e validar a assinatura localmente.
   Resultado esperado: <SignatureMethod ...#rsa-sha1>, certificado no
   <X509Certificate> com o CNPJ-base do emitente; validação XMLDSig OK.
   EVIDÊNCIA: [colar a saída do comando de validação]

3. Abrir a conexão mTLS com o webservice de homologação da SEFAZ-SP
   (NFeStatusServico4) pela saída escolhida em P4.
   Resultado esperado: handshake concluído; cStat 107 "Serviço em Operação".
   EVIDÊNCIA: [colar a resposta SOAP com cStat/xMotivo]

4. Transmitir a 1ª NF-e de homologação (NFeAutorizacao4) pelo adaptador,
   SEM o grupo infRespTec.
   Resultado esperado: cStat 100 "Autorizado o uso da NF-e" e protocolo.
   (Se vier cStat 972, SP exige o responsável técnico: FALHOU neste passo;
   registrar como achado — pede CNPJ do Luminaris no grupo ZD.)
   EVIDÊNCIA: [colar retorno com chave, cStat, nProt]

5. Transmitir a 1ª NFC-e de homologação (modelo 65, on-line, QR Code
   conforme o PR-8).
   Resultado esperado: cStat 100 e protocolo; QR Code com a URL de consulta
   de homologação de SP.
   EVIDÊNCIA: [colar retorno com chave, cStat, nProt e a URL do QR]

6. Cancelar a NF-e do passo 4 (evento 110111) pelo app.
   Resultado esperado: cStat 135 "Evento registrado e vinculado".
   EVIDÊNCIA: [colar retorno do evento]

7. Deixar a signature_session vencer (ou revogar) e tentar emitir.
   Resultado esperado: o app mostra "sessão vencida → pedir reaprovação" e a
   nota fica pendente, sem erro genérico (planejamento de 11/10, §9).
   EVIDÊNCIA: [colar log + estado do documento]

## Desfecho (marcar UM)
[ ] PASSOU — todos os passos com evidência conferindo com o esperado
[ ] FALHOU — passo __ divergiu; evidência da divergência colada acima;
    NENHUM passo seguinte foi executado após a falha
[ ] BLOQUEADO — pré-condição __ não se sustentava; execução nem começou

## Registro
- Achados no caminho (fora do escopo deste runbook): [lista ou "nenhum"]
- Atualização do artefato de rastreio: [docs/plano/gates/D5.md e
  docs/plano/nos/X10a.md com o desfecho + data]
- Assinatura do executor: [nome — humano]
```

## Notas de preparo (não fazem parte do formulário)

- **Variante A3 com assinador local** ([`D5-DECISAO-2026-10-30.md`](../plano/gates/D5-DECISAO-2026-10-30.md) §8). Antes de
  imprimir, troque:
  - **P2:** e-CNPJ A3 do cliente em token ou cartão, espetado na máquina do caixa (ou A1 só nessa máquina).
  - **P3:** "assinador local do Luminaris instalado no caixa: versão ___".
  - **P4:** "mTLS pelo próprio token (EKU 'Autenticação Cliente' conferido no certificado: ___)".
  - **P5:** não se aplica, porque o token assina SHA-1.
  - **Passo 1:** troca de "pedir a signature_session" para "titular digita o PIN do token na máquina do caixa; colar o log
    do assinador sem o PIN".
  - **Passo 7:** troca para "remover o token e tentar emitir".

- **NFS-e fora:** a NFS-e segue pelo portal ([[D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO]]). O PSC não emite NFS-e
  (FAQ NFS-e v1.1 item 17.7). Este runbook não tem passo de DPS.
- **cStat esperados:** 107, 100 e 135 são os códigos de sucesso do MOC 7.0. Confira na tabela do MOC vigente ao executar.
- **Certificado de teste:** a ICP-Brasil não dá e-CNPJ "de teste" para a SEFAZ. A homologação usa certificado real em
  `tpAmb=2`. Se o PSC oferecer ambiente de homologação próprio (pergunta 6 da análise), ele serve só para os passos 1 e
  2, antes da SEFAZ. Grau: inferido. Confirme com o PSC.
