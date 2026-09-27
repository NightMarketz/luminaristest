---
id: "D-2026-09-26-EMISSAO-FISCAL-BYOK"
tipo: "decisao"
dominio: "fiscal"
titulo: "Emissão fiscal: só parceiro BYOK (Focus primeiro), modo manual sem parceiro com releitura, NF-e fictícia como ponte do E9"
estado: "decided"
autorizacao: "dono, 2026-09-26, em sessão (entrevista dos gates humanos) + 2026-09-27: \"Certo, planeje com granularidade e atualize a documentação com nossas decisões do fiscal\""
atualizado: "2026-09-27"
---
# D-2026-09-26-EMISSAO-FISCAL-BYOK — como o Luminaris emite nota fiscal

**Estado:** `decided`
**Autorização:** dono, 2026-09-26, em sessão (entrevista dos gates humanos, por questionário e por chat); registro
autorizado em 2026-09-27: *"Certo, planeje com granularidade e atualize a documentação com nossas decisões do fiscal"*.

O plano que executa estas decisões está em
[`PLANO-EMISSAO-FISCAL-2026-09-27.md`](../../accounting/PLANO-EMISSAO-FISCAL-2026-09-27.md). A emenda correspondente do
ADR está em [`ADR-INCR-DFE-EMISSAO-PARCEIRO.md`](../../adr/ADR-INCR-DFE-EMISSAO-PARCEIRO.md) §11.

## Decisões (fiscal)

| # | Decisão | Palavras do dono (26/09, salvo indicação) | Efeito |
|---|---|---|---|
| 1 | **Parceiro emissor: Focus NFe primeiro, tudo BYOK.** | *"Tudo BYOK, mas primeiro vai ser focus e mercado pago"* + questionário "D5 parceiro emissor escolhido" | [[D5]] deixa de ser "qual parceiro" e vira "conta + contrato + A1". Ainda **nada confirmado**: conta, contrato e certificado (questionário "Nada confirmado ainda"). |
| 2 | **Emissão só por parceiro BYOK. Emissor Nacional por API fica fora. SEFAZ direto fica fora.** | *"Então decida, qual a real vantagem em ter o Emissor Nacional por API, pq não só o Focus ou outro emissor BYOK?"* — o dono **delegou**; o agente decidiu na mesma mensagem e o dono seguiu sem objeção | Nenhum adaptador `EmissorNacionalNfse`/`SefazDiretoEmissor` no plano. **Reabre só com as duas condições juntas:** (a) clientes só-serviço, sensíveis a preço, em número que torne a taxa do parceiro objeção de venda real; (b) o dono aceitar que o Luminaris guarde o A1 do cliente, com cifra em repouso decidida no [[M2]]. |
| 3 | **Um adaptador por protocolo que o código chama; estado e município são configuração, não adaptador.** | pergunta do dono *"os emissores são diferentes por estado não? Então o adaptador deveria ser por estado ou por parceiro"* → resposta aceita | Regra de desenho no ADR §11. A regra tributária local (alíquota de ICMS/ISS, ST) é dado do perfil fiscal. |
| 4 | **Modo manual para quem não quer pagar parceiro: ficha espelho do portal + retorno pelo XML autorizado.** Só NFS-e. | *"E se eu quiser uma versão facil de copy e cola pra quem não quer gastar com focus?"* → proposta; 27/09 *"Certo, planeje com granularidade"* | Nó [[DFE-MANUAL]] e BRIEF `BE-INCR-DFE-MANUAL`. É a evolução do `FileEmissor` (a "válvula" do ADR §6). |
| 5 | **A precisão vem da releitura, nota a nota:** o XML autorizado é lido e comparado com a DPS enviada. Vale para o modo manual e para a Focus. | *"qual a sua sugestão para transformar o preenchimento de nota algo de 1 click com 100% de precisão?"* → proposta; 27/09 *"Certo"* | Peça compartilhada, construída uma vez no [[DFE-MANUAL]] e reusada no [[X10i]]. |
| 6 | **Sem XML real de NF-e até o 1º cliente. A ponte é uma NF-e fictícia de leiaute completo; a troca pela real é a ponta solta declarada.** | *"Não teremos acesso a xml real até o primeiro cliente"* + *"Podemos focar em enviar todas as informações de Nfe para uma nfe ficticia e essa será a ponta que ficará solta"* | [[D2]] e [[E9]] seguem abertos, sem data. Fixture `purchase-full-layout.SYNTHETIC.xml` (assinada com a chave de teste do SIG-NFE) + 3 testes em `nfe.test.ts`. |

## Registradas junto (fora do fiscal)

| Decisão | Palavras do dono (26/09) | Efeito |
|---|---|---|
| **Cobrança: Mercado Pago agora, banco/CNAB depois.** | questionário "MP agora, banco CNAB depois" | Muda a premissa de F5 (CNAB 240) e F6 (Pix de saída). O ADR deles **não foi aberto** (a autorização F-M3 cobre só ADR) — ver [[D6]]. |
| **Host: VPS contratada.** | questionário "M2 VPS contratada" | [[M2]] segue aberto: falta o 1º deploy pelo runbook. |
| **Ordem dos gates: H1 → H2 → M2.** | questionário "H1 → H2 → M2 (Recommended)" | Ordem de execução do dono; não muda dependência no vault. |

## Forks ratificados — 2026-09-27 (dono, questionário, 3 lotes: *"ratifica os forks"*)

| Fork | Escolha do dono | Contra a recomendação? | Efeito |
|---|---|---|---|
| **F-MAN-1** | **(a) conferir já a assinatura do XML da NFS-e enviado** | **SIM** | Item 4 do BRIEF vira comportamento; reusa a infraestrutura XMLDSig do SIG-NFE; insumo novo: quem assina a NFS-e no sistema nacional (p5) |
| **F-MAN-2** | **(c) status novo `AUTHORIZED_DIVERGENT`** | **SIM** | Máquina de estados ganha um estado; ver BRIEF §5 "Ratificação" |
| F-MAN-3 | (a) renomear para `ManualEmissor`, `DFE_PARTNER=manual`; `file` deixa de existir | não | — |
| F-MAN-4 | (a) o portal numera a DPS | não | sequência local não é consumida no modo manual |
| F-MAN-5 | (a) cancelamento manual exige o XML do evento | não | — |
| **F-PLAN-1** | **(b) [[DFE-MANUAL]] vira nó de régua** | **SIM** | denominador fiscal 19 → 20 |
| F-PLAN-2 | (a) NFC-e na porta, via parceiro, com roteamento por tipo | não | BRIEF próprio no [[X10a]], depois da dúvida D-2 |
| F-PLAN-3 | (a) com condição: *"Passa sim por segunda origem se existir essa conexão"* | não | a compra chega pela "NF-e recebidas" quando o cliente tiver a conexão com a Focus; o upload continua para quem não tem |
| F-MAN-2b | (b) `AUTHORIZED_DIVERGENT` só sai cancelando (dono: "só cancelando") | não | sem transição de volta para `AUTHORIZED` |
| F-PLAN-4 | (a) modo manual + releitura primeiro; Focus em paralelo quando o D5 fechar | não | — |

## Não decidido (pendente)

- **Data do Simples** — o Ato Conjunto RFB/CGIBS nº 4/2026, § 1º do art. 1º, diz **01/01/2027** (PDF oficial lido em
  27/09); o contador disse **01/11/2026** (triagem 23/09, P7). Pergunta 5 do follow-up ao contador.
