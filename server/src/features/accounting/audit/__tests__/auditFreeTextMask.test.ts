/**
 * BE-INCR-AUDIT-FREETEXT-MASK — masker de nome de terceiro em campo livre.
 * Função pura + teste de CONTRATO do mapa contra a allowlist. Sem Prisma, sem tx.
 */
import { PAYLOAD_ALLOWLIST } from '../auditCanonical';
import {
  MASKABLE_FREE_TEXT_KEYS,
  maskThirdPartyNames,
  type MaskableCounterparty,
} from '../auditFreeTextMask';

const acme: MaskableCounterparty = { id: 'cp_acme', nameNormalized: 'acme ltda' };
const sol: MaskableCounterparty = { id: 'cp_sol', nameNormalized: 'sol' };
const jose: MaskableCounterparty = { id: 'cp_jose', nameNormalized: 'josé da conceição' };

describe('MASKABLE_FREE_TEXT_KEYS — contrato contra PAYLOAD_ALLOWLIST', () => {
  // A invariante que impede código morto e typo silencioso: mascarar uma chave que a
  // canonicalização descarta em seguida não teria efeito nenhum, e ninguém perceberia.
  it('toda chave mascarável existe na allowlist do MESMO eventType', () => {
    const orfas: string[] = [];
    for (const [eventType, keys] of Object.entries(MASKABLE_FREE_TEXT_KEYS)) {
      const allowed = PAYLOAD_ALLOWLIST[eventType];
      if (!allowed) {
        orfas.push(`${eventType} (eventType inexistente na allowlist)`);
        continue;
      }
      for (const key of keys) {
        if (!allowed.includes(key)) orfas.push(`${eventType}.${key}`);
      }
    }
    expect(orfas).toEqual([]);
  });

  // A direção que sustenta a justificativa do Fork D(a) ("nenhum eventType futuro esquece"): sem
  // esta, um eventType novo que allowliste description/reason e não entre no mapa do mask passa
  // VERDE — o teste ⊆ acima não o veria. Achado do review independente de 2026-09-10.
  it('todo `description`/`reason` allowlistado tem mascaramento declarado (direção inversa)', () => {
    // LIMITE DESTA GUARDA, declarado em vez de disfarçado: `CAMPOS_LIVRES` é uma LISTA digitada à
    // mão, não uma descoberta por regra — um campo livre futuro chamado `note`/`observacao`/
    // `justificativa` escapa das duas direções e nada avisa. Não dá para derivar o predicado do
    // nome da chave: `externalRef`, `ref` e `name` também são digitados pelo operador e NÃO estão
    // no escopo ratificado (Fork A(b) cobre só description/reason). Predicado indecidível ⇒ lista
    // honesta, com o limite escrito, em vez de heurística com cara de regra.
    const CAMPOS_LIVRES = ['description', 'reason'];
    const semMascaramento: string[] = [];
    for (const [eventType, allowedKeys] of Object.entries(PAYLOAD_ALLOWLIST)) {
      const mascaradas = MASKABLE_FREE_TEXT_KEYS[eventType] ?? [];
      for (const key of allowedKeys) {
        if (CAMPOS_LIVRES.includes(key) && !mascaradas.includes(key)) {
          semMascaramento.push(`${eventType}.${key}`);
        }
      }
    }
    expect(semMascaramento).toEqual([]);
  });

  it('cobre os 13 eventTypes de campo livre do BRIEF (12 do achado + entry.posted manual)', () => {
    expect(Object.keys(MASKABLE_FREE_TEXT_KEYS).sort()).toEqual(
      [
        'entry.draft_updated',
        'entry.drafted',
        'entry.posted',
        'entry.rejected',
        'entry.reversed',
        'payable.cancelled',
        'payable.payment_cancelled',
        'period.hard_closed',
        'period.reopened',
        'period.soft_closed',
        'receivable.cancelled',
        'receivable.receipt_cancelled',
        'reconciliation.unmatched',
      ].sort(),
    );
  });
});

