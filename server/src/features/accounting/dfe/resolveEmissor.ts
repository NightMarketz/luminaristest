import { ValidationError } from '../../../lib/errors';
import { ManualEmissor } from './ManualEmissor';
import { NullEmissor } from './NullEmissor';
import { selectDfeEmissor } from './selectDfeEmissor';
import type { DfeEmissorPort } from './DfeEmissorPort';

/**
 * BE-INCR-DFE-MANUAL (item 9) — o adaptador de um documento é o do DOCUMENTO (`FiscalDocument.partner`), não o do
 * env: o env escolhe só o adaptador das NOVAS emissões. Com dois modos convivendo (manual + parceiro), consultar ou
 * cancelar pelo adaptador do env erraria o documento.
 *
 * Quando o `partner` do documento é o do env habilitado, devolve essa MESMA instância (preserva a seleção do env,
 * inclusive nos testes que a substituem); senão resolve pelo nome. Nome sem adaptador ⇒ `dfe_adapter_unknown`
 * (código próprio: o job faz skip+log — memória erro-especifico-para-skip-em-job).
 */
export function resolveEmissorFor(partner: string, env: NodeJS.ProcessEnv = process.env): DfeEmissorPort {
  const selection = selectDfeEmissor(env);
  if (selection.enabled && selection.port.name === partner) return selection.port;
  if (partner === 'manual') return new ManualEmissor();
  if (partner === 'null') return new NullEmissor();
  throw new ValidationError(`dfe_adapter_unknown: nenhum adaptador para o parceiro '${partner}' do documento.`);
}
