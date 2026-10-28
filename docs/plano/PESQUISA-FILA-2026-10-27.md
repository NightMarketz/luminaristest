---
tipo: "referencia"
titulo: "Fila de pesquisa de 27/10/2026 (blocos 1 a 6): o que mudou"
---
# Fila de pesquisa de 27/10/2026 (blocos 1 a 6): o que mudou

**Pedidos do dono (chat, 27/10), todos "só leitura":** "Roda a fila de pesquisa, blocos 1 e 2 (retenções e EFD-Reinf)",
"... blocos 3 e 4 (eficiência fiscal e linhas DRAFT de 21/10)" e "... blocos 5 e 6 (cClassTrib vigente e terceiros: PSCs e
Payouts do Mercado Pago)". **Fold (chat, 28/10):** "Faz o fold dos achados da fila de pesquisa de 27/10 (blocos 1 a 6) no vault
e nos BRIEFs, junto com os 7 dossiês, num PR sem merge."
**Método:** `legal.py` pelo `VERIFICACAO-LEGAL.md` (acervo `ctresb/leis` primeiro; fonte oficial com evidência de texto mais
novo). Páginas de fornecedor (PSCs, Mercado Pago) lidas no navegador embutido, com o SHA-256 do texto.
A fila saiu da aba "Gates e decisões" do artefato do roadmap (revisão de 27/10).

**Em duas linhas:** 20 itens fechados ou encolhidos em fonte oficial; o pacote do contador fica em 2 perguntas (P-REINF-3,
P-REINF-6) e 2 confirmações de sim ou não (mapa da P-REINF-2; P-REINF-8 = P-RET-9).
**Risco principal:** nada disso mudou código. As linhas `DRAFT` dos seeds só saem com PR de dado e `executa` próprio, e o F6 e
o PSC esperam decisão do dono.

## 1. Resultado por item

Grau: **V** = lido em fonte oficial; **I** = inferido (o passo está no dossiê).

