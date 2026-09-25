---
tipo: "destino"
secao_sdd: "§11"
titulo: "Verticais geradas"
---
# §11 Verticais geradas

| Setor | Módulos que o preset liga | Estado |
|---|---|---|
| Salão/barbearia | Agenda, serviços, pacotes, comissões, PDV, estoque de revenda, CRM-0/1 | DECIDIDO — molde |
| Clínica estética | + ficha do cliente, procedimentos por sessão | ⟨corr⟩ DECIDIDO — **código em `main` (#282), prova H3 aberta** (comportamento 8 parcial) |
| Clínica/consultório | + prontuário, convênio, anamnese, termo | PROPOSTO |
| Petshop/veterinária | + paciente animal, vacina, compras a prazo | GATILHO — puxa Compras |
| Varejo pequeno | PDV/NFC-e, estoque, compras, e-commerce | PROPOSTO |
| Serviços profissionais | Projetos, horas, contratos recorrentes, NFS-e | PROPOSTO |
| Oficina/assistência | Ordem de serviço, peças, garantia | PROPOSTO |
| Academia/escola | Matrícula, mensalidade recorrente, turmas, frequência | PROPOSTO |
| Food service | Comanda, ficha técnica, estoque de insumo, NFC-e | PROPOSTO |

**Critério de sucesso de cada linha:** zero diff no motor, no razão e no intérprete — só preset, binding e, se preciso,
contas novas por papel.
