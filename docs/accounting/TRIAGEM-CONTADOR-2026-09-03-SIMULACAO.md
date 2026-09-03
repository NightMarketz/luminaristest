# Triagem da resposta do contador — 2026-09-03 — ⚠️ SIMULAÇÃO

> **O que este doc é:** a triagem (Phase 3 do `luminaris-contador-liaison`) de uma resposta que o
> **dono escreveu fazendo o papel do contador**, declarada por ele como simulação. Serve para dois
> fins: (1) ensaiar o trilho de triagem antes da resposta real; (2) aproveitar o que **eu consegui
> verificar por fonte própria** nesta sessão — isso sim vira artefato.
>
> **O que não é (CTD-002, reforçado pela simulação):** nenhum item abaixo fecha gate, ADR ou dívida.
> Os itens marcados **"aguarda contador real"** ficam abertos até a resposta verdadeira ao
> [PEDIDO-CONTADOR-2026-09-03.md](PEDIDO-CONTADOR-2026-09-03.md).
>
> **Etiquetas desta triagem** (minhas, não as do "contador"): **[V-repo]** conferido no código/git
> desta sessão · **[V-web]** conferido em fonte externa nesta sessão, link ao lado · **[NC]** não
> conferido por mim — permanece afirmação do simulado.

---

## A. O que verifiquei — separado do que o simulado afirmou

### A.1 Contra o repositório [V-repo]

| Afirmação do simulado | O que o código diz | Veredito |
|---|---|---|
| "Se o parser trata tag desconhecida como erro, quebra; se ignora, perde o dado" | `lib/nfe.ts` (tag `nfe-fase-b-preserved`) usa `fast-xml-parser` e só lê campos nomeados; grupos `IBSCBS`, `IS`, `vNFTot`, `DFeReferenciado` têm **0 ocorrências** — são **ignorados em silêncio** | Confirmado a 2ª hipótese: não quebra, **perde o dado**. Vira dívida declarada (§C, T3) |
| "Chave de 44 dígitos embute o CNPJ; se o teste cruza, reprova; se não cruza, falta a asserção mais barata" | Parser valida só `@Id.slice(3) == protNFe/chNFe` (`nfe.ts:282-285`); **não** cruza com `emit/CNPJ`, **não** recalcula `cDV` | Confirmado a 2ª hipótese: **não há a asserção**. Vira item da spec de aceitação (§C, T4) |
| "`<Signature>` zerada quebra o XSD" | Parser **não valida XSD nem assinatura** (0 ocorrências de `Signature`/`xsd`) | Irrelevante para o parser de hoje; relevante para o fixture ser um documento válido. A spec de anonimização do pedido foi corrigida (§B) |
| "Se o parser valida DV do CNPJ, CNPJ fictício sem DV falha" | Parser **não valida DV** de CNPJ | Irrelevante hoje; a spec do pedido passa a exigir DV correto por segurança |
| "`vPIS`/`vCOFINS` do XML são do fornecedor; o crédito se calcula" | Parser **não lê** `vPIS`/`vCOFINS` (0 ocorrências) — nada soma o destacado | Não há o erro hoje. A guarda entra quando o crédito for modelado (ADR de apuração) |
| "Não fixe leiaute em constante" | `server/src/lib/ecf.ts:43` → `export const ECF_COD_VER = '0012'` — **constante**, com comentário "VERIFICAR" | **Confirmado.** Achado real, independente da simulação (§C, T5) |
| "Fórmula D3 assume não-contribuinte" | `ADR-INCR-NFE §D3` diz isso textualmente e já exige "flag/guarda de regime antes de qualquer molde não-salão reusar `lib/nfe.ts`" | Confirmado. O simulado só adiciona que o próprio molde salão pode deixar de ser não-contribuinte (A.2, item 4) |

### A.2 Contra fontes externas [V-web]

