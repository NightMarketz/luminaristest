# Lista de espera — texto e formulário (caminho (a): camada contábil ao lado do sistema do salão)

> **Decisão:** dono, chat, 15/10/2026: *"Caminho (a): Luminaris como camada contábil ao lado do sistema de salão.
> Ajusta o texto da lista de espera para isso e inclui a pergunta 'que sistema você usa hoje / usaria junto?'"* —
> registrada em [[D-2026-10-15-CAMINHO-A-CAMADA-CONTABIL]].
> **Base:** comparativo de mercado [`COMPARATIVO-2026-10.md`](COMPARATIVO-2026-10.md) §5.1 e dossiê legal
> `pesquisas-legais/waitlist-lgpd-cdc/relatorio.md` (LGPD arts. 6º III, 7º I, 8º §§4º–5º, 9º I–III; CDC arts. 30 e 37).
> **Estado:** texto pronto para revisão do dono. Não existe página publicada; publicar é decisão e ação do dono.

---

## 1. Texto da página

### Título
**A contabilidade do seu salão, montada a partir do que você já registra.**

### Subtítulo
Continue usando o sistema de agenda que você já tem. O Luminaris transforma vendas, pacotes, recebimentos e despesas
em lançamentos contábeis e deixa o fechamento organizado para o seu contador.

### Como funciona hoje
- Cada venda, pacote e recebimento lançado no Luminaris vira lançamento contábil sozinho, sem digitar de novo.
- Extrato do banco (OFX/CNAB) conferido com o que entrou e saiu.
- Notas fiscais de compra importadas pelo XML.
- Contas a pagar e a receber, fluxo de caixa, DRE e balanço no mesmo lugar.
- Lançamentos e saldos de abertura também entram por planilha.

### O que estamos construindo com os primeiros salões
Puxar as vendas direto do seu sistema de agenda (Trinks, Avec, Belasis e outros), para você não registrar nada duas
vezes. É por isso que perguntamos qual sistema você usa.

### O que o Luminaris não é (ainda)
- **Não é agenda.** Não tem agendamento online, lembrete por WhatsApp nem app para a equipe. Seu sistema atual
  continua cuidando disso.
- **Não emite nota fiscal.** A nota continua saindo pelo portal da prefeitura ou pelo seu sistema atual.
- **Não substitui o seu contador.** Ele recebe o trabalho mais organizado.

### Acesso antecipado
Vamos abrir para poucos salões, em fase de validação. Ainda não há data nem preço definidos; avisamos por e-mail
antes de qualquer cobrança.

---

## 2. Formulário

Cada campo tem uma finalidade declarada (LGPD art. 6º, III — só o necessário). Nenhum campo vem preenchido.

| Campo | Tipo | Obrigatório | Por que pedimos (finalidade) |
|---|---|---|---|
| E-mail | texto | sim | Contato sobre o acesso antecipado |
| Nome do salão | texto | sim | Saber com quem falamos |
| Município | texto | sim | ISS e nota de serviço mudam por município (gate D1f) |
| Regime tributário | MEI · Simples Nacional · Lucro Presumido · Não sei | sim | Define o que a contabilidade precisa gerar (H1 / X14) |
| **Que sistema você usa hoje?** | Trinks · Avec · Belasis · Salão VIP · Outro (qual?) · Planilha · Nenhum | sim | Decide de qual sistema puxar as vendas primeiro |
| **Usaria o Luminaris junto com ele?** | Sim, junto com o que já uso · Só trocaria se tivesse agenda · Não sei | sim | Separa quem quer a camada contábil (caminho a) de quem precisa de recepção (caminho b) |
| Banco principal | texto | não | Leitura do extrato bancário (gate D6) |

### Consentimento (caixa de seleção, desmarcada por padrão)
> Autorizo o [nome do controlador, CNPJ] a usar estes dados **somente** para me contatar sobre o acesso antecipado
> ao Luminaris e para entender que sistema, regime e município os salões interessados usam. Os dados ficam guardados
> por [prazo] e não são repassados a terceiros. Posso sair da lista a qualquer momento, sem custo, respondendo
> "sair" a qualquer e-mail ou escrevendo para [contato].

Ancoragem: finalidade determinada, sem autorização genérica (art. 8º §4º); revogação gratuita e facilitada
(art. 8º §5º); finalidade, forma, duração e controlador informados (art. 9º I–III).

### Mensagem depois do envio
> Recebemos. Vamos falar com poucos salões por vez, a começar pelos que usam o sistema que vamos integrar primeiro.
> Se quiser sair da lista, é só responder "sair".

---

## 3. Travas (não entram no texto, em nenhuma versão)

| Não dizer | Por quê |
|---|---|
| "Sistema de gestão de salão" sem qualificador | Comprador compara com agenda/WhatsApp/app que não temos (comparativo B1–B3); CDC art. 37 §1º, omissão |
| "Emite nota fiscal" | Emissão pausada (X10i/D5) |
| "Contador incluso" | Vetado até a resposta do CRC-SP (GOV-CONTADOR, F-GOV-1) |
| "Importa do Trinks/Avec" como coisa pronta | Não existe; o formato da exportação da Trinks nem foi lido (comparativo §6) |
| "Gera ECD/ECF validada" ou "SPED pronto" | Sem PVA assinado (H1 aberto) |
| Preço, data, comparação com concorrente | CDC art. 30 (oferta vincula); comparativo §5.1 item 4 |

---

## 4. Pendências do dono antes de publicar
1. **Controlador:** nome e CNPJ (ou CPF) que aparecem no consentimento (art. 9º III).
2. **Prazo de guarda** dos dados da lista. A duração precisa ser informada (art. 9º II); o prazo em si não foi
   pesquisado (dossiê, §5 — lacuna).
3. **Contato de saída:** e-mail para o pedido de remoção.
4. **Onde hospedar** a página e o formulário. Nenhuma ferramenta foi escolhida; o app ainda não está no ar (M2).