describe('maskThirdPartyNames — o caso coberto', () => {
  it('substitui o nome por referência opaca ao id (Fork E-b)', () => {
    expect(maskThirdPartyNames('Cancelado — ACME Ltda cobrou errado', [acme])).toBe(
      'Cancelado — [counterparty:cp_acme] cobrou errado',
    );
  });

  it('PRESERVA o texto original fora do trecho mascarado (lacuna 1, decisão do dono)', () => {
    // Caixa e pontuação do resto da frase ficam intactas — a trilha é append-only, degradar o
    // texto do operador seria irreversível.
    const saida = maskThirdPartyNames('URGENTE: ACME Ltda pediu ESTORNO hoje!', [acme]);
    expect(saida).toBe('URGENTE: [counterparty:cp_acme] pediu ESTORNO hoje!');
    expect(saida).toContain('URGENTE');
    expect(saida).toContain('ESTORNO');
  });

  it('casa independente de caixa e de espaço duplo no original', () => {
    expect(maskThirdPartyNames('pago para  acme   LTDA', [acme])).toBe('pago para  [counterparty:cp_acme]');
  });

  it('casa nome grudado em pontuação (parênteses contam como fronteira)', () => {
    expect(maskThirdPartyNames('estorno (ACME Ltda) em duplicidade', [acme])).toBe(
      'estorno ([counterparty:cp_acme]) em duplicidade',
    );
  });

  it('casa nome ACENTUADO — o motivo de não usar \\b (ASCII-only) como fronteira', () => {
    expect(maskThirdPartyNames('recebido de José da Conceição ontem', [jose])).toBe(
      'recebido de [counterparty:cp_jose] ontem',
    );
  });

  it('substitui TODAS as ocorrências, não só a primeira', () => {
    expect(maskThirdPartyNames('ACME Ltda e de novo ACME Ltda', [acme])).toBe(
      '[counterparty:cp_acme] e de novo [counterparty:cp_acme]',
    );
  });

  it('nome mais longo vence o mais curto (ACME × ACME Ltda)', () => {
    const acmeCurto: MaskableCounterparty = { id: 'cp_curto', nameNormalized: 'acme' };
    expect(maskThirdPartyNames('nota da ACME Ltda', [acmeCurto, acme])).toBe(
      'nota da [counterparty:cp_acme]',
    );
  });

  it('não re-mascara o próprio placeholder (passada única — o id contém o nome)', () => {
    // Regressão: com um `replace` por nome em sequência, "acme" voltava a casar DENTRO de
    // `[counterparty:cp_acme]` e o resultado aninhava em `[counterparty:cp_[counterparty:...]]`.
    const acmeCurto: MaskableCounterparty = { id: 'cp_acme', nameNormalized: 'acme' };
    const saida = maskThirdPartyNames('nota da ACME Ltda e da ACME', [acmeCurto, acme]);
    expect(saida).toBe('nota da [counterparty:cp_acme] e da [counterparty:cp_acme]');
    expect(saida).not.toContain('[counterparty:cp_[');
  });

  it('homônimas de tipos diferentes resolvem sempre para a mesma id (determinístico)', () => {
    const fornecedor: MaskableCounterparty = { id: 'cp_forn', nameNormalized: 'acme ltda' };
    const cliente: MaskableCounterparty = { id: 'cp_cli', nameNormalized: 'acme ltda' };
    const primeira = maskThirdPartyNames('nf da ACME Ltda', [fornecedor, cliente]);
    const segunda = maskThirdPartyNames('nf da ACME Ltda', [fornecedor, cliente]);
    expect(primeira).toBe(segunda);
    expect(primeira).toBe('nf da [counterparty:cp_forn]');
  });
});