| Afirmação do simulado | Fonte que abri | Veredito |
|---|---|---|
| "Manual ECF Leiaute 12 vigente é de **20/05/2026**; não há versão de julho" | Índice oficial [sped.rfb.gov.br/pasta/show/1644](http://sped.rfb.gov.br/pasta/show/1644) lista "Manual da ECF — Leiaute 12 (Atualização: 20/05/2026)" [PDF](http://sped.rfb.gov.br/arquivo/show/8003) / [Word](http://sped.rfb.gov.br/arquivo/show/8004); versão anterior 28/04/2026 ([gov.br](https://www.gov.br/sped/pt-br/assuntos/escrituracoes-digitais/ecf/manuais-e-documentos-tecnicos/manual-da-ecf-versao-em-pdf-leiaute-12-atualizacao-28-04-2026)) | **Confirmado.** Não encontrei versão de 23/07 em nenhuma fonte — a pendência `[DONO confere] 23/07/2026` do `PROXIMOS-PASSOS-2026-09-02 §6.4` e do `KITS-PREFLIGHT` vinha de fonte secundária (ATVI) e **está corrigida** nesta sessão (§B). "Não achar não é não existir": o dono confere o carimbo do PDF ao baixar |
| "NT 2025.002 v1.40 em vigor; rejeição por falta de IBS/CBS a partir de 03/08/2026" | [contadores.cnt.br](https://www.contadores.cnt.br/noticias/tecnicas/2026/05/25/nt-2025-002-v-1-40-publicada-em-20-05-2026-o-checklist-tecnico-que-o-escritorio-precisa-cobrar-do-erp-do-cliente-ate-03-08-2026.html), [TOTVS](https://www.totvs.com/blog/fiscal-clientes/reforma-tributaria-nt-2025-002-v1-40-para-nf-e-nfc-e-traz-novos-ajustes-e-reforca-exigencia-do-ibs-cbs/), [NDD](https://reformatributaria.ndd.tech/atencao-aos-prazos-nt-2025-002-v1-40-define-inicio-das-rejeicoes-por-falta-de-ibs-e-cbs/) | ~~Confirmado~~ **Convergência de secundárias; primária pendente** (rebaixado na 2ª rodada — três publicações do mesmo release não são três fontes; o portal da NF-e deu redirect loop): NT publicada 20/05/2026, homologação 01/07, produção 03/08/2026. Consequência para o repo: XML real de compra emitido após 03/08/2026 **traz grupos que o parser ignora** |
| "2026 é ano-teste: 0,1% IBS + 0,9% CBS, recolhimento dispensado a quem cumpre acessórias" | [CRCBA](https://www.crcba.org.br/fisco-adia-preenchimento-do-ibs-e-cbs-nas-notas-fiscais-como-fator-de-rejeicao-mas-obrigacao-legal-permanece-a-partir-de-janeiro-de-2026/), [Tributei](https://tributei.net/blog/ibs-e-cbs-2026/) citando LC 214/2025 art. 348 §1º | **Confirmado** (secundárias) |
| "DCTF PGD extinta; MIT na DCTFWeb para IRPJ/CSLL/PIS/COFINS; importação por arquivo" | [Grupo Consult (IN RFB 2.237/2024 e 2.248/2025)](https://grupoconsult.com.br/noticias/extincao-da-dctf-mensal-e-implementacao-do-mit-na-dctfweb-entenda-a-in-rfb-n2-237-2024-e-atualizacoes-da-in-rfb-no-2-248-2025/), [CFC — manual MIT](https://cfc.org.br/wp-content/uploads/2025/02/MIT-DCTFWeb-JAN-2025.pdf) | **Convergência de secundárias** (blog + PDF hospedado no CFC; IN primária não aberta) para fatos geradores desde 01/2025; MIT aceita **importação de arquivo JSON**. A frase "API oficial" ficou **[NC]** — o que achei é import de arquivo, não API pública documentada |
| "Ato Conjunto RFB/CGIBS nº 4/2026: NF-e obrigatória a partir de 01/12/2026 para contribuinte de IBS/CBS **não contribuinte de ICMS**" | [PDF oficial no cgibs.gov.br](https://cgibs.gov.br/upload/arquivos/202607/31091735-20260730-16h30-ato-conjunto-rfb-cgibs-na-c2-ba-4-260731-090909.pdf) (30/07/2026), [Souto Correa](https://www.soutocorrea.com.br/client-alerts/reforma-tributaria-sobre-consumo-ato-conjunto-rfb-cgibs-no-4-2026-definidas-novas-datas-de-inicio-da-obrigatoriedade-de-emissao-de-documentos-fiscais/), [LegisWeb](https://www.legisweb.com.br/legislacao/?id=498712) | ~~Confirmado~~ **Convergência de secundárias; o PDF oficial foi *localizado*, não *lido*** (correção da 2ª rodada: o fetch deu `ECONNRESET`; escrevi "confirmado" tendo só o link). O simulado marcou [L]; fica em secundárias convergentes até alguém abrir o PDF. **E a onda relevante para o molde salão não é esta:** é a **NFS-e em 01/10/2026** (ver A.4). Art. 2º prevê programa de conformidade em novo ato em 30 dias |
| "STJ Tema 1231: ICMS-ST não integra custo de aquisição nem gera crédito de PIS/COFINS ao substituído" | [TJRO/NUGEPNAC — acórdão publicado](https://www.tjro.jus.br/nugepnac/recurso-repetitivo/20772-tema-1231-stj-acordao-publicado), [Teses & Súmulas](https://tesesesumulas.com.br/tese/stj/1231) | **Confirmado** o teor da tese (repetitivo, unanimidade). O simulado cita "modulação" — [NC] |

### A.3 Não conferido por mim [NC] — permanece afirmação do simulado

Art. 301 RIR (só tributo não recuperável entra no custo) · veículo legal da exclusão do ICMS da base do
crédito PIS/COFINS desde 05/2023 (MP 1.159/23 → Lei 14.592/23) · IN 2.121/2022 sobre IPI na base do
crédito e a jurisprudência contrária · ADI SRF 15/2007 (fornecedor do Simples) · DeRE e suas fases ·
prazos ECD (maio) / ECF (julho) · versão 12.1.4 do programa ECF · "~620 páginas" do Manual · registros
M300/M305/M310. **Cada um decide um comentário normativo ou um item de ADR; nenhum decide fórmula
sozinho.** Ficam para o contador real.

---

## B. O que mudou HOJE por verificação própria (não por autoridade do simulado)

1. **Pendência de data do Manual corrigida** em `PROXIMOS-PASSOS-2026-09-02 §6.4` e `KITS-PREFLIGHT-2026-09-02`: vigente = **20/05/2026** [V-web]; critério de aceite do pedido (item 4) ajustado.
2. **Spec de anonimização do pedido (item 3) corrigida** — três armadilhas eram reais contra o formato NF-e, mesmo que o parser de hoje não as detecte: chave reconstruída com `cDV` recalculado e coerente com o CNPJ fictício; `<Signature>` substituída por bloco sintético bem-formado, não esvaziada; CNPJ fictício com DV válido. E o pedido passa a **preferir XML autorizado após 03/08/2026** (com grupos IBS/CBS) — é o formato que o 1º cliente real vai mandar.
3. **Rota alternativa para o E9 registrada:** o XML da **própria compra** do dono (direito do destinatário) ou fixture de projeto open source com proveniência por commit público. Não depende do contador. É sugestão do simulado, mas o raciocínio se sustenta sozinho: o teste de proveniência exige origem auditável, não assinatura de contador.
4. **Master map §5 ganha uma linha "Reforma tributária IBS/CBS"** (NT 2025.002, DeRE, `cClassTrib`, Ato Conjunto nº 4) — todas ⚫ até ADR, mas **registradas**, porque "nunca constou do mapa" era o buraco que o simulado apontou e que eu confirmei.

---

## A.4 Segunda rodada — o dono revisou a triagem; o que conferi de novo

| Afirmação da revisão | Fonte / código | Veredito |
|---|---|---|
| **CNPJ alfanumérico**: IN RFB 2.229/2024; produção desde 01/07/2026; formato `[A-Z0-9]{12}[0-9]{2}`; DV módulo 11 com valor = ASCII − 48; NT 2026.004 atualiza o schema da NF-e; **a chave de 44 posições passa a `[0-9]{6}[A-Z0-9]{12}[0-9]{26}`** | [TecnoSpeed — NT 2026.004](https://blog.tecnospeed.com.br/layout-cnpj-alfanumerico/), [msdicas — chave com CNPJ alfanumérico](https://msdicas.com.br/blog/chave-acesso-nfe-geracao-cnpj-numerico-alfanumerico/), [Nota Gateway — NT 2026.004 v1.01 em 08/06/2026](https://notagateway.com.br/blog/nt-2026-004-receita-federal-publica-atualizacao-de-schema-da-nf-e-e-nfc-e-para-cnpj-alfanumerico/) | **[V-web, secundárias convergentes]** — responde a pendência "como o CNPJ entra na chave": **a chave deixa de ser numérica**. A NT primária no portal da NF-e não abriu (redirect loop) — fica pendente abrir o PDF |
| Repo rejeita CNPJ alfanumérico? | `SpedEcdDto.ts:23-24` e `SpedEcfDto.ts:22-23`: `z.string().regex(/^\d{14}$/)` | **[V-repo] SIM** — ECD e ECF recusam empresa/signatário com CNPJ novo. Parser da tag (`nfe.ts`): só `startsWith('NFe') && length === 47`, **sem `\d`** — passa. FE: sem regex. Cadastro de contraparte: `externalRef` livre |
| Onda do salão é **NFS-e em 01/10/2026**, não NF-e em 01/12 | [Tax Radar — cronograma por documento](https://taxradar.app/blog/reforma-tributaria/ato-conjunto-4-cronograma-documentos-fiscais-ibs-cbs), [Honda Teixeira Rocha](https://www.hondatar.com.br/reforma-tributaria-cronograma-de-obrigatoriedade-dos-documentos-fiscais-eletronicos-do-ibs-e-da-cbs-ato-conjunto-rfb-cgibs-no-4-de-30-de-julho-de-2026/) | **[V-web, secundárias]**: NFS-e (serviços sujeitos ao ISS) **01/10/2026**; NF-e de sujeito passivo IBS/CBS não contribuinte de ICMS **01/12/2026**; Simples **01/01/2027**. O PDF oficial deu `ECONNRESET` nesta sessão — ler artigo por artigo continua pendente. Salão com revenda pega as duas ondas |
| XML bruto é guardado? | `NfeImportService` (tag): só `createPayable`; `NfeSaleReconciliationService`: `attachSourceDocument` com `externalRef`/`documentDate`/`description`, **sem `attachmentId` nem `rawJson`** | **[V-repo] NÃO é persistido.** Mas `SourceDocument.attachmentId` (`schema.prisma:769`) e `DocumentAttachment` (sha256, `storageKey`, alvo `JOURNAL_ENTRY`) **já existem em `main`** — persistir custa **zero migração**: anexar o XML ao lançamento postado e apontar `attachmentId` |
| NT 2025.002: "três secundárias repetindo um release não são três fontes" | Portal da NF-e (`nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=`) | **Aceito.** Tentei a primária: redirect loop. Rebaixo o veredito de "confirmado" para **"convergência de secundárias; primária pendente"**. Vale igual para o CNPJ alfanumérico e para o Ato nº 4 acima |
| "API oficial do MIT" | — | O dono retirou; fica **[NC]**. Sobe de "verificação barata" para **bloqueante** dos ADRs X7/X9: file writer (JSON importado no e-CAC) × HTTP client são duas arquiteturas |

---

## C. Triagem, na taxonomia do liaison — revisada na 2ª rodada

Coluna nova **"Atravessa 2027?"** (sequenciar por sobrevivência: PIS/COFINS morrem na transição, CBS entra).

| # | Item | Classe | Trilho | Executor | Atravessa 2027? | Estado |
|---|---|---|---|---|---|---|
| **T1a** | **Split de campo:** `custoEstoqueCents` ≠ `baseCreditoPisCofinsCents`; ICMS-ST entra no custo (CPC 16, não recuperável) e **não** entra na base do crédito (STJ Tema 1231, repetitivo [V-web]) | **crítica** — não depende de contador | Regra **(j)** do rebase da NF-e (cédula de integração §E2): dois campos no resultado de D3; preenchimento da base = custo − `vST` até o T1b decidir o ICMS próprio | `sessao-integracao` | **sim** (custo de estoque é permanente) | aberto, **desbloqueado** |
| **T1b** | Recuperabilidade efetiva de ICMS por **tenant** (contribuinte? saída tributada?) e por **fornecedor** (Simples), e posição de risco sobre IPI na base do crédito | **crítica** — exposição, não engenharia | Emenda `ADR-INCR-NFE §D3` com flag de regime; comentário normativo (Lei 14.592/23, IN 2.121/22 — [NC]) | contador **+ advogado**, depois ADR | parcial (ICMS sim; PIS/COFINS não) | **aguarda contador real** |
| **T2** | Lista de obrigações + corte "arquivo p/ PVA" × "portal/MIT" | **dado, incompleto** | ADRs X7–X9 nascem com **dois adaptadores**; **bloqueante:** decidir se o MIT é file writer (JSON) ou HTTP client | agente após resposta | DCTFWeb/MIT **sim**; EFD-Contribuições **não** | parcial |
| **T3** | Parser ignora grupos IBS/CBS **e o XML bruto se perde** | **crítica** [V-repo] | Regra **(i)** do rebase: persistir o XML íntegro como `DocumentAttachment` do lançamento postado (compra: o lançamento do `Payable`; venda: o já postado) e gravar `SourceDocument.attachmentId`. Zero migração. Com isso, `ibsCbs?` no `ParsedNfe` vira backfill quando precisar, não perda | `sessao-integracao` | **sim** — imuniza contra toda NT futura | aberto, **desbloqueado** — maior alavanca da lista |
| **T4 → T10** | **Tipagem de CNPJ (transversal):** chave alfanumérica desde 07/2026; `SpedEcdDto`/`SpedEcfDto` rejeitam com `^\d{14}$` [V-repo]; asserção chave×CNPJ×DV tem de usar a rotina ASCII−48 **e** um caso de teste com CNPJ alfanumérico sintético (senão passa hoje e reprova o 1º fornecedor novo) | **crítica** [V-repo + V-web] | Item transversal próprio: (1) `lib/cnpj.ts` puro — validador alfanumérico + DV ASCII−48 + teste com ambos os formatos; (2) trocar os 4 regex dos DTOs SPED; (3) regra **(h)** do rebase reescrita: `chNFe.slice(6,20) == emit/CNPJ` **alfanumérico** + `cDV`; (4) revisar `Counterparty` (hoje `externalRef` livre, sem tipagem — não quebra, mas não valida) | BRIEF `BE-INCR-CNPJ-ALFA` (pequeno) — antes do merge da NF-e | **sim** | aberto, **desbloqueado** |
| **T5** | `ECF_COD_VER = '0012'` constante; fatos de 2026 → Leiaute 13 | **crítica** [V-repo] | Parametrizar por ano-calendário no `SpedEcfDto` (molde do `0010`) | BRIEF ECF Fase 3, item novo | **sim** | aberto |
| **T6** | Manual ECF: 20/05/2026 | **dado** | feito | dono baixa o PDF | — | critério fechado; insumo aberto |
| **T7** | XML: rota própria/open source | **fora do pedido** | alternativa do E9 | dono | — | aberto |
| **T8** | **Onda do salão = NFS-e 01/10/2026** (4 semanas), NF-e 01/12 se revender | **confirmação** ([V-web] secundárias; PDF pendente) | **Não é linha de ADR — é decisão datada do dono:** emitir documento fiscal (NFS-e/NF-e) ou não; até quando decidir; qual o gatilho. Emissão = certificado A1/A3 e custódia, série/numeração, autorização, contingência, cancelamento/carta de correção, rejeições — **outro produto dentro do produto**. Registrado como **F-M7 (pendente)** na cédula de módulos | dono | **sim** | **decisão pendente** |
| **T9** | IRPJ/CSLL mensal × trimestral | **não é fork — é restrição já assumida:** ECF Fase 3 ratificou apuração **trimestral** (Fork 5→(a)) | Ou **declarar** "o módulo atende só apuração trimestral" como critério de qualificação de cliente (no ADR Fase 3 e no futuro `ADR-INCR-TAX-ASSESSMENT`), ou **reabrir** o Fork 5. Registrado como **F-M8 (pendente)** | dono | **sim** | **decisão pendente** |
| **T11** | Sequência dos ADRs fiscais por sobrevivência | **método** | Ordem nova em E.3 da cédula de módulos: ingestão NF-e + custo (T1a/T3/T10) → ECD/ECF → **DCTFWeb/MIT + IRPJ/CSLL** → só depois, **deliberadamente raso**, PIS/COFINS + EFD-Contribuições (vida útil ≈ 1 ano) | agente | — | aplicado |

---

## D. Pendências, com o que cada uma decide — revisadas

| Pendência | Grau | Decide | Bloqueia? |
|---|---|---|---|
| MIT: file writer (JSON) × HTTP client — existe API pública? | [NC] | Arquitetura do adaptador "portal" | **SIM** — ADRs X7/X9 |
| Ler o Ato Conjunto nº 4 no PDF, artigo por artigo (deu `ECONNRESET`) | secundárias convergem | Onda exata do salão (NFS-e 01/10 × NF-e 01/12) e se revenda pega as duas | F-M7 |
| Abrir a NT 2026.004 e a NT 2025.002 primárias no portal da NF-e (redirect loop) | secundárias convergem | Forma exata da chave alfanumérica e dos grupos IBS/CBS | T10, T3 |
| Veículo legal da exclusão do ICMS da base do crédito; IN 2.121/22 (IPI) | [NC] | Comentário normativo de T1b | não |
| Baixar o PDF do Manual 20/05/2026 e conferir o carimbo | [V-web] índice | Forks 2/3/4 da ECF Fase 3 | X4 |
| Resposta do **contador real** | — | T1b, T2 | X7–X9 |
| **Z0-a — o contador assina ECD/ECF que não conduziu, e sob que condições?** (4ª rodada; item 0 do pedido) | [L] do dono, não conferido: assinatura com certificado do contabilista com CRC, responsabilidade técnica perante o conselho | Se a **premissa do F-Z0** ("o contador só assina") se sustenta; "não" ou "só lançamento a lançamento" reabre F-Z0 e C8/C9/C6 | **SIM** — todo o trilho contábil novo |
| **Z0-b — fronteira software de contabilidade × serviço contábil (CRC)** | [L] do dono | Se o produto pode ser vendido como "sua contabilidade no sistema" ou só como ferramenta do contador responsável | material comercial |
