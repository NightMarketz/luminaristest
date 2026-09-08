import type { ITableSchema } from '../../../models/DynamicTable.model';
import { customerModule } from './CustomerModule';

/**
 * BE-INCR-P2-VERTICAL-CLINICA — Bloco I, comportamento 2. Módulo NOVO (F-P2-5 → RATIFICADO (a),
 * `docs/adr/ADR-P2-second-vertical.md` §3): a ficha clínica do vertical 2 vive num arquivo próprio
 * em `presets/modules/people/`, nunca editando `CustomerModule.ts` — esse arquivo é COMPARTILHADO
 * com o salão e o parecer classifica qualquer diff nele como falha da prova (F-P2-5 → (c) VETADO).
 *
 * Mecanismo: reusa `customerModule.schema.fields` POR REFERÊNCIA (spread, não reimplementação —
 * o parecer já cita este risco: "um revisor complacente poderia deixar passar uma edição real do
 * motor por não notar que 'cresceu dentro da árvore certa'" — aqui o oposto: o arquivo compartilhado
 * nunca é tocado, e uma mudança futura em `customerModule` propaga para cá automaticamente, sem
 * duplicar os 20 campos base) e acrescenta o(s) campo(s) próprio(s) da clínica.
 *
 * **Conteúdo do campo — LACUNA DE SPEC REGISTRADA** (BRIEF §7 item 4): anamnese, contraindicação e
 * termo de consentimento são dado pessoal SENSÍVEL de saúde sob a LGPD (Art. 5º II), com regime de
 * tratamento próprio — nenhum artefato jurídico foi citado para autorizar QUAL desses campos coletar,
 * com que base legal e retenção. Por isso nenhum campo de CONTEÚDO clínico entra aqui. O único campo
 * novo, `clinicalRecordNumber`, é um identificador ADMINISTRATIVO (nº do prontuário físico/externo do
 * paciente) — não carrega, por si, nenhum dado de saúde (é uma referência, análoga a um "member ID"),
 * e existe apenas para tornar o comportamento 2 verificável (o teste exige "um campo que o salão não
 * tem"). Decisão de QUAIS campos de conteúdo clínico existirão fica pendente de validação externa.
 */
export const aestheticClinicCustomerModule = {
  name: 'Aesthetic Clinic Customers',
  description:
    'Fiscal-grade customer registry for aesthetic clinics: identity, contact, full address, CRM ' +
    'lifecycle (reused verbatim from the shared customer module) plus a clinic-only administrative ' +
    'field. Health-sensitive clinical content (anamnesis, contraindication, consent) is deferred ' +
    'pending LGPD legal review — see docs/accounting/BE-INCR-P2-VERTICAL-CLINICA-brief.md §7 item 4.',
  category: 'people',
  schema: {
    defaultDisplayField: 'name',
    fields: [
      ...customerModule.schema.fields,
      {
        name: 'clinicalRecordNumber',
        label: 'Clinical Record Number',
        type: 'string',
        required: false,
        unique: false,
        searchable: true,
      },
    ],
  } as ITableSchema,
};
