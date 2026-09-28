# Passagem de sessão — emissão fiscal (26–27/09/2026)

> Leia isto primeiro na próxima sessão. Estado vivo continua no vault ([`docs/plano/_INDEX.md`](../plano/_INDEX.md));
> este documento condensa **o que foi decidido, o que foi feito, o que ficou aberto e o que morde**.

## 1. Em duas linhas

O dono decidiu que o Luminaris emite nota **só por parceiro BYOK (Focus primeiro)**, com um **modo manual sem
parceiro** (ficha do portal público + retorno pelo XML) cuja precisão vem da **releitura** XML × DPS. O backend do modo
manual e da releitura está **implementado** (BE-INCR-DFE-MANUAL, nó `DFE-MANUAL`); a suíte **unitária** está verde, a de
**integração não foi provada localmente** (EBUSY no Windows) — a CI do PR é o oráculo.

## 2. Decisões do dono (registro completo: [`D-2026-09-26-EMISSAO-FISCAL-BYOK`](../plano/decisoes/D-2026-09-26-EMISSAO-FISCAL-BYOK.md))

| Tema | Decisão |
|---|---|
| Parceiro (D5) | **Focus NFe**, BYOK. Conta, contrato, preço e A1 **ainda não** conferidos |
| Emissão direta com o governo | **Fora** (Emissor Nacional por API e SEFAZ direto). Reabre só com: demanda de clientes só-serviço sensíveis a preço **e** aceite de custódia do A1 com cifra em repouso (M2) |
| Adaptador | Um por **protocolo** que o código chama; estado/município = configuração do perfil fiscal |
| Modo manual | Ficha espelho do portal + retorno pelo **XML autorizado**; só NFS-e |
| Precisão | **Releitura** nota a nota (XML autorizado × DPS enviada), reusada pela Focus |
| D2/E9 | Sem XML real até o 1º cliente; ponte = NF-e fictícia de leiaute completo (assinada com chave de teste) |
| Forks F-MAN-1..5 + 2b | 1 **(a)** conferir assinatura já · 2 **(c)** status `AUTHORIZED_DIVERGENT` · 3 (a) `ManualEmissor` · 4 (a) portal numera · 5 (a) cancelamento exige XML do evento · 2b (b) divergente **só sai cancelando** |
| Forks do plano | F-PLAN-1 **(b)** `DFE-MANUAL` é nó de régua (fiscal 11/20) · F-PLAN-2 (a) NFC-e na porta via parceiro (espera D-2 do X10a) · F-PLAN-3 (a) "NF-e recebidas" como 2ª origem **quando houver conexão Focus** · F-PLAN-4 (a) manual primeiro |
| Fora do fiscal | Mercado Pago agora, CNAB depois (D6) · VPS contratada (M2) · ordem dos gates H1 → H2 → M2 |

## 3. O que foi feito (tudo neste PR)

**Docs:** [ADR-DFE §11](../adr/ADR-INCR-DFE-EMISSAO-PARCEIRO.md) (emenda + fatos da Focus + prazos do Ato Conjunto 4) ·
[plano granular](PLANO-EMISSAO-FISCAL-2026-09-27.md) (Fases 0–H) · [BRIEF](BE-INCR-DFE-MANUAL-brief.md) (18 itens) ·
[transcrição NFS-e](fontes-oficiais/TRANSCRICAO-NFSe-infNFSe-E0010-evento-v1.01-2026-09-27.md) (infNFSe, E0010,
assinatura, evento) · [follow-up ao contador](PEDIDO-CONTADOR-2026-09-23-followup.md) (5 itens, **não enviado**) ·
13 notas do vault atualizadas + nó `DFE-MANUAL`.

**Código (server/):**
- `lib/nfse.ts` (leitor da NFS-e autorizada) · `lib/nfseSignature.ts` (E1630/E1634; titular **não** amarrado ao
  prestador) · `lib/nfseReadback.ts` (13 campos, sem PII) · `lib/nfseEvento.ts` (evento e101101).
- `dfe/ManualEmissor.ts` (substitui o FileEmissor; sem disco; `numbersDps: true`) · `dfe/resolveEmissor.ts` (adaptador
  **do documento**, não do env).
- `FiscalDocumentLifecycleService`: `retornoManual` (4 guardas de identidade: prestador, chave única, nota posterior ao
  documento, origem = portal), `rejeicaoManual`, `cancelamentoManual`; job pula documento manual; corrida → 409.