describe('maskThirdPartyNames — o que NÃO deve tocar', () => {
  it('não mascara dentro de palavra: "Sol" não corrompe "solicitado" (lacuna 2, decisão do dono)', () => {
    expect(maskThirdPartyNames('estorno solicitado pelo cliente', [sol])).toBe(
      'estorno solicitado pelo cliente',
    );
  });

  it('mas mascara "Sol" quando é a palavra inteira', () => {
    expect(maskThirdPartyNames('pago à Sol hoje', [sol])).toBe('pago à [counterparty:cp_sol] hoje');
  });

  it('texto sem nenhum nome conhecido volta idêntico', () => {
    const texto = 'Lançamento manual de ajuste — competência 06/2026';
    expect(maskThirdPartyNames(texto, [acme, sol, jose])).toBe(texto);
  });

  it('lista de contrapartes vazia devolve o texto intacto', () => {
    expect(maskThirdPartyNames('ACME Ltda', [])).toBe('ACME Ltda');
  });

  // Regressão do pré-filtro (2º review independente, 2026-09-10): quando a chave do pré-filtro e o
  // tokenizador do texto discordavam, o nome com pontuação no primeiro token era descartado ANTES
  // de qualquer regex — texto idêntico ao cadastro passava batido para a trilha imutável.
  it.each([
    ['M&M Ltda',        'Pagamento M&M Ltda em atraso',      'Pagamento [counterparty:cp_x] em atraso'],
    ['R.C. Serviços',   'estorno R.C. Serviços duplicado',   'estorno [counterparty:cp_x] duplicado'],
    ["D'Ávila Comercio", "nf de D'Ávila Comercio",           'nf de [counterparty:cp_x]'],
    ['Ana-Maria Silva', 'recebido de Ana-Maria Silva',       'recebido de [counterparty:cp_x]'],
    ['AT&T',            'pago para AT&T hoje',               'pago para [counterparty:cp_x] hoje'],
  ])('mascara nome com pontuação no primeiro token: %s', (nome, texto, esperado) => {
    const cp: MaskableCounterparty = { id: 'cp_x', nameNormalized: nome.toLowerCase() };
    expect(maskThirdPartyNames(texto, [cp])).toBe(esperado);
  });

  it('`nameNormalized` que chega FORA do padrão (com maiúscula) ainda mascara', () => {
    // O pré-filtro roda antes da normalização defensiva, direto sobre o campo do banco. Se um dia
    // uma linha vier com caixa alta, a chave do pré-filtro não pode deixar de casar com o token do
    // texto (que é sempre minúsculo) — senão volta o falso negativo silencioso.
    const forcado: MaskableCounterparty = { id: 'cp_up', nameNormalized: 'ACME Ltda' };
    expect(maskThirdPartyNames('nota da acme ltda paga', [forcado])).toBe(
      'nota da [counterparty:cp_up] paga',
    );
  });

  it('catálogo ACIMA do limite de regex do V8 não derruba o append (guarda do achado ALTO)', () => {
    // Regressão do review independente de 2026-09-10: uma única alternância com todos os nomes
    // estourava os 65.535 nós do V8 em ~21.8k contrapartes de 4 palavras, e o SyntaxError subia
    // DENTRO da tx do append — com catálogo grande, nenhuma escrita contábil commitava.
    // A primeira palavra é compartilhada de propósito: assim o pré-filtro NÃO descarta ninguém e o
    // fatiamento é obrigado a entrar em ação (senão o teste não exercitaria o conserto).
    const catalogoEnorme: MaskableCounterparty[] = Array.from({ length: 30000 }, (_, i) => ({
      id: `cp_${i}`,
      nameNormalized: `cliente teste numero ${i}`,
    }));

    let saida = '';
    expect(() => {
      saida = maskThirdPartyNames('cobranca do cliente teste numero 29999 em aberto', catalogoEnorme);
    }).not.toThrow();
    expect(saida).toBe('cobranca do [counterparty:cp_29999] em aberto');
  });

  it('nome com metacaractere de regex é tratado como literal, não como padrão', () => {
    const cia: MaskableCounterparty = { id: 'cp_cia', nameNormalized: 'pão & cia (matriz)' };
    expect(maskThirdPartyNames('nf de Pão & Cia (Matriz) vencida', [cia])).toBe(
      'nf de [counterparty:cp_cia] vencida',
    );
    // O parêntese do nome não vira grupo de captura: um texto que casaria com o PADRÃO
    // (mas não com o literal) fica intacto.
    expect(maskThirdPartyNames('pão & cia matriz', [cia])).toBe('pão & cia matriz');
  });
});
