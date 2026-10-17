import type { InterviewModuleOption, ModuleKey } from '../types/InterviewTypes';

/**
 * W5 item 15 (FE-INCR-W5-MODULES): marca/desmarca um módulo fechando pelas dependências — desmarcar tira quem depende
 * dele; marcar põe as dependências dele. Travado não muda. Devolve na ordem das opções.
 */
export function toggleModuleSelection(
  options: InterviewModuleOption[],
  selected: ModuleKey[],
  key: ModuleKey,
): ModuleKey[] {
  const option = options.find((o) => o.key === key);
  if (!option || option.locked) return selected;
  const next = new Set<ModuleKey>(selected);
  if (next.has(key)) {
    const removed = new Set<ModuleKey>([key]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const o of options) {
        if (!o.locked && !removed.has(o.key) && o.dependsOn.some((d) => removed.has(d))) {
          removed.add(o.key);
          grew = true;
        }
      }
    }
    removed.forEach((k) => next.delete(k));
  } else {
    const pending: ModuleKey[] = [key];
    while (pending.length > 0) {
      const k = pending.pop() as ModuleKey;
      if (next.has(k)) continue;
      next.add(k);
      pending.push(...(options.find((o) => o.key === k)?.dependsOn ?? []));
    }
  }
  return options.filter((o) => next.has(o.key)).map((o) => o.key);
}
