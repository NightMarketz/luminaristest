import { useEffect, useState } from 'react';
import { SetupService, type Preset } from '../../../lib/services/setup.service';

// Uma busca por carga de página: a lista de presets é a mesma do Modo Rápido (GET /dashboard/presets).
let presetsPromise: Promise<Preset[]> | null = null;

/**
 * W3 (achado do RUNBOOK-W3-ESCOLHA-CRIACAO, 06/11): o modal de confirmação mostra o NOME do preset (BRIEF item 9),
 * não a chave. Enquanto a lista não chega, ou se a chave não estiver nela, cai na própria chave.
 */
export function usePresetName(presetKey: string | null): string | null {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    setName(null);
    if (!presetKey) return;
    let alive = true;
    presetsPromise ??= SetupService.getPresets().catch((err: unknown) => {
      presetsPromise = null; // a próxima chave tenta de novo
      throw err;
    });
    presetsPromise
      .then((presets) => { if (alive) setName(presets.find((p) => p.key === presetKey)?.name ?? null); })
      .catch(() => { /* sem a lista, o modal mostra a chave — o mesmo de antes deste hook */ });
    return () => { alive = false; };
  }, [presetKey]);

  return name ?? presetKey;
}
