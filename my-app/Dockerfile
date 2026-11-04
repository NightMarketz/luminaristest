# ---- builder ----
FROM node:22-alpine AS builder

WORKDIR /app

# Contexto do build = raiz do repo (workspace npm, PR-3 do MONOREPO-WORKSPACES): o lockfile é um só, na raiz.
# Entram o manifesto da raiz, o lockfile e os manifestos dos dois apps (o `npm ci` confere o lockfile contra todos), mas
# só o código do my-app; `-w luminaris` instala só as dependências dele. O .dockerignore da raiz tira os node_modules,
# o .next e o resto do repo.
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY my-app/package.json ./my-app/
RUN npm ci -w luminaris

COPY my-app ./my-app

# NEXT_PUBLIC_* é inlinado no bundle AQUI, não no runtime: next.config.js lê process.env
# durante `next build`. Sem este ARG/ENV, nenhum valor vindo do compose alcança o bundle e
# a imagem sai com o default de desenvolvimento embutido, em silêncio.
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

RUN npm run build -w luminaris

# ---- runner ----
FROM node:22-alpine AS runner

WORKDIR /app

# As dependências do my-app ficam em dois lugares: o que ele compartilha com o server no node_modules da raiz e o que
# resolve em versão própria em my-app/node_modules. As duas pastas vão, na mesma posição relativa.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/my-app/node_modules ./my-app/node_modules
COPY --from=builder /app/my-app/.next ./my-app/.next
COPY --from=builder /app/my-app/package.json ./my-app/package.json

WORKDIR /app/my-app

EXPOSE 3000

CMD ["npm", "start"]
