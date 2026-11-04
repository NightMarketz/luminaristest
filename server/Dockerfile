# ---- builder ----
FROM node:22-alpine AS builder

WORKDIR /app

# Contexto do build = raiz do repo (workspace npm, PR-3 do MONOREPO-WORKSPACES): o lockfile é um só, na raiz.
# Entram o manifesto da raiz, o lockfile e os manifestos dos dois apps (o `npm ci` confere o lockfile contra todos), mas
# só o código do server; `-w luminaris-server` instala só as dependências dele. O .dockerignore da raiz tira os
# node_modules e o resto do repo. O `legacy-peer-deps` do server/.npmrc saiu: com o lockfile da raiz o `npm ci` passa
# sem ele (BRIEF §0.4, passo 1).
# prisma ANTES do npm ci: o postinstall do server roda "prisma generate", que falha sem prisma/schema.prisma no disco.
# Sem este estágio de build, a imagem dependia de um `dist/` gerado FORA do `docker build` — mas dist/ está no
# .gitignore (ADR-M2 §4.b, item 2: um PaaS que builda a partir do git não tem dist/ no contexto; aqui resolvido
# copiando src/ e buildando dentro da imagem, como o my-app/Dockerfile já faz).
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY my-app/package.json ./my-app/
COPY server/prisma ./server/prisma
RUN npm ci -w luminaris-server

COPY server/tsconfig.json ./server/
COPY server/src ./server/src

# "npm run build" == "npx prisma generate && tsc && tsc-alias" (server/package.json) — reusa o
# script único do projeto em vez de reimplementar a ordem aqui. O gerador do Prisma tem
# output = "../generated/prisma" (prisma/schema.prisma:9), ou seja server/generated/prisma —
# IRMÃO de dist/, não node_modules/@prisma/client — e tsc-alias reescreve os imports de
# dist/ para apontar lá (tsconfig.json: path "generated/prisma"). Os dois (dist/ e generated/)
# têm que viajar juntos para o runner abaixo.
RUN npm run build -w luminaris-server

# ---- runner ----
FROM node:22-alpine AS runner

WORKDIR /app

# O npm iça as dependências do server para o node_modules da raiz do workspace; no runner elas ficam em /app/node_modules,
# ao lado de dist/ e generated/, como antes do workspace.
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/generated ./generated
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/package.json ./package.json

EXPOSE 3001

CMD ["node", "dist/server.js"]
