import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { drainLater } from './test-utils/later';

// Resposta simulada em voo (`later()`) assenta ANTES do teardown do jsdom, nunca depois — sem isto o `setState`
// tardio do último caso lança `ReferenceError: window is not defined` e o vitest sai 1 com tudo verde.
afterEach(drainLater);
