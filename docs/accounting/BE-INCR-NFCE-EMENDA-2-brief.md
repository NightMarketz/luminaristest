# BE-INCR-NFCE — EMENDA 2 (F-NFCE-E1-1..4 e 6..9 ratificados; assinatura pelo PSC; 27 UF)

> `sessao-planejamento`, 2026-10-13, base `origin/main` `9f6477d8`. **Emenda** à
> [`BE-INCR-NFCE-EMENDA-1-brief.md`](BE-INCR-NFCE-EMENDA-1-brief.md) (nó [`X10a`](../plano/nos/X10a.md)). Sem código.
> **Implementação exige "executa" próprio** (ORCH-006); a emissão real exige "executa" de emissão.
>
> **Autorização, literal:** dono, chat, 2026-10-13: *"Grava as decisões e abre as 4 emendas"*, sobre as cédulas
> F-NFCE-E1-1..4, 6..9 ([[D-2026-10-13-QUESTIONARIO-BRIEFS-PRONTOS]]). Cobre só este documento.
>
> **Em duas linhas:** os forks da EMENDA-1 estão decididos, menos o E1-5 (contingência), que espera a L-NFCE-2. A
> assinatura não é por A1 guardado: vale o F-E8-1R de 11/10 (certificado em nuvem no PSC, `BE-INCR-DFE-ASSINATURA-
> PLANEJAMENTO-2026-10-11.md`). **Risco principal (inferido):** o webservice da SEFAZ exige TLS mútuo com o e-CNPJ, e
> com o certificado só no PSC o Luminaris não tem a chave para o handshake. Isso pode travar o PR-7 inteiro (§4).

## 1. Precedência entre decisões

1. **11/10 vence 10/10 onde se tocam.** Tudo na EMENDA-1 que diz "A1 por unidade", "upload do PFX",
   `FiscalCertificate` ou "reuso ADN-3..7" (item E-1; contrato `NfceCsc` com "keyring do F-ADN-3") passa a ler
   "credencial do PSC por unidade, pelo adaptador da F-E8-3 (a)". O Luminaris não guarda chave privada.
2. O **F-NFCE-E1-1 (a)** de 13/10 é compatível com o F-E8-1R: emissor próprio falando com a SEFAZ, assinando pelo PSC.
3. A **E8-3** de 11/10 (X10a via PAA) **caiu** com o F-E8-1R (o PAA não atende o salão; memória `paa-nao-atende-salao`).

## 2. Forks ratificados (13/10) e efeito nos itens

| Fork | Decisão | Efeito |
|---|---|---|
| E1-1 | (a) emissor próprio para NF-e/NFC-e | E-2, E-4..E-8, E-10 valem; assinatura pelo PSC (§1) |
| E1-2 | (a) um `SefazNfeEmissor` para 55 e 65 | sem mudança |
| E1-3 | **(b) 27 UF agora** (contra a recomendação) | item E-11 novo (§3) |
| E1-4 | v3; v2/CSC só se a L-NFCE-1 disser que SP não aceita v3 | E-3 condicional à L-NFCE-1; `NfceCsc` só nesse ramo |
| E1-5 | **pendente** (L-NFCE-2) | E-9 e PR-9 seguem pausados |
| E1-6 | (b) BE entrega chave/QR/URL; DANFE no BRIEF de FE | sem item de PDF no BE |
| E1-7 | (a) NT 2025.002 **v1.52**, download autorizado | PR-0 baixa o PDF pela ferramenta oficial (`legal.py baixar`, domínio oficial, SHA-256 no manifest) |
| E1-8 | (b) envia direto; status sob demanda | sem pré-chamada no caminho do balcão |
| E1-9 | (a) BRIEF irmão primeiro | PR-7 espera o transporte e o adaptador de assinatura do lado NFS-e |

## 3. Item novo

- **E-11 [E1-3 b] Tabela de webservices das 27 UF.** `SEFAZ_ENDPOINTS` com uma linha por `(UF, modelo, ambiente,
  serviço)`, inclusive as UF atendidas por SEFAZ virtual (SVRS/SVAN) com a UF de origem apontando para a
  autorizadora. **Cada linha tem `fonte` (URL oficial + data de acesso)**; linha sem fonte não entra (a UF fica
  desabilitada com motivo, como a recomendação (a) previa para as faltantes). Fonte primária esperada: a página de
  webservices do Portal Nacional da NF-e e a de cada SEFAZ com autorizadora própria — a ler no PR, não nesta sessão.
  *Teste:* toda linha com URL `https://` e `fonte` não vazia; 27 UF × {55, 65} × {homologação, produção} ×
  5 serviços cobertos ou com motivo de desabilitação nomeado; teste de propriedade "UF sem linha ⇒ erro nomeado,
  nunca URL de outra UF".
- Custo aceito pelo dono: dado que envelhece sem uso. Mitigação: o teste de cobertura acima e a data na `fonte`.

## 4. Pendente de validação externa

1. **TLS mútuo × certificado só no PSC** (inferido; nenhuma fonte lida nesta sessão). A SEFAZ e a Sefin Nacional
   autenticam o cliente por certificado no handshake. Perguntas: (a) algum PSC da LPSC oferece assinatura do
   handshake TLS ou sessão mTLS por API? (b) a DOC-ICP-17.01 prevê isso? (c) se não, a única saída é um certificado
   de **transporte** distinto do de assinatura, e isso é admitido pela SEFAZ? Até a resposta, o PR-7 não começa.
   Deve ir também à emenda do BRIEF ADN (não aberta hoje).
2. **L-NFCE-1** (SP aceita QR v3 para PJ?) — decide o ramo do E1-4. Pesquisa por fonte oficial.
3. **L-NFCE-2** (contingência em SP; vender sem nota quando a SEFAZ cai) — decide o E1-5.
4. **Cota do PSC × NFC-e por venda** (risco anotado em 11/10: 6.000 assinaturas/ano num PSC). Volume do salão a medir.

## 5. Plano por fatias (substitui a linha PR-7 do §9 da EMENDA-1)

| PR | Itens | Depende |
|---|---|---|
| PR-0 (docs) | 1 + v1.52 | download (autorizado 13/10) |
| PR-1..PR-6 | como no original (Fases A–F, `NullEmissor`) | **nada novo — prontos para "executa"** |
| PR-7 adaptador SEFAZ | E-2, E-4..E-8, E-10, **E-11** | §4 item 1 + adaptador PSC + transporte do BRIEF irmão |
| PR-8 NFC-e on-line | E-3 | L-NFCE-1 |
| PR-9 contingência | E-9 | E1-5 ← L-NFCE-2 |

## 6. Achados fora de escopo

- O BRIEF ADN (`BE-INCR-DFE-ADN-EMISSOR-brief.md`) ainda tem F-ADN-4, F-ADN-10 e F-ADN-11 escritos para PFX local.
  Eles precisam de emenda para o adaptador PSC antes de irem ao dono. Exige pedido próprio.
