# PEDIDO AO JURÍDICO — forma da informação da validade do pacote (PE-FE-1..3) — 2026-10-05

> Rascunho preparado pelo agente. **O dono envia**; o agente não enviou nada e não responde por ninguém.
> Escopo: **só PE-FE-1..3** do [`FE-INCR-PACOTE-VALIDADE-brief.md`](FE-INCR-PACOTE-VALIDADE-brief.md) §6 (nó
> [[FE-INCR-PACOTE-VALIDADE]]), item 3 de [`PACOTE-VALIDADE-PENDENCIAS-brief.md`](PACOTE-VALIDADE-PENDENCIAS-brief.md). O dossiê
> anterior (PE-6: se a cláusula vale, perda integral, aviso antes de vencer) já foi respondido e triado em
> [`RESPOSTA-JURIDICO-2026-10-04-PACOTE-VALIDADE.md`](RESPOSTA-JURIDICO-2026-10-04-PACOTE-VALIDADE.md).
>
> **Estas três perguntas são sobre a FORMA, não sobre o dado:** o jurídico respondeu que a lei exige informação prévia, ostensiva e
> com destaque, e que cabe ao salão provar que informou. Isto pergunta se o que foi construído cumpre isso. **Não trava o merge nem o
> sign-off** (a decisão de produto é do dono); trava só a confiança jurídica do texto.

---

## Texto para enviar

> Olá, [nome],
>
> Sobre o parecer de 04/10 (validade de pacote pré-pago): o sistema já informa a validade e registra o aceite. Preciso que você
> confira **a forma** — o texto, o tamanho da letra e a prova do aceite — antes de implantar.
>
> **O que o salão faz na venda do pacote:** o atendente vê, em caixa com borda e letra em negrito (peso 600 na tela, 16px), o texto abaixo (a data é
> calculada pelo sistema, e se o último dia cair em feriado nacional ele vai até o dia útil seguinte):
>
> > *VALIDADE DO PACOTE: este pacote vale por 30 dias corridos a contar da data da compra (25/11/2026). Último dia para usar:
> > 26/12/2026. Se o prazo terminar em feriado nacional, ele vai até o dia útil seguinte, e a data acima já considera isso. O saldo
> > não usado até essa data não será devolvido nem trocado por dinheiro.*
>
> Na tela, os botões de salvar a venda só habilitam **depois de marcar** "Li este texto ao cliente e ele concordou". O sistema grava
> quem registrou, quando (relógio do servidor), o texto exato mostrado e um código que prova que o texto não mudou. **Ressalva:** a
> trava é da tela, não do servidor. O aceite é gravado logo depois de criar a venda; se essa gravação falhar (rede, por exemplo), a
> venda fica criada, o sistema avisa e a venda passa a mostrar "Aceite não registrado" com um botão para registrar depois (o
> comprovante dessa venda sai com a marca "ACEITE NÃO REGISTRADO"). Uma venda criada por fora da tela (planilha, API) também não
> passa pela trava. Há também um
> **comprovante em PDF** com o mesmo texto em caixa, em negrito e em corpo 12pt, o registro do aceite e uma linha para a
> **assinatura do cliente** no papel, que o salão guarda.
>
> Perguntas:
>
> 1. **Redação (PE-FE-1).** O texto acima cumpre "informação prévia, ostensiva e com destaque"? A frase *"não será devolvido nem
>    trocado por dinheiro"* está bem posta diante da jurisprudência sobre perda integral (STJ, REsp 1.321.655 e 1.580.278) e do que
>    você nos disse em 04/10? Se precisar mudar palavras, qual redação?
> 2. **Tamanho da letra (PE-FE-2).** O CDC (art. 54, § 3º) fala em fonte "corpo doze". Isso é medida de impresso. Na tela estamos
>    lendo "corpo 12" como 12pt, que equivale a 16px, e usamos 16px em negrito. No PDF usamos 12pt de verdade. **É essa a aplicação
>    certa** na tela e no papel?
> 3. **Prova do aceite (PE-FE-3).** O registro do sistema (atendente marca que leu e o cliente concordou, com data, hora, usuário,
>    texto e código) **mais** a assinatura do cliente no comprovante impresso bastam como "aceite registrado" para o salão provar que
>    informou? Falta algo (por exemplo, o aceite do próprio cliente por um canal digital, que hoje o sistema não tem)?
>
> Obrigado!

---

## Itens pedidos — critério de aceite INTERNO (não vai no texto)

Fonte: [`FE-INCR-PACOTE-VALIDADE-brief.md`](FE-INCR-PACOTE-VALIDADE-brief.md) §4.3 (texto v1), §6 (PE-FE-1..3), F14 (12pt = 16px); código do
PR #530 (`validityNotice.ts`, `packageSaleReceiptHtml.ts`).

| # | Pergunta | Critério de aceite interno | O que a resposta move |
|---|---|---|---|
| PE-FE-1 | Redação do texto v1 | "Cumpre" ou a redação exata a trocar | **trocar** → texto v2 em `validityNotice.ts` (versão nova; o aceite grava a versão e o hash, o que já foi aceito fica como estava) |
| PE-FE-2 | 12pt = 16px na tela | Sim / não / outro tamanho nomeado | **não** → muda o piso do item 16 do BRIEF (`font-size` mínimo da caixa) e a sonda de estilo; o PDF segue em 12pt |
| PE-FE-3 | Checkbox + assinatura bastam | Bastam / falta X nomeado | **falta X** → fork novo ao dono (ex.: aceite do cliente por link/código exige canal de saída, que não existe: BRIEF BE §1 P13) |

Nenhuma resposta aqui reabre o F-JUR-3 (100% para a 3.4) nem o F-PV-11 (sem aviso ativo); se o jurídico divergir deles, é fork ao dono.

## Registro (preencher quando a resposta chegar — não preencher antes)

- Enviado em: ____ · por: ____
- Resposta recebida em: ____ (colar o texto íntegro; a triagem é uma sessão própria, não decide por ninguém)
