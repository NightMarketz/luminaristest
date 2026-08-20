/**
 * INVARIANTE (Parte 0, 2026-08-17 — preenchida por delegação explícita do dono;
 * grau: inferido de artefato, não declarado):
 *
 *   "Nunca pode acontecer de rodar o seed mudar a senha de alguém que já existe."
 *
 * PASSO 1 — artefato ancorado: prisma/seed.ts (upsert em User, branch `update`
 * sobrescreve `password`) × tabela User, campo `password` (schema.prisma:22).
 * O teste executa o seed REAL como processo filho (npx ts-node prisma/seed.ts),
 * não uma cópia da lógica — o que se testa é o artefato, não uma paráfrase.
 *
 * PASSO 2 — classe: INVARIANTE (vale para toda entrada). Não é metamórfica nem
 * equivalência: a resposta certa é conhecida e única — a senha armazenada antes.
 *
 * O QUE ESTA PROPRIEDADE NÃO COBRE: colisão de `username` no branch `create`
 * (usuário existente com username 'admin' e outro email → P2002), e o seed
 * sobrescrever `role` de usuário existente (escalação adjacente, fora da frase).
 */
import { execSync } from 'child_process';
import path from 'path';
import fc from 'fast-check';
import prisma from '@/lib/prisma';
import { pushTestSchema, disconnectDb } from '@test/helpers/db';

const SERVER_DIR = path.resolve(__dirname, '../..');

/** Roda o seed real contra o test-integration.db (mesmo DATABASE_URL do jest.setupEnv). */
function runSeed(adminEmail: string, adminPassword: string): void {
    execSync('npx ts-node prisma/seed.ts', {
        cwd: SERVER_DIR,
        env: {
            ...process.env, // já carrega DATABASE_URL=file:./test-integration.db
            SEED_ADMIN_EMAIL: adminEmail,
            SEED_ADMIN_PASSWORD: adminPassword,
        },
        stdio: 'pipe',
    });
}

// ——— Arbitrários (todo limite com procedência) ———————————————————————————
// email: schema.prisma User.email é String @unique sem restrição de formato;
// emailAddress() cobre o formato real de entrada do seed (SEED_ADMIN_EMAIL).
const arbEmail = fc.emailAddress();
// hash já armazenado: campo password é String livre no schema (procedência:
// schema.prisma:22); minLength 1 porque linha sem senha não existe no fluxo real
// (register/seed sempre gravam hash bcrypt não-vazio).
const arbHashOriginal = fc.string({ minLength: 1, maxLength: 60 });
// senha passada ao seed: minLength 1 — seed.ts:9-12 rejeita SEED_ADMIN_PASSWORD
// vazio (guard `!adminPassword`); maxLength 64 — bcrypt só considera os primeiros
// 72 bytes (procedência: bcryptjs), 64 fica abaixo do teto sem perder cobertura.
const arbSenhaSeed = fc.string({ minLength: 1, maxLength: 64 });

let seq = 0;

async function criaUsuarioExistente(email: string, hashOriginal: string) {
    // deleteMany ESCOPADO ao dono da iteração (regra da suíte: nunca deleteMany global)
    await prisma.user.deleteMany({ where: { email } });
    return prisma.user.create({
        data: {
            email,
            username: `seed-inv-${Date.now()}-${seq++}`,
            name: 'Usuária Pré-existente',
            password: hashOriginal,
            role: 'USER',
        },
    });
}

beforeAll(() => {
    pushTestSchema();
});

afterAll(async () => {
    await prisma.user.deleteMany({ where: { username: { startsWith: 'seed-inv-' } } });
    await disconnectDb();
});

describe('seed × credencial existente', () => {
    test(
        'nunca pode acontecer de rodar o seed mudar a senha de alguém que já existe',
        async () => {
            await fc.assert(
                fc.asyncProperty(
                    arbEmail,
                    arbHashOriginal,
                    arbSenhaSeed,
                    async (email, hashOriginal, senhaSeed) => {
                        await criaUsuarioExistente(email, hashOriginal);

                        runSeed(email, senhaSeed);

                        const depois = await prisma.user.findUnique({ where: { email } });
                        expect(depois).not.toBeNull();
                        // O invariante: a credencial armazenada antes continua lá.
                        expect(depois!.password).toBe(hashOriginal);
                    }
                ),
                // numRuns 5: limite de EXECUÇÃO, não de domínio — cada run sobe um
                // processo node/ts-node real (~5s). A violação, se existir, é
                // determinística (branch `update` incondicional), então runs extras
                // variam formato de entrada, não probabilidade de detecção.
                { numRuns: 5 }
            );
        },
        600_000 // processos filhos reais; shrinking pode multiplicar execuções
    );

    // Contraexemplo mínimo FIXADO (Passo 6 do protocolo). Capturado na primeira
    // rodada VERMELHA contra o seed.ts de produção em 2026-08-17:
    //   { seed: -1864207884, counterexample: ["a@a.aa", " ", " "], shrunk: 13x }
    // O código então sobrescrevia o hash " " pelo bcrypt da senha do seed.
    test('contraexemplo fixado: usuária "a@a.aa" com hash " " sobrevive ao seed', async () => {
        await criaUsuarioExistente('a@a.aa', ' ');
        runSeed('a@a.aa', ' ');
        const depois = await prisma.user.findUnique({ where: { email: 'a@a.aa' } });
        expect(depois!.password).toBe(' ');
    }, 60_000);
});
