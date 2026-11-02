---
id: "D-2026-10-30-D5-SEM-CONTRATACAO-BYOK"
tipo: "decisao"
dominio: "gate"
titulo: "D5: o Luminaris não contrata PSC nem e-CNPJ; serviço que um dia for contratado será BYOK (credencial do cliente)"
estado: "decided"
autorizacao: "dono, chat, 2026-10-30: \"Marca a decisão não vai contratar nenhum serviço, se for contratar um serviço um dia, vai ser BYOK\" — junto do pedido \"preparar a decisão do D5 (PSC + e-CNPJ do Luminaris) — só docs, sem código, sem contratar nem preencher formulário de compra\"; não é 'executa' de nada nem autoriza merge"
atualizado: "2026-10-30"
---
# D-2026-10-30-D5-SEM-CONTRATACAO-BYOK

**Estado:** `decided`. **Autorização:** dono, chat, 30/10/2026 (citação no frontmatter).
**Não é `executa`** (ORCH-006) e não autoriza merge.

## Decisão

1. **O Luminaris não contrata serviço** para emitir documento fiscal. Isso inclui o PSC e o e-CNPJ do Luminaris que o
   [[D5]] previa desde 15/10 como transmissor da NF-e e da NFC-e. Fecha o item (3) do fold de 22/10 do D5, "quem
   contrata o PSC": ninguém do lado do Luminaris.
2. **Se um dia houver serviço, é BYOK:** o cliente contrata a credencial (e-CNPJ em nuvem no PSC que escolher) e a
   autoriza no Luminaris pela API OAuth da DOC-ICP-17.01.

## Efeitos

- Análise, comparativo de 30/10 e perguntas para a venda dos PSCs: [`D5-DECISAO-2026-10-30.md`](../gates/D5-DECISAO-2026-10-30.md).
- **Abre um problema:** sem e-CNPJ do Luminaris, ninguém tem certificado para o mTLS com a SEFAZ. As saídas estão no §4.1
  da análise. A transmissão real de NF-e e NFC-e ([[X10a]] PR-7..PR-9 fora do PSC falso) fica bloqueada até o dono
  escolher uma.
- **Fato novo (verificado no texto da norma):** a DOC-ICP-17.01 v3.0 §6.4.5.3 obriga a aplicação a se cadastrar em cada
  PSC com certificado SSL ICP-Brasil. O §6.4.6.1, opcional, permite o cadastro sem esse certificado. Se o PSC só tiver o
  §6.4.5.3, o BYOK depende de uma compra que a decisão não cobre (pergunta 1 da análise).
- **NFS-e sem mudança:** segue pelo portal ([[D-2026-10-22-NFSE-PORTAL-E-H1-POR-ULTIMO]]); o PSC não emite NFS-e (FAQ
  NFS-e v1.1 item 17.7).
- Supera, só no ponto "e-CNPJ do Luminaris como transmissor", o fold de 15/10 do [[D5]] e a linha "§4 item 1" do
  `BE-INCR-NFCE-EMENDA-2-brief.md`. A regra do MOC 7.0 continua verdadeira: o transmissor pode ser terceiro. O que mudou
  é que o Luminaris não será esse terceiro.
