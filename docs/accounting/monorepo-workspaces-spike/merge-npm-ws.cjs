// SPIKE: mescla os package-lock.json por app num lockfile de workspace npm (v3) na raiz, sem re-resolver.
// O server ocupa o node_modules da raiz; o pacote de topo do my-app que for igual (versão e subárvore) é compartilhado,
// e o que divergir vai para my-app/node_modules/. Entradas da raiz (turbo) saem do lockfile gerado pelo npm.
// Uso: node merge-npm-ws.cjs <lock gerado pelo npm> <server-lock> <my-app-lock> <saída>
const fs = require('fs');
const [gerado, sLock, mLock, out] = process.argv.slice(2);
const ler = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const G = ler(gerado).packages, S = ler(sLock).packages, M = ler(mLock).packages;
const P = {};
P[''] = G[''];
P['server'] = { ...S[''] }; delete P['server'].name;
P['my-app'] = { ...M[''] }; delete P['my-app'].name;
P['server'].name = S[''].name; P['my-app'].name = M[''].name;
P['node_modules/' + S[''].name] = { resolved: 'server', link: true };
P['node_modules/' + M[''].name] = { resolved: 'my-app', link: true };
for (const [k, v] of Object.entries(G)) if (/^node_modules\/(turbo|@turbo\/)/.test(k)) P[k] = v;
for (const [k, v] of Object.entries(S)) if (k.startsWith('node_modules/')) P[k] = v;
// topo do my-app = 1º segmento (com escopo) depois de node_modules/
const topo = (k) => { const r = k.slice(13).split('/node_modules/')[0]; return r; };
const grupos = {};
for (const k of Object.keys(M)) if (k.startsWith('node_modules/')) (grupos[topo(k)] ??= []).push(k);
let comp = 0, realoc = 0;
for (const [nome, chaves] of Object.entries(grupos)) {
  const igual = chaves.every((k) => P[k] && P[k].version === M[k].version && P[k].integrity === M[k].integrity);
  if (igual) { comp++; continue; }
  realoc++;
  for (const k of chaves) P['my-app/' + k] = M[k];
}
const lock = { name: ler(gerado).name, lockfileVersion: 3, requires: true, packages: P };
fs.writeFileSync(out, JSON.stringify(lock, null, 2) + '\n');
console.log(`my-app: ${comp} pacotes de topo compartilhados com o server, ${realoc} realocados em my-app/node_modules`);
