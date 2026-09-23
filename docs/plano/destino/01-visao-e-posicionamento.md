---
tipo: "destino"
secao_sdd: "§1"
titulo: "Visão e posicionamento"
---
# §1 Visão e posicionamento

Uma frase: o dono de uma PME brasileira responde uma entrevista de 15 minutos e sai com o sistema do seu setor —
atendimento, vendas, agenda, estoque, financeiro, fiscal, contábil e folha — que ele mesmo opera, que emite a nota,
concilia o banco, paga imposto certo e entrega a escrituração pronta para o contador assinar.

| Eixo | Salesforce SMB | TOTVS Protheus | Luminaris completo |
|---|---|---|---|
| Centro de gravidade | Cliente e pipeline (front-office) | Backoffice fiscal/contábil (back-office) | Os dois, com o razão como espinha e o setor como molde |
| Implantação | Self-service no Starter; consultor a partir do Pro | Projeto com parceiro, semanas a meses | Gerada por IA na entrevista; *time-to-first-ECD* como métrica |
| Customização | Objetos/campos + Flow Builder | Parâmetros + ADVPL/TL++ (código) | Presets + campos no motor DynamicTable; lógica financeira só por binding validado |
| Brasil fiscal | Ausente (via AppExchange) | Nativo e profundo | Nativo, incluindo IBS/CBS desde o adaptador |
| Quem opera | Equipe comercial | Departamentos com analistas | O dono e poucos funcionários; o contador recebe |

**Diferencial que só este desenho tem:** o módulo contábil é setor-invariante e imutável, e todo evento operacional
de qualquer vertical vira lançamento por binding compilado — sem mapper escrito à mão, sem rule engine em runtime.

**Tese de produto (fixada pelo dono 2026-07-13, ver Parte IV):** módulos canônicos + onboarding com IA **geram
sistemas de setores diferentes**; o salão é o molde, a contabilidade é a espinha.
