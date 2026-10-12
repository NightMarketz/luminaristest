/**
 * BE-INCR-DFE-EVENTOS (nó X11, item 12) — invariantes de conteúdo da DPS substituta, regras NACIONAIS de nível 2 do
 * Anexo I v1.01, aba `RN DPS_NFS-e`. Função pura: compara a DPS remontada (substituta) com a DPS da tentativa
 * autorizada da original e devolve os faltantes (vazio = pode substituir). O regime é o da DPS substituta
 * (`prest/regTrib/opSimpNac` [140]), que é a DPS que o fisco valida na recepção.
 *
 * - E0060 ([176]) — não optante (`opSimpNac = 1`): não muda `dCompet`, subitem da lista nacional (`cTribNac`), código
 *   complementar municipal (`cTribMun`), local da prestação (`cLocPrestacao`).
 * - E0061 ([177]) — MEI/ME/EPP (`opSimpNac = 2|3`): não muda identificação do tomador (se havia), `dCompet`, `vServ`.
 *
 * As regras nível 3 (E0050/E0056/E0058/E0074) são do município e não entram aqui (F-EVT-1 a).
 */
interface DpsComparavel {
  infDPS: {
    dCompet: string;
    prest: { regTrib: { opSimpNac: number } };
    toma?: { CNPJ?: string; CPF?: string };
    serv: { locPrest: { cLocPrestacao: string }; cServ: { cTribNac: string; cTribMun?: string } };
    valores: { vServPrest: { vServ: string } };
  };
}

export function invariantesSubstituicao(original: DpsComparavel, substituta: DpsComparavel): string[] {
  const o = original.infDPS;
  const s = substituta.infDPS;
  const faltantes: string[] = [];
  const igual = (rn: string, campo: string, a: string | undefined, b: string | undefined) => {
    if ((a ?? '') !== (b ?? '')) faltantes.push(`${rn}: ${campo} mudou ('${a ?? ''}' → '${b ?? ''}')`);
  };
  const opSimpNac = s.prest.regTrib.opSimpNac;
  if (opSimpNac === 1) {
    igual('E0060', 'dCompet', o.dCompet, s.dCompet);
    igual('E0060', 'cTribNac', o.serv.cServ.cTribNac, s.serv.cServ.cTribNac);
    igual('E0060', 'cTribMun', o.serv.cServ.cTribMun, s.serv.cServ.cTribMun);
    igual('E0060', 'cLocPrestacao', o.serv.locPrest.cLocPrestacao, s.serv.locPrest.cLocPrestacao);
  } else if (opSimpNac === 2 || opSimpNac === 3) {
    igual('E0061', 'dCompet', o.dCompet, s.dCompet);
    igual('E0061', 'vServ', o.valores.vServPrest.vServ, s.valores.vServPrest.vServ);
    const tomaOriginal = o.toma?.CNPJ ?? o.toma?.CPF;
    if (tomaOriginal) igual('E0061', 'documento do tomador', tomaOriginal, s.toma?.CNPJ ?? s.toma?.CPF);
  }
  return faltantes;
}
