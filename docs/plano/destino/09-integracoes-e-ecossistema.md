---
tipo: "destino"
secao_sdd: "§9"
titulo: "Integrações e ecossistema"
---
# §9 Integrações e ecossistema

- **Bancos e pagamentos:** OFX/CNAB DECIDIDO; Pix, boleto, Open Finance, adquirentes, split payment PROPOSTO.
- **Fisco:** emissor DF-e por porta `DfeEmissorPort` DECIDIDO; SEFAZ/Ambiente Nacional, eSocial, Receitanet PROPOSTO.
  ⟨corr 02/10⟩ **Emissão direta no Emissor Nacional ou na SEFAZ: fora por decisão do dono**
  ([[D-2026-09-26-EMISSAO-FISCAL-BYOK]], decisão 2) — só reabre com as duas condições da nota. O que faltaria
  está medido em [`MAPA-COBERTURA-EMISSAO-2026-10-02.md`](../../accounting/MAPA-COBERTURA-EMISSAO-2026-10-02.md) §3.4.
- **Comunicação:** ⟨corr⟩ **pacote ao contador DECIDIDO, envio fora do sistema** — F-CD1 → (a): o produto gera o
  pacote e o dono envia pelo próprio e-mail; não há SMTP no server (`ADR-CONTADOR-DELIVERY.md:152-156`). WhatsApp
  Business, SMS, calendário PROPOSTO.
  ⟨corr 02/10⟩ Entregar a **nota fiscal ao tomador** (e-mail ou WhatsApp) fica fora do produto: F-COB-1 (mapa 02/10)
  ratificado → (a) em 02/10 — o operador baixa e repassa; mede-se se o portal ou a Focus enviam.
- **Comércio:** e-commerce, marketplaces, catálogo no WhatsApp PROPOSTO.
- **Plataforma:** API REST documentada (OpenAPI estático já existe), webhooks por evento, OAuth para apps GATILHO P5.
- **Importação:** planilhas, SPED anterior, base de outro ERP como dado inicial PROPOSTO.

Toda integração é periferia do eixo ORIGEM: parser/adaptador na borda, evento normalizado para dentro, idempotência
por identidade do evento (T7).
