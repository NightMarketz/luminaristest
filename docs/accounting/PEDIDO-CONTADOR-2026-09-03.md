# PACOTE DO PEDIDO AO CONTADOR — 2026-09-03 — pronto para o dono enviar

> **O que este doc é:** o rascunho do pedido ao contador, montado pelo `luminaris-contador-liaison`
> a partir das decisões do dono de 2026-09-03 ([cédula de módulos](CEDULA-DECISAO-2026-09-03-modulos.md)
> F-M2/F-M5 e [cédula de integração](CEDULA-DECISAO-2026-09-03-integracao.md) E9/E10).
> **Quem envia é o dono** (CTD-001). Resposta do contador **não é sign-off** — cada item vira artefato
> checável no trilho próprio (CTD-002). Nada com CNPJ/nome real entra no repositório (CTD-003).
>
> **Ancoragem na fila (CTD-004):** o arquivo RFB "PJ em Geral" **NÃO está no pedido** (baixado
> direto em 2026-08-31, `RUNBOOK-X2`). Validação profissional de BP/DRE/ECD/ECF **NÃO está no pedido**
> — entra só quando o H1 (PVA) chegar lá.

---

## Texto do pedido (copiar e enviar)

> Olá, [nome]. Estamos fechando o módulo fiscal do sistema para operar empresa no **Lucro Real** e
> preciso de três coisas suas (duas, se eu conseguir a nota fiscal por outro caminho). Nenhuma é urgente para hoje, mas as duas primeiras travam o desenho
> do módulo, então quanto antes melhor.
>
> **1. Lista de obrigações de uma empresa no Lucro Real (serviços + revenda de produtos, porte
> pequeno).** Preciso da relação do que ela entrega e paga, por periodicidade, na sua prática atual:
> apurações mensais/trimestrais (IRPJ e CSLL — estimativa mensal ou trimestral?; PIS e COFINS
> não-cumulativos; ISS; ICMS se houver revenda), e as declarações/escriturações acessórias
> (EFD-Contribuições, DCTFWeb, EFD ICMS/IPI, e o que mais couber). Para cada uma: nome, periodicidade,
> qual programa/validador da Receita ela usa (PVA, e-CAC, etc.) e se você a gera a partir de arquivo
> que o sistema do cliente exporta ou lança à mão no portal. Se tiver um checklist que já usa com
> clientes de Lucro Real, ele serve. Inclua também o que a reforma do consumo já exige em 2026:
> destaque de IBS/CBS nos documentos, classificação tributária dos produtos (`cClassTrib`) e a DeRE,
> com as fases que você conhece. E, como a empresa vai ter imobilizado (cadeiras, equipamentos,
> ar-condicionado), a **tabela de taxas de depreciação** que você pratica para esse tipo de bem.
>
> **2. Custo de mercadoria comprada com nota fiscal, no Lucro Real — posição de risco, não regra.**
> Já sei o que o fisco diz: ICMS próprio recuperável sai do custo; ICMS-ST não gera crédito de
> PIS/COFINS (STJ, repetitivo); e a IN 2.121/2022 tira o IPI da base do crédito, com decisões
> judiciais em sentido contrário. O que preciso de você é **a posição que você adota** para os seus
> clientes de Lucro Real: (a) a empresa é contribuinte de ICMS e a saída é tributada, ou seja, o ICMS
> da compra vira crédito mesmo? (b) sobre o IPI na base do crédito de PIS/COFINS, você segue a IN ou
> contesta? (c) para fornecedor do Simples, como você trata o crédito de ICMS e de PIS/COFINS? É
> escolha de exposição sua com o advogado, e o sistema vai refletir a que você indicar.
>
> **3. Uma nota fiscal eletrônica de compra e uma de venda, em XML, anonimizadas.** É o arquivo XML da
> NF-e modelo 55 (não o PDF/DANFE), **obrigatoriamente autorizada depois de 03/08/2026**, já com os
> grupos de IBS/CBS. Pode ser de qualquer cliente seu, desde que a anonimização siga estas regras,
> senão o arquivo deixa de ser uma NF-e válida: (a) troque **CNPJ, CPF, nomes, endereços e inscrição
> estadual** por valores fictícios **com dígito verificador correto**; (b) como a chave de 44 dígitos
> embute o CNPJ do emitente, **reconstrua a chave** com o CNPJ fictício e **recalcule o dígito final**
> (`cDV`), mantendo `@Id` e `chNFe` iguais; (c) **não apague** a tag `<Signature>` — substitua o
> conteúdo por um bloco de assinatura fictício mas bem-formado. O resto fica como está: valores,
> quantidades, CFOP, situação (`cStat`), impostos por item. Uma com mais de um item ajuda mais.
> *Se for mais fácil, uma NF-e de compra da própria empresa serve igual — o destinatário tem direito ao
> XML.*
>
> ~~4. Manual da ECF~~ *(retirado em 2026-09-03: o PDF vigente, de 20/05/2026, tem link direto no
> índice oficial do SPED — não precisa do contador. Item 3 também pode sair se o dono usar o XML de
> compra da própria empresa, que é o caminho preferido: precisa ser nota de agosto/setembro de 2026.)*
>
> Obrigado!

