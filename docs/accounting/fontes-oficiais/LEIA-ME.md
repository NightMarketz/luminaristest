# Fontes oficiais — corpus local

Baixado em **2026-09-10** por `node scripts/baixar-fontes-oficiais.mjs` (23 documentos,
~29 MB). Inventário completo com bytes e sha256: [`MANIFEST.md`](MANIFEST.md).

**Nada aqui é sign-off.** Norma baixada não fecha gate humano nenhum — o PVA, o contador e
a homologação bancária continuam sendo o oráculo. O corpus só faz uma coisa: torna
verificável, por leitura, o que hoje está escrito nos BRIEFs de memória ou de busca.

## O que fica no git e o que não fica

| Fica | Não fica |
|---|---|
| `MANIFEST.md` (sha256 por arquivo) | PDF, XLSX, ZIP, HTML, JSON |
| `IN-RFB-*.txt` (texto extraído dos atos, diffável) | `IN-RFB-1700-2017-anexos/` |

Reedição silenciosa se detecta assim: `node scripts/baixar-fontes-oficiais.mjs --forcar`
e comparar o `MANIFEST.md`. Hash diferente = documento novo na mesma URL, e o BRIEF que
citava o antigo precisa ser reconferido. Para os atos da RFB o sinal é melhor ainda: o
`.txt` é versionado, então a reedição aparece como **diff de artigo**, não como hash.

## Achados da conferência (li o miolo de cada PDF, não só o cabeçalho HTTP)

1. **CNAB 240 — a capa diz 10.11, o rodapé de todas as 233 páginas diz V10.9.**
   O rodapé é template velho que a FEBRABAN nunca atualizou; a capa traz "Versão 10.11
   31/07/2023" e o §5.2 lista as manutenções da 10.11. O arquivo **é** a 10.11. Quem
   abrir o PDF e ler o rodapé vai achar que baixou a versão errada — não vai.
   Note também que a capa data 31/07/2023 e o nome do arquivo na URL diz 21/08/2023.

2. **O "Manual NFS-e v1.2" tem 6 páginas e não serve para implementar.**
   É um guia de superfície das APIs; o histórico de versões interno registra só
   `1.0 — 17/03/2025` (a v1.2 está no nome do arquivo, não dentro dele). O leiaute e as
   regras de negócio estão no **Anexo I** (`NFSe-ANEXO-I-leiaute-DPS-NFSe-v1.01.xlsx`),
   que o próprio manual cita e que **não estava na lista original** — baixei junto com
   Anexo II (eventos), A (municípios/países), B (lista de serviço nacional) e C
   (INDOP IBS/CBS), mais o pacote `NFSe-ESQUEMAS_XSD-v1.01.zip` com os XSD de DPS,
   NFS-e, evento e pedRegEvento. Esse pacote é o que dá para codar contra.

3. **A página que eu tinha citado para o Guia da EFD-Contribuições era uma notícia de
   2019 sobre a v1.31.** A versão corrente é a **1.35** (`arquivo/download/5836`), e é
   ela que está aqui.

4. **`normas.receita.fazenda.gov.br/sijut2consulta/link.action` não devolve norma.**
   Devolve um shell de redirect de 2,6 KB para um SPA Angular. O texto vem de
   `…/api/consulta-externa/ato/{id}/visao/multivigente` — e o path **sem** `/visao/...`
   responde 403 até dentro do navegador. Os links do tipo `link.action?idAto=` que
   circulam nos BRIEFs abrem no navegador humano e falham em qualquer automação.

5. **A IN 1.700/2017 não traz o Anexo III no corpo do texto** — o anexo é binário
   (`43557-tabela.html`, e a versão pré-retificação em `43237-Anexo .html`). São eles que
   têm a tabela "Referência NCM / Bens / Prazo de vida útil / Taxa anual de depreciação"
   que o módulo de imobilizado precisa. O `.txt` marca o ponto com
   `>> anexo binario: tabela.html`.

## Grau das afirmações

- **Verificado**: os 23 arquivos existem no disco com o sha256 do manifesto; magic byte
  conferido (PDF/ZIP/XLSX); primeira página dos PDFs lida e batida com o título esperado;
  os 5 achados acima vêm de leitura do conteúdo.
- **Não verificado**: não li os manuais de ponta a ponta. Que a ECF Fase 3 do BRIEF
  corresponda ao Leiaute 12 baixado (ADE Cofis 02/2026, mai/2026) **continua aberto** —
  o BRIEF foi escrito contra versão anterior, e essa reconferência é trabalho de leitura,
  não de download.
- **Fora do alcance de qualquer download**: PVA, XML de NF-e real, validação do contador,
  homologação do banco. Ver `docs/operating-manual/ORACLE-DEFICIT.md`.
