// SPIKE: compara, para cada app, a versão de TODO pacote do lockfile por app (node_modules/<x>) com a versão que o
// lockfile de workspace da raiz entrega àquele app (<app>/node_modules/<x> se existir, senão node_modules/<x>).
// Uso: node cmp-npm-ws.cjs <raiz> <dir com server-package-lock.json e my-app-package-lock.json>
const fs = require('fs');
const path = require('path');
const [root, refDir] = process.argv.slice(2);
const ws = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8')).packages;
for (const app of ['server', 'my-app']) {
  const ref = JSON.parse(fs.readFileSync(path.join(refDir, `${app}-package-lock.json`), 'utf8')).packages;
  const pj = JSON.parse(fs.readFileSync(path.join(root, app, 'package.json'), 'utf8'));
  const diretos = new Set(Object.keys({ ...pj.dependencies, ...pj.devDependencies, ...pj.optionalDependencies }));
  let total = 0, iguais = 0;
  const difDiretos = [], difTrans = [];
  for (const [k, v] of Object.entries(ref)) {
    if (!k.startsWith('node_modules/') || k.slice(13).includes('/node_modules/')) continue; // só o nível de topo
    const nome = k.slice(13);
    const alvo = ws[`${app}/node_modules/${nome}`] ?? ws[`node_modules/${nome}`];
    total++;
    if (alvo?.version === v.version) iguais++;
    else (diretos.has(nome) ? difDiretos : difTrans).push(`${nome} ${v.version}→${alvo?.version ?? 'ausente'}`);
  }
  console.log(`${app}: ${total} pacotes de topo, ${iguais} iguais; diretos diferentes ${difDiretos.length}, transitivos diferentes ${difTrans.length}`);
  if (difDiretos.length) console.log('  diretos:', difDiretos.slice(0, 12).join(', '));
  if (difTrans.length) console.log('  transitivos (amostra):', difTrans.slice(0, 8).join(', '));
}
