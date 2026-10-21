# Relatório de pesquisa legal — irrf-referencial-sped

**Pergunta:** Códigos do plano referencial RFB 2025 (L100A/P100) das folhas novas do IRRF-DISTRIBUICAO
**Aberto em:** 2026-10-21T15:18:42-03:00 · **Atualizado em:** 2026-10-21T15:28:03-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## Conclusão
Os 6 códigos do referencial das folhas novas do plano padrão (IRRF-DISTRIBUICAO item 6) **existem e são analíticos ("A")**
na tabela dinâmica oficial da ECF [D01] (leiaute 12, ano-calendário 2025, publicada em 28/05/2026), com início de validade
01/01/2015. Estão nos planos do Lucro Real (L100A/L300A) e do Presumido (P100A/P150A), com o mesmo código:

| Folha | Código | Nome oficial | Tabelas |
|---|---|---|---|
| 2.1.7.01 Dividendos a pagar | 2.01.01.17.13.10 | Dividendos a Pagar – Circulante - Brasil | L100A, P100A |
| 2.1.7.02 JCP a pagar | 2.01.01.17.12.10 | Juros sobre o Capital Próprio a Pagar - Circulante - Brasil | L100A, P100A |
| 2.1.7.03 IRRF a recolher | 2.01.01.09.01 | IRRF a Recolher – Circulante | L100A, P100A |
| 2.3.2.01 Capital social integralizado | 2.03.01.01.01 | Capital Subscrito de Domiciliados e Residentes no País | L100A, P100A |
| 2.3.3.01 Reserva legal | 2.03.02.03.01 | Reserva Legal | L100A, P100A |
| 4.3.4 Juros sobre o capital próprio | 3.01.01.09.01.04 | (-) Despesas de Juros sobre o Capital Próprio | L300A, P150A |

Os 6 batem com o catálogo do `dev.db` (dossiê `irrf-referencial-2025`). Sem divergência.

## Escolhas PROVISÓRIAS (dono, 2026-10-21)
- O capital social é uma conta única, ligada a 2.03.01.01.01 (residentes). Lacuna conhecida: a subconta 2.3.2.01.02 → 2.03.01.02.01
  quando houver empresa-alvo com sócio estrangeiro / RDE-IED.
- As folhas do plano padrão são mapeadas fora dos kits, em todo escopo (`ensureCanonicalMappings`).
As duas ficam para revisar com usuários e contador depois do app completo (dono: "Isso vai ser revisado após o app estiver
completo").

## Leitura
O arquivo baixado é XLSX (assinatura `PK`), salvo com a extensão `.html` pelo `legal.py`. A leitura foi pelo `openpyxl`,
nas abas L100A, L300A, P100A e P150A.
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** D01_Tabelas_Dinamicas_ECF_Leiaute_12_28_05_2026_AC_2025_SIT_ESP_ — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/estatico/E1/20FDEEE25CAA9F998AC2AD3045DE0E9C631D3C/Tabelas_Dinamicas_ECF_Leiaute_12_28_05_2026_AC_2025_SIT_ESP_2026.xlsx>  
  Baixado em 2026-10-21T15:18:43-03:00 · arquivo local `docs/D01_Tabelas_Dinamicas_ECF_Leiaute_12_28_05_2026_AC_2025_SIT_ESP_.html` · SHA-256 `366b8d9030a04e9f6203b6ae29ace49d3ffa3fa0c1f5a7a18b0c967b9a5a3cac`

## Registro de buscas
_Nenhuma busca registrada._
