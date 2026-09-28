---
id: "D-2026-09-26-SIG-NFE-FORKS"
tipo: "decisao"
dominio: "fiscal"
titulo: "SIG-NFE: forks F-SIG-1..5 ratificados + emenda pós-pesquisa de mercado (e-CPF, NFA-e, codificação)"
estado: "decided"
autorizacao: "dono, 2026-09-26, em sessão: questionário dos 5 forks (todos na recomendação) + \"executa o SIG-NFE 2.4\" + resposta à pesquisa de mercado \"1. c / 2. Pode implementar / 3. pode corrigir\""
atualizado: "2026-09-26"
---
# D-2026-09-26-SIG-NFE-FORKS — rigor da verificação XMLDSig da NF-e

**Estado:** `decided`
**Autorização:** dono, 2026-09-26, em sessão (questionário dos forks; *"executa o SIG-NFE 2.4"*; resposta à pesquisa
de mercado *"1. c / 2. Pode implementar / 3. pode corrigir"*)

## Forks ratificados (texto completo no BRIEF `docs/accounting/BE-INCR-NFE-SIGNATURE-brief.md` §3, #402)

| fork | escolha | em uma linha |
|---|---|---|
| F-SIG-1 | (a) | nota com assinatura inválida **ou ausente** é recusada (400) |
| F-SIG-2 | (a) | dependência nova `xml-crypto` + `@xmldom/xmldom`, versão fixada |
| F-SIG-3 | (b) | integridade + titular do certificado × emitente + `dhEmi` na validade; cadeia ICP-Brasil = (c), nó seguinte |
| F-SIG-4 | (b) | sem bypass em produção; testes assinam com chave de teste |
| F-SIG-5 | (a) | import, venda e preview verificam (a verificação vive no `parseNfe`) |

## EMENDA — mesma data, depois da pesquisa de mercado (#403)

A pesquisa leu o MOC 7.0 **Anexo I** (grupos E/F; campo B07), a **DOC-ICP-04 v8.3** (ITI) e a nfephp. As fontes estão
transcritas com sha256 em `docs/accounting/fontes-oficiais/TRANSCRICAO-MOC70-assinatura-digital-NFe-2026-09-26.md`.

1. **NFA-e com `procEmi=1` → (c).** A NF-e avulsa emitida no site do Fisco é assinada pelo e-CNPJ da **SEFAZ**, não do
   emitente. Nesse caso o verificador exige só que o certificado tenha CNPJ/CPF (rejeição 292); quem é a SEFAZ, só a
   cadeia do F-SIG-3 (c) prova. Não abre risco novo: com o F-SIG-3 (b), quem re-assina já escolhe o CNPJ.
2. **e-CPF → implementar** (regra F03A, rejeição 227): o CPF do OtherName 2.16.76.1.3.1 (posições 9–19) tem de ser igual
   ao `emit/CPF`. Isso amplia o F-SIG-3 (b), que só falava de CNPJ.
3. **Codificação do OtherName → corrigir pela norma** (DOC-ICP-04 7.1.2.2): só OCTET/PRINTABLE STRING, só A–Z/0–9, e
   valor todo-zero conta como ausente.

## Não decidido (registrado, sem ação)

- DOC-ICP-04 v8.3: o OtherName de CPF/CNPJ fica **opcional depois de 31/12/2028** (passa ao `serialNumber` do DN).
  O MOC 7.0 e a regra E03 ainda o exigem. Revisitar antes dessa data, ou quando sair NT sobre isso.