| Item | Bloco | Resultado | Grau | Onde entra | Dossiê |
|---|---|---|---|---|---|
| P-RET-5 (= P-REINF-4) | 1 | Só os serviços dos arts. 111 e 112 da IN RFB 2.110 sofrem os 11% (lista exaustiva, art. 113); cessão = serviço contínuo com gente à disposição; dispensas do art. 115; Simples: tomador retém, prestador só do Anexo IV. Vira 4 dados do cadastro do fornecedor | V | [[RETENCOES-FONTE]] perfil; [[EFD-REINF]] itens 17–18 | [`fila-2026-10-27-p-ret-5`](../../pesquisas-legais/fila-2026-10-27-p-ret-5/relatorio.md) |
| P-RET-6 | 1 | Código de receita **116201** na DCTFWeb (adicional 114106); o GPS 2631 é do regime antigo | V | RETENCOES item 2 (`INSS` sai de DRAFT) | [`fila-2026-10-27-p-ret-6-8`](../../pesquisas-legais/fila-2026-10-27-p-ret-6-8/relatorio.md) |
| P-RET-8 | 1 | CPRB: **3,5% até 2027-12-31, 11% desde 2028** (Lei 12.546 art. 7º § 6º e 9º-A; SC Cosit 153/2026) | V | RETENCOES item 1 (`INSS/CPRB` sai de DRAFT) | [`fila-2026-10-27-p-ret-6-8`](../../pesquisas-legais/fila-2026-10-27-p-ret-6-8/relatorio.md) |
| P-RET-7 | revisão de 27/10 | Dois pagamentos no mês ao mesmo autônomo: a tabela incide sobre a soma (RIR/2018 art. 677 § 2º) | V | F-RET-17 | [`triagem-2026-10-21-contador-pacote-f1`](../../pesquisas-legais/triagem-2026-10-21-contador-pacote-f1/relatorio.md) [D05] |
| P-REINF-7 | 2 | `classTrib` **01** para Simples dos Anexos III e V; 99 fora do Simples (Tabela 08) | V | Reinf item 4 | [`fila-2026-10-27-bloco2-reinf`](../../pesquisas-legais/fila-2026-10-27-bloco2-reinf/relatorio.md) |
| P-REINF-5 | 2 | O portal web aceita os R-4000; até 100 notas por evento | V | uso do relatório na fase 1 | [`fila-2026-10-27-bloco2-reinf`](../../pesquisas-legais/fila-2026-10-27-bloco2-reinf/relatorio.md) |
| P-REINF-2 | 2 | Mapa de 23 serviços pela Tabela 01 oficial; o contador confirma uma vez | V | aviso `NATUREZA_NAO_CONFERIDA` | [`fila-2026-10-27-bloco2-reinf`](../../pesquisas-legais/fila-2026-10-27-bloco2-reinf/relatorio.md) |
| P-REINF-8 (= P-RET-9) | 2 | Manual (item 11) e FAQ (1.17) mandam o rendimento do trabalho ao eSocial; vira confirmação (resta a ambiguidade da natureza 10002) | V | F-RET-17, F-REINF-9 | [`fila-2026-10-27-bloco2-reinf`](../../pesquisas-legais/fila-2026-10-27-bloco2-reinf/relatorio.md) |
| P-EF-6 | 3 | SP: cosméticos (NCM 3303–3305) fora da ICMS-ST desde 01/04/2026 (Portaria SRE 94/2025; RC 33677/2026); outras UFs quando houver cliente | V | EF item 11 (o #930 já segue) | [`fila-2026-10-27-bloco3-eficiencia`](../../pesquisas-legais/fila-2026-10-27-bloco3-eficiencia/relatorio.md) |
| P-EF-8 | 3 | SUP de SP em 2026: R$ 2.413,62 por profissional por mês até 5 (faixas no BRIEF); salão (6.01, 6.02) fora; clínica pode entrar | V | EF item 28 (linha SP sai de DRAFT) | [`fila-2026-10-27-bloco3-eficiencia`](../../pesquisas-legais/fila-2026-10-27-bloco3-eficiencia/relatorio.md) |
| P-EF-11 | 3 | Esteticista é profissão regulamentada (Lei 13.643): fora dos 16%. Cabeleireiro (Lei 12.592, "reconhecido") ambíguo: leitura segura 32%, até R$ 2.880/ano | V (lei) / ambiguidade | EF item 30 | [`fila-2026-10-27-bloco3-eficiencia`](../../pesquisas-legais/fila-2026-10-27-bloco3-eficiencia/relatorio.md) |
| P-EF-12 | 3 | "Valor de mercado" nos arts. 14 e 16 do Regulamento da CBS: comparável = venda avulsa do item nos 3 meses anteriores; desconto na nota sai da base | V | antes de ligar o CARGA | [`fila-2026-10-27-bloco3-eficiencia`](../../pesquisas-legais/fila-2026-10-27-bloco3-eficiencia/relatorio.md) |
| Natureza e DARF (DRAFT de 21/10) | 4 | DARF 1708, 5952 e 8045 conferem; naturezas 13003, 13007 e 15001 do contador estão erradas; a carga do PR-1 já é a oficial | V | nada a mudar | [`fila-2026-10-27-bloco4-draft`](../../pesquisas-legais/fila-2026-10-27-bloco4-draft/relatorio.md) |
| Uso e consumo pessoal (LC 214 art. 57) | 4 | Por NCM só o inciso I "a"–"e" (6 categorias); as alíneas "f" (salão e clínica, § 3º III) e "g" (LC 227/2026) não entram; o inciso II pede marca por item | V (lei) / I (NCM por categoria) | [[IBS-CBS-2027]] item 15 | [`fila-2026-10-27-bloco4-draft`](../../pesquisas-legais/fila-2026-10-27-bloco4-draft/relatorio.md) |
| P-IBS-4 | 4 | Leiaute 12 da ECF sem conta de IBS/CBS; fica `2.01.01.09.28` até a tabela de 2027 | V | IBS item 12 | [`fila-2026-10-27-bloco4-draft`](../../pesquisas-legais/fila-2026-10-27-bloco4-draft/relatorio.md) |
| COD_PB_RFB do M010 | 4 | O código em `main` (1071 devedor, 2210 credor) bate com a PARTEB_PARTEA; a proposta D-1 "só 2210" ficou velha | V (pares) / I (sentido 1xxx/2xxx) | [[D1]]; X8 | [`fila-2026-10-27-bloco4-draft`](../../pesquisas-legais/fila-2026-10-27-bloco4-draft/relatorio.md) |
| cClassTrib | 5 | **000001**/CST 000 para o salão; **200029**/CST 200, −60%, para serviço médico do Anexo III (tabela do SVRS, carga de 05/10/2026; IT v1.70 igual) | V | [[D1f]]; IBS item 3 | [`fila-2026-10-27-bloco5-cclasstrib`](../../pesquisas-legais/fila-2026-10-27-bloco5-cclasstrib/relatorio.md) |
| PSC + e-CNPJ | 6 | API e SLA iguais por norma (DOC-ICP-17.01 v3.0); diferem preço e cota: DigitalSign "sem limite" R$ 180, Valid 6.000/ano, Certisign R$ 324,40, Serpro fora | V | [[D5]]; NFC-e EMENDA-2 §4.1 | [`fila-2026-10-27-bloco6-terceiros`](../../pesquisas-legais/fila-2026-10-27-bloco6-terceiros/relatorio.md) |
| F6 Payouts | 6 | Debita só a conta de quem integra; a chave Ed25519 vai ao time de Integrações do MP; nada em nome de terceiro | V | [[F6]] | [`fila-2026-10-27-bloco6-terceiros`](../../pesquisas-legais/fila-2026-10-27-bloco6-terceiros/relatorio.md) |

## 2. Ao contador (o dono envia)

- **Perguntas:** P-REINF-3 (o Simples que retém só IRRF declara R-4020?) e P-REINF-6 (dividendo até R$ 50 mil no mês: só o bruto
  na 12001 ou em `rendIsento`?).
- **Confirmações de sim ou não:** o mapa de 23 naturezas da P-REINF-2; a P-REINF-8 (*"Autônomo PF que já entra no eSocial
  (S-1200/S-1210): confirmamos que não vai R-4010?"*).
- Fora deste pacote, para quando valer: a lista de NCM do art. 57 (efeito só em 2027) e o 16% de salão só de cabeleireiro (só com
  cliente real no Presumido com receita até R$ 120 mil).

## 3. Decisões que voltam ao dono

1. **F6:** reabrir pelo ramo (i), o cliente como integrador do Payouts (BYOK, F-PP-1 b), ou (ii), Pix pela API do banco do
   cliente (D6). É a autorização além de "só ADR" que o §6.2 item 2 do `ADR-INCR-PAYMENT-PROVIDER-COLLECTION` pede.
2. **D5:** pedir cotação a DigitalSign, Certisign e Safeweb; quem contrata o PSC.
3. **P-RET-4:** estender a delegação D-1 ([[D-2026-10-10-TRIAGEM-CONTADOR-DELEGACAO]]) ao referencial das folhas de retenção
   (o agente propõe, o contador revisa sem travar) ou perguntar ao contador.
4. **Emenda do IBS PR-3 (já em `main`, #833):** quem marca o item "fornecido a sócio, empregado ou parente" (campo por item na
   importação × regra por conta). Desenho de produto; entra como emenda do PR-3.

## 4. PRs de dado que a pesquisa destrava (cada um com `executa` próprio)

- RETENCOES-FONTE: `RETENCAO_CODIGO` `INSS` → `116201`; `RETENCAO` `INSS/CPRB` → 350 bp até 2027-12-31 e 1100 bp desde 2028-01-01.
- EFICIENCIA-FISCAL: linha SP da `ISS_FIXO_SUP` com os valores de 2026; `ICMS_ST_NCM_UF` sem SP desde 2026-04-01 (o #930 já faz).
- IBS-CBS-2027: carga de `IBS_CBS_USO_CONSUMO` em `DRAFT` com as 6 categorias por NCM (a tabela nasceu vazia no PR-3, já em `main`).

## 5. Lacunas (não lidas ou não achadas)

- Retenções: mínimo do documento de arrecadação do art. 115 I na DCTFWeb; teto do salário de contribuição de 2026; IN RFB
  2.053/2021 arts. 2º-A e 11; texto integral da SC Cosit 153/2026.
- Reinf: notas técnicas 1 a 3 de 2026 para a Tabela 08; grupo 20 da Tabela 01.
- Eficiência fiscal: RICMS das outras 26 UFs; Regulamento do IBS (Resolução CGIBS 6/2026); ato conjunto do art. 14 § 7º; origem
  dos códigos "uso restrito" da SUP.
- IBS/CBS: ato conjunto do art. 63 § 2º V do Regulamento; sentido 1xxx/2xxx da PARTEB_PADRAO; indOp 030101.
- Terceiros: preço e cota de Safeweb, Soluti PJ, SyngularID e ACDIGITAL; `lifetime` da `signature_session` de cada PSC;
  referência de API do Payouts; se o MP aceitaria a aplicação do Luminaris operando com token OAuth do cliente (só o time de
  Integrações responde).

## 6. Dossiês

- [`fila-2026-10-27-p-ret-5`](../../pesquisas-legais/fila-2026-10-27-p-ret-5/relatorio.md)
- [`fila-2026-10-27-p-ret-6-8`](../../pesquisas-legais/fila-2026-10-27-p-ret-6-8/relatorio.md)
- [`fila-2026-10-27-bloco2-reinf`](../../pesquisas-legais/fila-2026-10-27-bloco2-reinf/relatorio.md)
- [`fila-2026-10-27-bloco3-eficiencia`](../../pesquisas-legais/fila-2026-10-27-bloco3-eficiencia/relatorio.md)
- [`fila-2026-10-27-bloco4-draft`](../../pesquisas-legais/fila-2026-10-27-bloco4-draft/relatorio.md)
- [`fila-2026-10-27-bloco5-cclasstrib`](../../pesquisas-legais/fila-2026-10-27-bloco5-cclasstrib/relatorio.md)
- [`fila-2026-10-27-bloco6-terceiros`](../../pesquisas-legais/fila-2026-10-27-bloco6-terceiros/relatorio.md)
