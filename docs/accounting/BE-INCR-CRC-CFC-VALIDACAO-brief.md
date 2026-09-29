# BE-INCR-CRC-CFC-VALIDACAO — conferir no CFC se o contador está ativo (PLANO, não executar)

## 0. Cabeçalho

- **Item:** achado §7 do `BE-INCR-CRC-CFC-FOLLOWUPS-brief.md` — "validação contra o cadastro do CFC".
- **Autorização:** dono, chat + questionário 28/09/2026 — item marcado com a descrição *"Frente nova…
  Eu só pesquisaria e planejaria, sem implementar"*. **Autoriza pesquisa e plano; não autoriza código.**
- **Por que importa:** a máscara só prova que o número *parece* um CRC. Quem assina o J930/0930 como
  `900` tem de ter registro **ativo** (Res. CFC 1.494/2015; o manual ECF p. 103 exige "contabilista").
  Hoje nada no sistema confere isso.

## 1. Fatos (grau: verificado = executado nesta sessão · pesquisado = fonte externa)

| # | Fato | Evidência | Grau |
|---|---|---|---|
| V1 | O CFC publica uma Web API em `https://sistemas.cfc.org.br/servico` (help: `/servico/help`). Endpoints de profissional: `api/Profissional/Get/{id}/{hash}` (CPF ou registro no formato `UF999999T`, **exige hash**), `api/Profissional?cpf={cpf}` e `api/Profissional/EhProfissional/{cpf}` | página de help | pesquisado |
| V2 | `GET api/Profissional?cpf=11122233396` (CPF **fictício** das fixtures) respondeu **200** `{"EhContadorAtivo":0,"PossuiCNAIAtivo":0}` **sem credencial**; `EhProfissional/{cpf}` respondeu `[]` | `curl` nesta sessão, 28/09/2026 | verificado |
| V3 | O endpoint aberto valida por **CPF**, não pelo número do CRC — não confirma que `indCrc` pertence àquele CPF. O endpoint que aceita registro exige `hash` (credencial do CFC; como obter não está na página) | V1/V2 | pesquisado |
| V4 | Alternativas: consulta cadastral web (Spiderware, `www3.cfc.org.br/SPw/ConsultaNacional`, retornou 500 nesta sessão) e API paga de terceiro (Infosimples, `cfc-cadastro`, preço só com conta) | fontes §Fontes | pesquisado |
| V5 | Termos de uso/limite de taxa da API do CFC **não encontrados**; SLA desconhecido | busca sem resultado | pesquisado |
| V6 | O app nunca foi implantado; `server/` não faz chamada HTTP de saída para validar identidade hoje | memória `frontend-deferred-strategy`, Bloco A | lido |

## 2. Checklist candidato (só depois dos forks)

1. `CfcRegistryClient` (interface + implementação HTTP + fake para teste) em `server/src/lib/` —
   `isActiveAccountant(cpf) → 'ativo' | 'inativo' | 'indisponivel'`; timeout curto; nunca lança por
   falha de rede (vira `indisponivel`).
2. Ponto de chamada (F-V2): cadastro/edição do contato contador (`AccountingContactService`) grava
   `cfcCheckedAt` + `cfcStatus` na linha — migração aditiva em `accounting_contacts`.
3. Política (F-V3): `inativo` → 400 nomeado **ou** aviso; `indisponivel` → aviso, nunca bloqueia.
4. Auditoria: o evento de cadastro ganha `cfcStatus` (sem CPF — PII fica fora do payload, D5); entra
   na allowlist do `auditCanonical.ts` na mesma mudança.
5. Testes: client com fake (3 estados), serviço (política), integração com o fake injetado pela Factory.
   Nenhum teste chama a rede.

## 3. Contrato (esboço)

```ts
export interface ICfcRegistryClient {
  isActiveAccountant(cpf: string): Promise<'ativo' | 'inativo' | 'indisponivel'>;
}
// HTTP: GET https://sistemas.cfc.org.br/servico/api/Profissional?cpf={cpf}
//   200 {"EhContadorAtivo":1,...} → 'ativo' · {"EhContadorAtivo":0,...} → 'inativo' · erro/timeout → 'indisponivel'
// accounting_contacts: + cfcStatus TEXT NULL, + cfcCheckedAt DATETIME NULL (aditiva)
```

## 4. Forks — RATIFICAÇÃO PENDENTE

| Ref | Pergunta | (a) | (b) | (c) | Recomendação |
|---|---|---|---|---|---|
| **F-V1** | Fazer a frente? | Sim, pela API oficial aberta (por CPF) | Sim, pelo endpoint com `hash` (confere registro↔CPF) — exige pedir credencial ao CFC | Não agora | **(c) até implantar**: V6 — sem produção, a checagem não protege ninguém, e V5 (termos/limite desconhecidos) é risco de depender de endpoint não contratado. Quando houver data de deploy, **(a)**, e pedir a credencial do (b) em paralelo |
| **F-V2** | Quando conferir | No cadastro/edição do contato | Na geração do SPED | Nos dois | **(a)**: é o momento em que o dono pode corrigir; na geração vira 400 tardio |
| **F-V3** | Contador inativo | Bloqueia (400) | Aviso na tela + campo gravado | — | **(b)**: o CFC fora do ar ou atraso de baixa não pode travar a ECD; o PVA não confere isso, então o aviso é a informação que falta, não um gate |
| **F-V4** | LGPD — enviar o CPF do contador ao CFC | Base legal: cumprimento de obrigação/legítimo interesse, registrado no RoPA; o CFC já detém o dado | Pedir consentimento no cadastro | — | **(a)**, mas é decisão do dono (o Bloco A já lista a decisão de privacidade como oráculo aberto) |

## 5. Pendente de validação externa

- Termos de uso e limite da API do CFC (V5) — perguntar ao CFC/CRC antes de depender dela.
- Como obter o `hash` do endpoint por registro (V3).

## 6. Insumos ausentes

- Documento de privacidade/RoPA do produto (não existe no repo).

## 7. Achados fora de escopo

- A mesma API tem `Decore` (declarações comprobatórias de rendimento) e `EPC` (educação continuada) — sem uso no produto hoje.

## Fontes

- CFC Web API — https://sistemas.cfc.org.br/servico/help
- CFC Consulta Nacional — https://www3.cfc.org.br/SPw/ConsultaNacional/ConsultaCadastralCFC.aspx
- Infosimples, API CFC — https://infosimples.com/consultas/cfc-cadastro/
