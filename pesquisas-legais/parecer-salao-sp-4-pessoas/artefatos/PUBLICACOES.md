# Publicações do Simulador Tributário do Salão (artifact 4T2JYWqnJXm9e6p2aUfDLu)

O arquivo `simulador-tributario-salao.html` desta pasta é a fonte da publicação. A versão no ar tem de ter os mesmos bytes;
o `.gitattributes` (`*.html -text`) impede o Windows de trocar o fim de linha. Quem publicar acrescenta uma linha aqui, no
mesmo PR em que o arquivo muda. Conferência: `sha256sum simulador-tributario-salao.html` = sha da última linha.

**A página está congelada desde a v49** (F-SIM-8, `D-2026-11-21-SIMULACAO-COMPLETA-PRE-ADR`): a conta nova vai para o motor
do produto (nó SIMULACAO-CENARIO). Mudança de texto só com resposta ao fork F-G1 de
`../../simulador-salao-pendencias/BRIEF-GRUPO-LACUNAS-2026-11-24.md`.

| Data | Versão | SHA-256 | Bytes | Base + patches | Testes |
|---|---|---|---|---|---|
| 21/11/2026 | 1795282000-2388 (v48) | 4092130a8efc9a9bffd4cd2a153e142b15a99f9e79e7d5b20ec2b265df5e7520 | 313.493 | 1795280641-a69d + p10a..p10e (cópia: `simulador-salao-pendencias/simulador-v48.html`) | tm-meses 311/0, pg-meses 960/0 |
| 24/11/2026 | 1795492403-d85a (v49) | a3fc8eedd659895f959f285f8523d181d950ceec0a5a56fbe58d0a4c2b74a19a | 316.559 | v48 + p11 + p12 | tm-meses 311/0 (saída igual à v48), pg-meses 960/0, tx-p11 24/0 (v48: 12 falhas) |
