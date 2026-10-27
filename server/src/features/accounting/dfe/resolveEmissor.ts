import { ValidationError } from '../../../lib/errors';
import { ManualEmissor } from './ManualEmissor';
import { NullEmissor } from './NullEmissor';
import { selectDfeEmissor } from './selectDfeEmissor';
import type { DfeEmissorPort, DfeKind } from './DfeEmissorPort';

/**
 * BE-INCR-DFE-MANUAL (item 9) — o adaptador de um documento é o do DOCUMENTO (`FiscalDocument.partner`), não o do
 * env: o env escolhe só o adaptador das NOVAS emissões. Com dois modos convivendo (manual + parceiro), consultar ou
 * cancelar pelo adaptador do env erraria o documento.
 *
 * Quando o `partner` do documento é o do env habilitado, devolve essa MESMA instância (preserva a seleção do env,
 * inclusive nos testes que a substituem); senão resolve pelo nome. Nome sem adaptador ⇒ `dfe_adapter_unknown`
 * (código próprio: o job faz skip+log — memória erro-especifico-para-skip-em-job).
 *
 * BE-INCR-NFCE (nó X10a, item 6) — o adaptador tem de declarar o tipo do documento em `capabilities.kinds`; senão
 * `dfe_adapter_kind_unsupported` (outro código próprio, mesmo skip+log no job).
 */
export function resolveEmissorFor(partner: string, kind: DfeKind, env: NodeJS.ProcessEnv = process.env): DfeEmissorPort {
  const port = portByName(partner, kind, env);
  if (!port.capabilities.kinds.includes(kind)) {
    throw new ValidationError(`dfe_adapter_kind_unsupported: o adaptador '${partner}' do documento não emite ${kind}.`);
  }
  return port;
}

function portByName(partner: string, kind: DfeKind, env: NodeJS.ProcessEnv): DfeEmissorPort {
  const selection = selectDfeEmissor(env, kind);
  if (selection.enabled && selection.port.name === partner) return selection.port;
  if (partner === 'manual') return new ManualEmissor();
  if (partner === 'null') return new NullEmissor();
  throw new ValidationError(`dfe_adapter_unknown: nenhum adaptador para o parceiro '${partner}' do documento.`);
}