---

## Itens pedidos — visão interna (não vai no texto)

| # | Item | Formato exigido | Anonimização | Critério de aceite NOSSO | Trilho quando chegar |
|---|---|---|---|---|---|
| 1 | Lista de obrigações do Lucro Real | Texto/checklist, por obrigação: nome · periodicidade · validador · origem (arquivo × portal) | n/a | Cada obrigação nomeada vira **linha ⚫ ou ⏳ no master map §5** com validador identificado. Sem validador nomeado, a linha não abre ADR | **dado** → insumo dos ADRs `ADR-INCR-TAX-ASSESSMENT`, `ADR-INCR-EFD-CONTRIBUICOES`, `ADR-INCR-DCTFWEB` (cédula de módulos §E, fiscal) |
| 2 | Regra de custo D3 por tributo no Lucro Real | Tabela tributo → "compõe custo" / "vira crédito" | n/a | Regra por tributo, sem "depende" sem condição nomeada. Vira **flag de regime** no `lib/nfe.ts` (ADR-INCR-NFE §D3 já exige guarda de regime antes de reusar a fórmula fora do molde salão) | **crítica** → emenda ADR-INCR-NFE §D3 + fork de implementação (recuperabilidade por tenant); fecha o E10 |
| 3 | 2 XML NF-e 4.00 (compra + venda), **autorizadas ≥ 03/08/2026** (grupos IBS/CBS — senão testa o formato que está saindo de circulação) | XML, modelo 55, `cStat` 100 preferível | CNPJ/CPF/xNome/endereço/IE trocados **com DV válido**; **chave reconstruída** com o CNPJ fictício e `cDV` recalculado (`@Id` = `NFe`+`chNFe`); `<Signature>` **substituída por bloco sintético bem-formado**, não zerada; **preservar** `vProd`/`vDesc`/`vFrete`/`vIPI`/`vST`/`vNF`, `qCom`, `cStat`, impostos por item. *(Corrigido 2026-09-03 — [triagem simulada §B.2](TRIAGEM-CONTADOR-2026-09-03-SIMULACAO.md); a versão anterior mandava zerar a assinatura e não falava em `cDV`.)* | `nfe-fixture-provenance.test.ts` volta de `it.todo` a `it` e passa; `nfe.test.ts` verde contra o real **incluindo a asserção nova chave×CNPJ×`cDV`** (T4 da triagem); **se vier PII real, não commitar** (CTD-003), devolver o passo. **Alternativa sem contador:** XML de compra da própria empresa ou fixture open source com proveniência por commit | **dado** → item **E9** do Bloco A (trocar fixture sintético); fecha a dívida F-I2 |
| 4 | Manual ECF Leiaute 12 (PDF) | PDF do Anexo ao ADE Cofis 2/2026 | n/a | Carimbo de "Atualização" no PDF confere com **20/05/2026** (vigente no [índice oficial](http://sped.rfb.gov.br/pasta/show/1644), verificado 2026-09-03; a pendência anterior dizia 23/07 por fonte secundária — corrigida); seções L/M/N legíveis | **dado** → destrava Forks 2/3/4 da ECF Fase 3 (BRIEF `BE-INCR-SPED-ECF-FASE3`) |
| 1b | Complemento ao item 1: destaque IBS/CBS, `cClassTrib`, DeRE | idem item 1 | n/a | Mesmo critério do item 1: obrigação nomeada → linha no §5 com validador. Ato Conjunto RFB/CGIBS nº 4/2026 já localizado ([PDF](https://cgibs.gov.br/upload/arquivos/202607/31091735-20260730-16h30-ato-conjunto-rfb-cgibs-na-c2-ba-4-260731-090909.pdf)) | **dado** → linha "Reforma tributária IBS/CBS" do master map §5 |

**O que NÃO estamos pedindo (para o dono não re-pedir):**
- Arquivo RFB "PJ em Geral" — já baixado (`RUNBOOK-X2`).
- Validação profissional de BP/DRE/ECD/ECF — só depois do H1 (PVA) rodar.
- Alíquotas municipais de ISS por cidade — só quando o 1º cliente real tiver município definido.
- Opinião sobre o Simples Nacional — regime-alvo é Lucro Real (ratificado 2026-09-02); DAS fica fora
  até segunda ordem.

**Quando a resposta chegar:** me chame com **"triagem do que o contador mandou"**. Cada item entra na
classificação dado / crítica / confirmação / fora do pedido, com trilho e executor nomeados.
