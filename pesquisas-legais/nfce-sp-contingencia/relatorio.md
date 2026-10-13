# Relatório de pesquisa legal — nfce-sp-contingencia

**Pergunta:** L-NFCE-2: que contingência SP admite para NFC-e, e pode vender e emitir depois quando a SEFAZ cai?
**Aberto em:** 2026-10-13T00:55:34-03:00 · **Atualizado em:** 2026-10-13T00:59:51-03:00
**Método:** somente fontes oficiais; documentos baixados e com hash para referência.

<!-- ANALISE -->
## 1. Conclusão
**Vender e emitir a NFC-e depois, sem contingência, não é admitido.** Com problema técnico na transmissão ou na
resposta, o contribuinte "deverá operar em contingência" [D02] art. 6º, que remete à cláusula 11ª do Ajuste SINIEF
19/16 [D01]. Em SP, a contingência é a **off-line** (`tpEmis=9`, cl. 11ª I), admitida desde 10/07/2024 [D03] item 7;
[D05] FAQ #32 e #33. O **EPEC** (cl. 11ª III) só vale quando a própria SEFAZ-SP o ativa, com o ambiente normal fora do
ar [D03] item 7. Para o F-NFCE-E1-5, a resposta legal é **(b) off-line obrigatória**. A opção (a), "nenhuma
contingência", fica fora da lei, e a (c), EPEC, é só um ramo que a SEFAZ ativa.

Regras da off-line que entram no checklist:
- a NFC-e se considera emitida na impressão do DANFE em contingência, sob condição resolutória de autorização
  [D01] cl. 11ª §1º IV "a";
- a transmissão vai **até o 1º dia útil seguinte** à emissão [D01] §1º II "a";
- se a nota for rejeitada, gera-se de novo com o mesmo número e série, sem mudar o que define o imposto
  [D01] §1º III;
- é vedado reusar em contingência um número já transmitido como "Normal" e vedado inutilizar número emitido em
  contingência [D01] §2º;
- uma via fica à disposição do Fisco até a autorização [D01] §3º, ou, em vez dela, guarda eletrônica do XML com
  capacidade de imprimir o DANFE quando o Fisco pedir [D03] item II da ementa;
- o motivo e a data/hora de entrada em contingência vão no arquivo [D01] §1º I "a".

## 2. Fundamentação
| Ponto | Norma (art.) | Fonte | Trecho literal |
|---|---|---|---|
| Dever de operar em contingência | Portaria SRE 40/2024 art. 6º | [D02] | "o contribuinte deverá operar em contingência, nos termos da cláusula décima primeira do Ajuste SINIEF 19/16" |
| Modalidades | Ajuste SINIEF 19/16 cl. 11ª I e III | [D01] | "efetuar geração prévia do documento fiscal eletrônico em contingência e autorização posterior" |
| Prazo off-line | cl. 11ª §1º II "a" | [D01] | "até o primeiro dia útil subsequente contado a partir de sua emissão" |
| SP: off-line desde 10/07/2024; EPEC só quando ativado | RC 34105/2026 item 7 | [D03] | "a contingência off-line pode ser utilizada no Estado de São Paulo desde 10/07/2024" |
| Guarda eletrônica no lugar da 2ª via | RC 34105/2026 ementa II | [D03] | "poderá optar pela guarda eletrônica, em local seguro, do respectivo arquivo XML" |

## 3. Vigência conferida
- O texto do Ajuste no CONFAZ é o compilado, com as redações "sem efeitos" marcadas. A cl. 11ª §1º I "c" está
  revogada pelo Ajuste SINIEF 13/19 (efeitos a partir de 01.09.20) [D01]. A Portaria SRE 40/2024 foi alterada pela
  SRE 81/25 só no § do produtor rural [D02]. A RC 34105/2026 é de 2026 [D03].
- O detalhe técnico (QR v3 assinado em contingência, `tpEmis=9`) está no MOC, Anexo IV, que não foi baixado.

## 4. Ambiguidades
- A RC vincula só o consulente. A conclusão, porém, se apoia na norma ([D01], [D02]); a RC serve apenas para o fato
  "SP desde 10/07/2024", e a FAQ oficial [D05] confirma esse fato.

## 5. Lacunas
- MOC 7.0 Anexo IV (padrões técnicos da off-line) não baixado; é insumo do PR-9, não muda a conclusão.
<!-- /ANALISE -->

## Fontes oficiais consultadas
- **[D01]** AJUSTE SINIEF 19/16 — Conselho Nacional de Política Fazendária CONFAZ — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://www.confaz.fazenda.gov.br/legislacao/ajustes/2016/AJ_019_16>  
  Baixado em 2026-10-13T00:55:56-03:00 · arquivo local `docs/D01_AJ_019_16.html` · SHA-256 `261b396db284911964a380fa554809892ec5f6f753467f6129b70e1bb0a46e8c`
- **[D02]** Portaria SRE 40 de 2024 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/Portaria-SRE-40-de-2024.aspx>  
  Baixado em 2026-10-13T00:55:56-03:00 · arquivo local `docs/D02_Portaria-SRE-40-de-2024-aspx.html` · SHA-256 `f8fe967390131cb88e6381c62534319e9df4f8a10aee2a746f7913a5c56fe977`
- **[D03]** RC 34105/2026 — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://legislacao.fazenda.sp.gov.br/Paginas/RC34105_2026.aspx>  
  Baixado em 2026-10-13T00:55:57-03:00 · arquivo local `docs/D03_RC34105_2026-aspx.html` · SHA-256 `cd736d059300dd084db932848340a1bdfd16ed14c6b23ad828dac007a37dc846`
- **[D04]** Páginas
	- 
	Sobre a Nota Fiscal de Consumidor Eletrônica — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://portal.fazenda.sp.gov.br/servicos/nfce>  
  Baixado em 2026-10-13T00:55:57-03:00 · arquivo local `docs/D04_nfce.html` · SHA-256 `e490e4663f719bde9086a4fcbbdd4acb529c705083d42104cfa5a6f8606c3ef0`
- **[D05]** D05_items — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <https://portal.fazenda.sp.gov.br/servicos/nfce/_api/web/lists/getByTitle('Perguntas%20Frequentes')/items?$select=Id,Title,Resposta,Assunto&$top=1000>  
  Baixado em 2026-10-13T00:57:08-03:00 · arquivo local `docs/D05_items.html` · SHA-256 `99248860606a9966ed3f5181888a0070bbc42031a232837497ab6f0519271e58`

## Registro de buscas
_Nenhuma busca registrada._
