---
tipo: "destino"
secao_sdd: "§9"
titulo: "Integrações e ecossistema"
---
# §9 Integrações e ecossistema

- **Bancos e pagamentos:** OFX/CNAB DECIDIDO; Pix, boleto, Open Finance, adquirentes, split payment PROPOSTO.
- **Fisco:** emissor DF-e por porta `DfeEmissorPort` DECIDIDO; SEFAZ/Ambiente Nacional, eSocial, Receitanet PROPOSTO.
- **Comunicação:** ⟨corr⟩ **pacote ao contador DECIDIDO, envio fora do sistema** — F-CD1 → (a): o produto gera o
  pacote e o dono envia pelo próprio e-mail; não há SMTP no server (`ADR-CONTADOR-DELIVERY.md:152-156`). WhatsApp
  Business, SMS, calendário PROPOSTO.
- **Comércio:** e-commerce, marketplaces, catálogo no WhatsApp PROPOSTO.
- **Plataforma:** API REST documentada (OpenAPI estático já existe), webhooks por evento, OAuth para apps GATILHO P5.
- **Importação:** planilhas, SPED anterior, base de outro ERP como dado inicial PROPOSTO.

Toda integração é periferia do eixo ORIGEM: parser/adaptador na borda, evento normalizado para dentro, idempotência
por identidade do evento (T7).
