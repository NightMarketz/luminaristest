# Relatório de pesquisa legal — vigilancia-2026-10-31-ecf-csll-ressegur

**Pergunta:** Saiu ADE Cofis com leiaute novo da ECF (13) e código IND_ALIQ_CSLL para CSLL de 9% de resseguradora (Lei 15.525/2026)? Mudou algo desde 17/10/2026?
**Aberto em:** 2026-10-31T12:14:34-03:00 · **Atualizado em:** 2026-10-31T12:47:29-03:00
**Método:** acervo ctresb/leis como fonte primária (texto convertido de fonte oficial); fonte oficial
conferida quando há evidência de texto mais novo. Documentos salvos com hash para referência.

<!-- ANALISE -->
## 1. Conclusão

**Nada mudou desde a leitura de 17/10. Não saiu ADE Cofis com leiaute novo da ECF, nem código `IND_ALIQ_CSLL` para a
CSLL de 9% de resseguradora.** O gatilho do [[CSLL-RESSEGURADORES]] continua fechado.

- Página "Manuais" da ECF no SPED: o mais recente é o **Leiaute 12** (tabelas de 28/05/2026; manual de 20/05/2026, "Anexo
  ao ADE Cofis nº 2/2026") [D01]. O arquivo baixado hoje tem o **mesmo SHA-256** (`d63a09d5…`) do [D21] do dossiê
  `verif-2026-10-17-irpj-csll`: a página não mudou nada em duas semanas.
- SIJUT, ADE de 2026 com o termo "ECF": 11 itens, um só da Cofis — o **ADE Cofis 2, de 29/01/2026** ("Manual de Orientação
  do Leiaute 12"); os outros 10 são agendas tributárias da Corat [D04].
- A Lei 15.525/2026 (CSLL de 9% para resseguradora local) já foi lida na fonte oficial em 17/10: efeitos em **01/01/2027**.

**Recalibração do gatilho (inferida):** o Leiaute 12 cobre o ano-calendário 2025 e "situações especiais do ano-calendário
2026" [D01], e saiu em 29/01/2026 [D04]. Pelo mesmo padrão, o Leiaute 13 (AC 2026) deve sair por volta de jan/2027 — e
**não precisa** do código de 9%, porque a alíquota só vale de 01/01/2027. O código deve aparecer no leiaute do AC 2027
(Leiaute 14, previsto para o início de 2028), salvo situação especial de 2027 tratada antes. Somado a "sem cliente
resseguradora" e go-live em 2027, a vigilância pode cair para **uma leitura em fev/2027** (Leiaute 13), sem custo de esperar.

## 2. Fundamentação
| Ponto | Norma / documento | Fonte | Trecho literal |
|---|---|---|---|
| Leiaute mais recente | SPED, Manuais da ECF | [D01] | "Manual de Orientação do Leiaute 12 da ECF - Ano-calendário 2025 e situações especiais do ano-calendário 2026 - Anexo ao ADE Cofis nº 2/2026" |
| Único ADE Cofis de 2026 | SIJUT | [D04] | "Dispõe sobre o Manual de Orientação do Leiaute 12 da Escrituração Contábil Fiscal - ECF." (29/01/2026) |

## 3. Vigência conferida
- Acervo ctresb/leis: não traz ADE Cofis nem a página do SPED; fui à fonte oficial.
- A página "Legislação" do SPED [D02] está **desatualizada** (lista ADE só até o nº 38/2024, sem o ADE 2/2026). Não serve
  como prova de ausência; a prova é o SIJUT [D04] somado à página de Manuais [D01].
- Lei 15.525/2026: conferida no Planalto em 17/10 (dossiê `verif-2026-10-17-irpj-csll`); não relida hoje.

## 4. Ambiguidades
- Nenhuma que peça decisão humana.

## 5. Lacunas
- A previsão de quando sai o leiaute do AC 2027 é **inferida** pelo padrão de publicação (ADE do leiaute em dez/jan do ano
  seguinte), não por calendário oficial.
- Não abri a tabela dinâmica `IND_ALIQ_CSLL` do Leiaute 12 hoje (a ausência do 9% foi registrada em 10/10 e 17/10).
<!-- /ANALISE -->

## Fontes consultadas
- **[D01]** Manuais — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/pasta/show/1644>  
  Baixado em 2026-10-31T12:41:32-03:00 · arquivo local `docs/D01_1644.html` · SHA-256 `d63a09d5e50a2fd7e42bde6d83fd32ed5cf8384b8a6c080529674ebeb6409c31`
- **[D02]** Legislação — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/pastalegislacao/show/442>  
  Baixado em 2026-10-31T12:41:51-03:00 · arquivo local `docs/D02_442.html` · SHA-256 `e8fef4c183ed6abad7108465d7c35c2fe9c5eb6528405c243c6661a3206010c1`
- **[D03]** Downloads — Órgãos federais (Receita, ANPD, INSS, etc.)  
  Link oficial: <http://sped.rfb.gov.br/pasta/show/1287>  
  Baixado em 2026-10-31T12:41:51-03:00 · arquivo local `docs/D03_1287.html` · SHA-256 `e4d2750130bfe32afafbfb43fd1543e3c85ca62e660e4271a6f904e2a004ee9b`
- **[D04]** SIJUT — ADE de 2026 com o termo ECF (busca) — Receita Federal (SIJUT), lido pelo navegador embutido  
  Link oficial: <https://normas.receita.fazenda.gov.br/pesquisa>  
  Baixado em 2026-10-31T13:30:00-03:00 · arquivo local `docs/D04_sijut-ade-2026-ecf-navegador.txt` · SHA-256 `c708bdbb3d9bd439a02915451c768f6b0fb47eaba075a684adf988889fc815d4`

## Registro de buscas
_Nenhuma busca registrada._