- `FiscalDocumentEmissionService`: DPS manual sem numeração; `ficha`; pendência `releitura_divergente`.
- Status novo `AUTHORIZED_DIVERGENT`; `whenStatusIn` (guarda dentro da escrita) no repositório.
- 4 rotas (`/nfe/dfe/documents/:id/{ficha,retorno-manual,rejeicao-manual,cancelamento-manual}`), OpenAPI 222 paths,
  audit `dfe.manual_result`, snapshot de DTO, upload multi-campo (`makeUploadFieldsMiddleware`).
- Testes: NF-e fictícia completa (`purchase-full-layout.SYNTHETIC.xml`) e NFS-e fictícia (`fixtures/nfse/`).

**Provas:** `tsc` limpo · unit 238 suítes / 3263 testes verdes · mutações nas regras centrais derrubaram o teste certo
(comparação de valor, adaptador por documento, guarda de origem, status divergente) · guarda OpenAPI 222.

## 4. O que ficou aberto (em ordem)

1. **Integração** — as duas rodadas locais tiveram EBUSY (1260 e 300) e **não valem**; a CI Linux do PR decide.
2. **Revisão independente** — a sessão de feature exige; o `CLAUDE.md` suspende revisor novo com Bloco A aberto >14 dias.
   Conflito de regra: **decisão do dono**.
3. **Fold do vault depois do merge** — `DFE-MANUAL` → `estado: "done"`, `prs: [<PR>]`, `estado_detalhe` citando o
   runbook H2-DFE-MANUAL pendente; depois `node scripts/plano-vault.mjs index && … check`.
4. **Correção do `pAliq`** que o dono disse ter feito — **não encontrada** em nenhum lugar visível desta sessão. O
   `DpsPayloadSchema` (X10b) ainda aceita 2 dígitos inteiros; o XSD aceita 1 (transcrição §8).
5. **FE-INCR-DFE** (tela: botão, ficha espelho nos 4 passos do guia oficial, upload do XML, releitura na tela) — só BRIEF
   a abrir; telas vêm do [guia oficial do Emissor Web v1.2](https://www.gov.br/nfse/pt-br/biblioteca/documentacao-tecnica/documentacao-atual/guia-emissorpubliconacionalweb_snnfse-ern-v12.pdf).
6. **Runbook H2-DFE-MANUAL** (gate humano) depois da tela.
7. **D5** (dono): conta Focus, contrato/preço, A1 → BRIEF do `FocusEmissor` (X10i) + "executa" da emissão real.
8. **Contador** (dono envia): ISS + cClassTrib, códigos do referencial, COD_PB_RFB, monofásico como insumo, **data do
   Simples** (Ato 4 § 1º diz 01/01/2027; ele disse 01/11/2026).
9. **Prazo:** NFS-e do salão em regime normal obrigatória desde **01/10/2026** (Ato 4, art. 1º III d) — até a tela
   existir, o cliente emite no portal fora do Luminaris.
10. **Gates humanos:** P4 (colar os prints no runbook), H1 (importar ECD/ECF no PVA — arquivos em
    `luminaris-gates\h1-2025\`), H2, M2.

**Achados fora do escopo (não corrigidos):** o `id` da DPS do X10b nunca é refeito com o número real ·
`applyResult` grava anexo/proveniência antes da tx (mitigado no retorno manual por pré-checagem) · a assinatura do XML
do evento de cancelamento não é verificada (a spec não pediu) · o webhook compara o parceiro com o do env (X10i).

## 5. O que morde neste ambiente (Windows + worktree)

- **Integração:** rode `npm run test:integration` **sozinha**; qualquer outro jest (até um `npx jest <padrão>` que case
  suíte de integração) trava o `test-integration.db` → EBUSY em massa. `grep -c EBUSY` no log antes de triar; exit code
  não é gate.
- **Worktree novo:** `npm ci` + `server/.env` com `OPENAI_API_KEY=ci-dummy-openai-key`.
- **`baixar-fontes-oficiais.mjs --so=<id>` reescreve o `MANIFEST.md` só com o item** — restaure com
  `git checkout -- docs/accounting/fontes-oficiais/MANIFEST.md` e compare sha256 à mão. Binários ficam fora do git.
- **Git Bash converte argumentos que parecem caminhos** (`/documents/:id/…`, `../features/…`) em `node -e` → edite por
  arquivo (script `.mjs` escrito com a ferramenta de escrita), não por string no shell.
- **Arquivos do `server/` são CRLF** — edição por troca exata precisa normalizar o fim de linha.
- **NFS-e:** a assinatura é da Sefin Nacional (não do prestador); a DPS vem embutida em `NFSe/infNFSe/DPS`; série do
  portal web = 70000–79999 (E0010).
