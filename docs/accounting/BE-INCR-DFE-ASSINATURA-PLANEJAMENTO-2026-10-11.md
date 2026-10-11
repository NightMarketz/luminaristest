# F-E8-1 reaberto: PAA de terceiro × assinatura de NF-e/NFC-e do salão. 2026-10-11

> **Sessão:** `sessao-planejamento`. **Sem código.** Saída: este documento. Nenhum fork se ratifica aqui.
>
> **Autorização:** dono, chat, 2026-10-11, questionário (AskUserQuestion), opção "Aceito, reabrir". O texto da opção era:
> *"Faço uma sessão de planejamento para comparar PAAs homologados. Não altera o F-ADN-1 sem você ratificar."* Origem:
> `EMENDAS-BRIEF-2026-10-11.md` §8 (PR #629), F-E8-1 com recomendação (b), "PAA terceiro já homologado".
>
> **Em duas linhas:** fiz a comparação e **nenhum PAA homologado atende o salão**. O Ajuste SINIEF 9/22 limita o uso a
> PF, MEI, TAC, produtor primário e Simples. No Simples e no MEI, só vale para operação feita por **intermediador de
> comércio eletrônico** (cl. 1ª § 2º), e a venda de balcão do salão não é isso. Por isso a metade "NF-e/NFC-e pelo PAA"
> da decisão (a) de 11/10 **não tem caminho para o salão**, e o fork que reabre é outro: como o salão assina NF-e/NFC-e
> sem o Luminaris guardar o certificado (F-E8-1R).

---

## 1. O que a comparação encontrou

| # | Fato | Fonte | Grau |
|---|---|---|---|
| 1 | Quem pode **usar** o PAA: "a pessoa física, o Microempreendedor Individual - MEI, o Transportador Autônomo de Cargas - TAC, o produtor primário e o optante pelo Simples Nacional" (cl. 1ª § 1º) | [Ajuste SINIEF 9/22, compilado CONFAZ](https://www.confaz.fazenda.gov.br/legislacao/ajustes/2022/AJ009_22), redação do Ajuste SINIEF 46/25, efeitos desde 01/02/2026 | **Verificado** (texto lido em 11/10) |
| 2 | "No caso de contribuintes optantes pelo Simples Nacional e MEI, a utilização do provedor … está restrita às operações e prestações realizadas por intermediadores de serviços e negócios de comércio eletrônico" (cl. 1ª § 2º) | idem | **Verificado** |
| 3 | Quem pode **ser** PAA: entidades públicas ou privadas, confederações de categoria e intermediadores de comércio eletrônico, "desde que prestem os serviços … de forma gratuita" (cl. 2ª caput). Requisitos cumulativos do § 1º-A (Ajuste SINIEF 21/26, desde 01/09/2026): CNPJ, **representar categoria ou intermediar operações por plataforma digital**, aptidão a certificado ICP-Brasil e pré-cadastro no portal do PAA | idem | **Verificado** |
| 4 | Credenciados no Ato COTEPE/ICMS 111/22: (1) SEBRAE 00.330.845/0001-45; (2) CNTA 16.707.014/0001-80 (Ato 27/23); (3) Sindicato dos Produtores Rurais de Ibiá 26.042.036/0001-21 (Ato 86/24). Nenhum acréscimo em 2025 ou 2026 na página | [Ato COTEPE/ICMS 111/22](https://www.confaz.fazenda.gov.br/legislacao/atos/2022/ato-cotepe-icms-111-22) | **Verificado** (lido em 11/10) |
| 5 | O ENCAT abriu credenciamento de PAA e cadastro de usuárias no portal SVRS em 10/08/2026 (Ajuste SINIEF 21/2026), para "produtores rurais, transportadores autônomos de carga, MEI e optantes pelo Simples Nacional"; NF-e modelo 55 por PAA em produção na SVRS em 05/10/2026 | [SVRS, notícia 3003](https://dfe-portal.svrs.rs.gov.br/Pes/Noticias/3003) | **Verificado** |
| 6 | Não achei API do emissor SEBRAE para software de terceiro. Só há pergunta sem resposta em fórum | busca de 11/10 | **Não encontrado** (não é "não existe") |

**Leitura (inferido; o passo fica à mostra para discordar):**
- **Salão no Presumido ou Real** (regime-alvo do H1 e do Lucro Real): não está no rol do § 1º, então **não pode usar PAA**.
- **Salão no Simples ou MEI:** está no rol, mas o § 2º restringe o uso ao intermediador de comércio eletrônico. A NFC-e
  e a NF-e do balcão, emitidas pelo próprio estabelecimento, não passam por intermediador, então **não pode usar PAA**.
- **O Luminaris como PAA (F-E8-1 a):** teria de prestar o serviço de graça (cl. 2ª) e se enquadrar no § 1º-A II
  ("representar categoria ou intermediar operações por plataforma digital"). Um ERP não é nenhuma das duas coisas sem
  forçar o texto. E mesmo credenciado, esbarraria no § 2º para o cliente de balcão.
- **Novos PAAs comerciais** credenciados depois de 01/09 (marketplaces, plataformas) não mudam o resultado: a trava está
  em quem usa (§§ 1º e 2º), não em quem provê.

**Caso adversarial tentado:** "o § 2º só restringe o *provedor intermediador*, não o uso por qualquer PAA". O texto lido
começa com "No caso de contribuintes optantes pelo Simples Nacional e MEI, a utilização do provedor…", então o sujeito
é o contribuinte e a restrição é sobre o uso dele. A leitura adversarial não se sustenta na letra. A palavra final
continua com o advogado e a SEFAZ-SP (pendência 1).

## 2. Efeito nos documentos de 11/10

- A **decisão (a)** de 11/10, "PAA + PSC nuvem", tem duas metades. A do **PSC para NFS-e** fica de pé (DOC-ICP-04 v8.3
  6.1.1.8; pesquisa F-2 de 10/10). A do **PAA para NF-e/NFC-e** fica **sem caminho para o salão**, pelo §1. A decisão é
  do dono, e este documento não a altera. Ele leva o dado ao dono pelo F-E8-1R.
- O **F-E8-1** da §8 (PAA próprio × PAA de terceiro) perde o objeto pelos dois lados. Fica **superado se o dono aceitar o
  §1**.
- A **E8-3** da §8 (o X10a usa PAA no lugar do `SefazNfeEmissor` com certificado) não deve ir para "executa" enquanto o
  F-E8-1R estiver aberto.
- O **F-ADN-1** continua como a §8 deixou: superado para a NFS-e, porque o PSC não guarda o certificado no Luminaris.
  Este documento não muda isso.

## 3. Checklist (só vale depois do F-E8-1R ratificado)

1. **[cond: F-E8-1R]** Emenda do ADR-DFE §12: o caminho de assinatura de NF-e/NFC-e do salão é o escolhido no F-E8-1R,
   com a fonte da §1 deste documento. O PAA fica registrado como "fora do perfil do salão (cl. 1ª §§ 1º–2º)".
2. **[cond: F-E8-1R (a)]** Uma única porta de assinatura remota para NFS-e, NF-e e NFC-e (contrato na §4), em vez de
   uma porta por DF-e. Teste: o mesmo adaptador fake assina os três tipos de XML e recusa credencial vencida, revogada ou
   de escopo errado com um código próprio.
3. **[cond: F-E8-1R (a)]** A NFC-e assina por venda, então a latência do PSC entra no caminho do caixa. Teste: com
   timeout do assinador, a venda segue e a NFC-e fica em estado pendente, sem duplicar o número. Antes de ter número de
   latência real, este item depende de insumo (§7).
4. **[cond: F-E8-1R (b)]** Volta a escolha de emissor terceiro que guarda o certificado do cliente. Reabre a decisão
   "Focus = referência, não fornecedor" de 07/10, e o checklist sai de um BRIEF próprio de fornecedor.
5. **[direto]** Errata nas `EMENDAS-BRIEF-2026-10-11` §8: a recomendação (b) do F-E8-1 cita "PAA terceiro já
   homologado" sem o perfil de uso. Linha de errata apontando para cá. Exige pedido próprio (sessão de errata).

## 4. Contrato esboçado (para o F-E8-1R a)

```ts
// server/src/features/accounting/dfe/AssinadorRemotoPort.ts (esboço; ao lado de DfeEmissorPort)
export type TipoDfeAssinado = 'NFSE_DPS' | 'NFE' | 'NFCE';

export const CredencialPscSchema = z
  .object({
    pscId: z.string().min(1),                 // entrada da LPSC do ITI (OID/URL do PSC)
    credencialRef: z.string().min(1),         // referência opaca; o segredo fica no PSC ou no cofre, nunca no banco em claro
    titularCnpj: z.string().regex(/^[0-9A-Z]{12}[0-9]{2}$/), // CNPJ alfanumérico (NT 2026.004)
    escopo: z.array(z.enum(['NFSE_DPS', 'NFE', 'NFCE'])).min(1),
    validaAte: z.string().datetime(),
  })
  .strict();

export interface AssinadorRemotoPort {
  readonly name: string;
  assinar(xml: Buffer, tipo: TipoDfeAssinado, credencial: CredencialPsc): Promise<
    | { ok: true; xmlAssinado: Buffer; certificadoSerial: string; assinadoEm: string }
    | { ok: false; code: 'CREDENCIAL_EXPIRADA' | 'CREDENCIAL_REVOGADA' | 'FORA_DO_ESCOPO' | 'PSC_INDISPONIVEL'; message: string }
  >;
}
```

Gates que este contrato aciona quando virar código: snapshot de shape do DTO, um eventType de auditoria por assinatura
(`dfe.signature.remote`) na allowlist do `auditCanonical.ts`, e nenhum campo de segredo na trilha (allowlist PII).

## 5. Forks — todos RATIFICAÇÃO PENDENTE

**F-E8-1R: como o salão assina NF-e/NFC-e, já que o PAA não o alcança.** RATIFICAÇÃO PENDENTE.
- (a) **Certificado em nuvem num PSC**, o mesmo caminho da NFS-e. O cliente contrata o PSC e dá ao Luminaris uma
  credencial de assinatura com escopo (F-E8-2 a), e uma porta só assina os três DF-e. O Luminaris não guarda chave, e a
  decisão 2 de 26/09 continua valendo.
- (b) **Emissor terceiro que guarda o certificado do cliente** (o modelo dos emissores de nota por API). A guarda sai do
  Luminaris e vai para o fornecedor, mas a pergunta da MP 2.200-2 art. 6º p.ú. só muda de dono. Reabre a escolha de
  fornecedor.
- (c) **O Luminaris guarda o certificado (SE-S) do cliente.** Contraria a decisão 2 de 26/09 e o DOC-ICP-04 6.1.1.6 "c"
  e 6.1.1.8 (pesquisa F-1/F-2 de 10/10).

**Recomendação: (a).** É o único caminho regulado pela ICP-Brasil em que ninguém além do PSC custodia a chave (6.1.1.8),
reaproveita o F-E8-2 da NFS-e e deixa uma porta só para os três DF-e. Riscos: a latência do PSC na venda de balcão
(insumo ausente) e a pergunta F-3 sobre selo SE-S como "manifestação de vontade" (Res. CG 211/2024 art. 4º), que vale
para qualquer um dos três caminhos.

**F-E8-3: critério para escolher o PSC (se F-E8-1R = a).** RATIFICAÇÃO PENDENTE.
- (a) O cliente escolhe qualquer PSC da LPSC do ITI, e o Luminaris implementa um adaptador por PSC que tiver cliente.
- (b) O Luminaris homologa um ou dois PSCs (API de assinatura remota com autorização por lote ou escopo, preço por
  assinatura, SLA) e o cliente escolhe entre eles.

**Recomendação: (b)** para o 1º cliente. Menos adaptadores, e o critério do lote ou escopo decide se a NFC-e por venda é
viável. Candidatos só por indício: o diagrama do ecossistema ICP-Brasil do ITI (ago/2022) lista Certisign, Soluti, BRy,
Serasa, Serpro, Valid e Safeweb como PSC. **A LPSC vigente não foi lida**, e preço e API não foram verificados.

## 6. Pendente de validação externa

1. **Advogado + SEFAZ-SP:** confirmar a leitura de que o salão (Simples com venda de balcão; Presumido/Real) não pode usar
   PAA pelo Ajuste SINIEF 9/22 cl. 1ª §§ 1º–2º.
2. **Advogado:** a pergunta F-3 de 10/10 (SE-S assina NF-e/NFC-e/DPS?) continua valendo para os três caminhos do F-E8-1R.
3. **Advogado (já no §10.3):** regresso contra o Luminaris pelo uso da credencial do PSC.

## 7. Insumos ausentes

- A LPSC vigente do ITI (versão textual e XML na AC Raiz): quais PSCs estão credenciados hoje e quais oferecem API de
  assinatura remota.
- Preço por assinatura e latência dos PSCs candidatos, porque decidem a NFC-e por venda.
- A NT 2026.001 v1.02b na íntegra: só importa se o dono quiser o PAA para um futuro cliente MEI de e-commerce, que está
  fora do salão.

## 8. Achados fora de escopo

- A pesquisa de 10/10 (`pesquisa-lei-2026-10-10/parceria-consumidor-a1.md` F-4) registrou o "foco declarado: MEI, produtor
  rural e Simples" como limite em aberto (3). A cl. 1ª § 2º fecha esse limite, e a pesquisa precisa de uma linha de errata.
- O `PERGUNTAS-DE-LEI-2026-10-10.md:449` diz que o PAA "assina NF-e e NFC-e sem guardar o certificado do cliente" sem o
  perfil. Mesma errata.

## Grau

- **Verificado:** §1 itens 1–5, com o texto do CONFAZ e do SVRS lido em 11/10 nesta sessão. O § 2º foi citado literal.
- **Inferido:** o enquadramento do salão no §1 ("Leitura") e os efeitos do §2. O passo está escrito para quem quiser
  discordar.
- **Indício:** os candidatos a PSC do F-E8-3 (diagrama do ITI de 2022).
- **Checagem que teria falhado se eu estivesse errado:** se o § 2º não existisse ou tivesse outro sujeito, a citação
  literal do CONFAZ teria mostrado. Ela mostrou o contribuinte como sujeito.
