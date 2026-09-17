/**
 * BE-INCR-DFE (nó X10b, BRIEF item 8) — CÓDIGO INDICADOR DA OPERAÇÃO (`cIndOp` [339] do grupo IBSCBS da
 * DPS, LC 214/2025 art. 11) TRANSCRITO da fonte primária: `docs/accounting/fontes-oficiais/
 * NFSe-ANEXO-C-INDOP-IBS-CBS-v1.01.xlsx` (sha256[:12]=f59f066c5c35). Chave = ordinal da fonte.
 * Default do salão = '030101' (serviço prestado fisicamente sobre a pessoa, estabelecimento do fornecedor).
 * GERADO por script a partir do xlsx — não editar à mão.
 */
export interface IndOp {
  linha: number;
  codigo: string;
  tipoOperacao: string;
  localFornecimento: string;
}

export const IND_OP: ReadonlyArray<IndOp> = [
  { linha: 2, codigo: '020101', tipoOperacao: 'Operação com bem imóvel, bem imaterial, inclusive direito, relacionada a bem imóvel', localFornecimento: 'Localidade do imóvel (1)' },
  { linha: 3, codigo: '020201', tipoOperacao: 'Serviço prestado fisicamente sobre bem imóvel', localFornecimento: 'Localidade do imóvel (1)' },
  { linha: 4, codigo: '020301', tipoOperacao: 'Serviço de administração e intermediação de bem imóvel', localFornecimento: 'Localidade do imóvel (1)' },
  { linha: 5, codigo: '030101', tipoOperacao: 'Serviço prestado fisicamente sobre a pessoa ou fruído presencialmente por pessoa física', localFornecimento: 'Estabelecimento do fornecedor' },
  { linha: 6, codigo: '030102', tipoOperacao: 'Serviço prestado fisicamente sobre a pessoa ou fruído presencialmente por pessoa física', localFornecimento: 'Endereço do adquirente' },
  { linha: 7, codigo: '030103', tipoOperacao: 'Serviço prestado fisicamente sobre a pessoa ou fruído presencialmente por pessoa física', localFornecimento: 'Endereço do destinatário' },
  { linha: 8, codigo: '030104', tipoOperacao: 'Serviço prestado fisicamente sobre a pessoa ou fruído presencialmente por pessoa física', localFornecimento: 'Endereço diverso do fornecedor, adquirente ou destinatário' },
  { linha: 9, codigo: '040101', tipoOperacao: 'Serviço de planejamento, organização e administração de feiras, exposições, congressos, espetáculos, exibições e congêneres', localFornecimento: 'Local do Evento' },
  { linha: 10, codigo: '050101', tipoOperacao: 'Serviço prestado fisicamente sobre bem móvel material', localFornecimento: 'Estabelecimento do fornecedor' },
  { linha: 11, codigo: '050102', tipoOperacao: 'Serviço prestado fisicamente sobre bem móvel material', localFornecimento: 'Endereço do adquirente' },
  { linha: 12, codigo: '050103', tipoOperacao: 'Serviço prestado fisicamente sobre bem móvel material', localFornecimento: 'Endereço do destinatário' },
  { linha: 13, codigo: '050104', tipoOperacao: 'Serviço prestado fisicamente sobre bem móvel material', localFornecimento: 'Endereço diverso do fornecedor, adquirente ou destinatário' },
  { linha: 14, codigo: '050201', tipoOperacao: 'Serviços portuários', localFornecimento: 'Local da prestação' },
  { linha: 15, codigo: '060101', tipoOperacao: 'Serviço de transporte de passageiros', localFornecimento: 'Local de início do transporte' },
  { linha: 16, codigo: '070101', tipoOperacao: 'Serviço de transporte de carga', localFornecimento: 'Endereço fornecido para entrega' },
  { linha: 17, codigo: '070102', tipoOperacao: 'Serviço de transporte de carga', localFornecimento: 'Local da retirada' },
  { linha: 18, codigo: '080101', tipoOperacao: 'Serviço de exploração de via', localFornecimento: 'Local da prestação, correspondente à extensão da via explorada e proporcional ao território dos entes tributantes' },
  { linha: 19, codigo: '100101', tipoOperacao: 'Cessão de espaço para prestação de serviços publicitários, em operações onerosas (4)', localFornecimento: 'Local do domicílio principal do adquirente (3)' },
  { linha: 20, codigo: '100102', tipoOperacao: 'Cessão de espaço para prestação de serviços publicitários, em operações onerosas (4)', localFornecimento: 'Local do domicílio do destinatário, nos casos de adquirente residente ou domiciliado no exterior (5)(6)' },
  { linha: 21, codigo: '100201', tipoOperacao: 'Cessão de espaço para prestação de serviços publicitários, em operações não onerosas (4)', localFornecimento: 'Local do domicílio principal do destinatário (6)' },
  { linha: 22, codigo: '100301', tipoOperacao: 'Demais serviços, em operações onerosas', localFornecimento: 'Local do domicílio principal do adquirente (3)' },
  { linha: 23, codigo: '100302', tipoOperacao: 'Demais serviços, em operações onerosas', localFornecimento: 'Local do domicílio do destinatário, nos casos de adquirente residente ou domiciliado no exterior (5)(6)' },
  { linha: 24, codigo: '100401', tipoOperacao: 'Demais serviços, em operações não onerosas', localFornecimento: 'Local do domicílio principal do destinatário (6)' },
  { linha: 25, codigo: '100501', tipoOperacao: 'Demais bens móveis imateriais, inclusive direitos, em operações onerosas', localFornecimento: 'Local do domicílio principal do adquirente (3)' },
  { linha: 26, codigo: '100502', tipoOperacao: 'Demais bens móveis imateriais, inclusive direitos, em operações onerosas', localFornecimento: 'Local do domicílio do destinatário, nos casos de adquirente residente ou domiciliado no exterior (5)(6)' },
  { linha: 27, codigo: '100601', tipoOperacao: 'Demais bens móveis imateriais, inclusive direitos, em operações não onerosas', localFornecimento: 'Local do domicílio principal do destinatário (6)' },
];

export const IND_OP_DEFAULT_SALAO = '030101';

const BY_CODE: ReadonlySet<string> = new Set(IND_OP.map((o) => o.codigo));

export function isIndOp(codigo: string): boolean {
  return BY_CODE.has(codigo);
}
