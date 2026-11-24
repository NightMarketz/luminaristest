# Publicações do Simulador Tributário do Salão (artifact 4T2JYWqnJXm9e6p2aUfDLu)

O arquivo `simulador-tributario-salao.html` desta pasta é a fonte da publicação. A versão no ar tem de ter os mesmos bytes;
o `.gitattributes` (`*.html -text`) impede o Windows de trocar o fim de linha. Quem publicar acrescenta uma linha aqui, no
mesmo PR em que o arquivo muda. Conferência: `sha256sum simulador-tributario-salao.html` = sha da última linha.

**A página está congelada desde a v50** (F-SIM-8, `D-2026-11-21-SIMULACAO-COMPLETA-PRE-ADR`): a conta nova vai para o motor
do produto (nó SIMULACAO-CENARIO). Exceção (dono, chat, 24/11, F-G1 = "(b) Fix the calculation"): a página descongela só para os quatro defeitos de
conta do item 20 de `../../simulador-salao-pendencias/BRIEF-GRUPO-LACUNAS-2026-11-24.md` e congela de novo depois do 20d.

**A página está congelada de novo desde a v52** (F-SIM-8): o item 20 fechou com a v52 (20c e 20d). Não publique outra versão; a
conta nova, inclusive os casos t20, t20c e t20d, vai para o motor do produto (nó SIMULACAO-CENARIO, BRIEF de grupo item 19).

| Data | Versão | SHA-256 | Bytes | Base + patches | Testes |
|---|---|---|---|---|---|
| 21/11/2026 | 1795282000-2388 (v48) | 4092130a8efc9a9bffd4cd2a153e142b15a99f9e79e7d5b20ec2b265df5e7520 | 313.493 | 1795280641-a69d + p10a..p10e (cópia: `simulador-salao-pendencias/simulador-v48.html`) | tm-meses 311/0, pg-meses 960/0 |
| 24/11/2026 | 1795492403-d85a (v49) | a3fc8eedd659895f959f285f8523d181d950ceec0a5a56fbe58d0a4c2b74a19a | 316.559 | v48 + p11 + p12 | tm-meses 311/0 (saída igual à v48); pg-meses 960/0 e tx-p11 24/0 (com 375 px) rodados sobre v48 + p11; sobre o arquivo final, tx-p11 16/0 |
| 24/11/2026 | 1795493421-5d04 (v50) | fbfc2d56d945f90d12a796bced7aee1d4d1550796e660637c67898eb270505b0 | 317.283 | v49 + p13 | no arquivo final: tm-meses 311/0 (saída igual à v48), pg-meses 960/0, tx-p11 32/0 com 375 px (v48: 17 falhas); CALC igual ao da v49 |
| 24/11/2026 | 1795494878-cb86 (v51) | 3d7f881d58a1661c49a028cd6420215d0b0dc043c979dfaf85faffcf8a641e17 | 319.054 | v50 + p14 (ICMS do impedido, 38c0) + p15 (crédito de 2027, 967b) | no arquivo final: tm-meses 311/0 (saída igual à v50), pg-meses 960/0, tx-p11 32/0 com 375 px, t20-item20 161/0 (na v50: 117 falhas) |
| 24/11/2026 | 1795498199-9d9c (v52) | 98c6bd0996b24c3f88b0d598d5bed3d951c5d3dc535d846cc044a7b66a98f00a | 328.568 | v51 + p16 (DIFAL do Presumido e do Real pelo RICMS/SP art. 117, leitura (a) do dossiê, 368c) + p17 (exemplo com insumo e pró-labore de fonte, campos sem padrão com aviso e resultado em faixa, 60ca). **Última versão: a página congela de novo (F-SIM-8)** | no arquivo final: tm-meses 311/0 (PR e RE mudam pelo DIFAL do RPA; S igual à v51), pg-meses 960/0, tx-p11 32/0 com 375 px, t20-item20 161/0, t20c-difal 97/0 (na v51: 27 falhas), t20d-exemplo 34/0 (na v51: 13 falhas) |
