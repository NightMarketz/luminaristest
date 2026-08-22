# ---- builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# prisma ANTES do npm ci: package.json:postinstall roda "prisma generate", que falha sem
# prisma/schema.prisma no disco. Sem este estágio de build, a imagem dependia de um `dist/`
# gerado FORA do `docker build` — mas dist/ está no .gitignore (ADR-M2 §4.b, item 2: um PaaS
# que builda a partir do git não tem dist/ no contexto; aqui resolvido copiando src/ e buildando
# dentro da imagem, como o my-app/Dockerfile já faz).
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

# "npm run build" == "npx prisma generate && tsc && tsc-alias" (server/package.json) — reusa o
# script único do projeto em vez de reimplementar a ordem aqui. O gerador do Prisma tem
# output = "../generated/prisma" (prisma/schema.prisma:9), ou seja server/generated/prisma —
# IRMÃO de dist/, não node_modules/@prisma/client — e tsc-alias reescreve os imports de
# dist/ para apontar lá (tsconfig.json: path "generated/prisma"). Os dois (dist/ e generated/)
# têm que viajar juntos para o runner abaixo.
RUN npm run build

# ---- runner ----
FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/generated ./generated
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3001

CMD ["node", "dist/server.js"]
