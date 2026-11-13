/**
 * TESTE-GUARDA — fileExists (attachmentStorage): só ENOENT vira `false`; qualquer outro erro de `stat` (EACCES, EIO…)
 * é relançado, para o download não mascarar falha de disco/permissão como "arquivo ausente". Trocar o `throw e` por
 * `return false` deixava a suíte verde. Unit: `fs/promises.stat` dublado, sem tocar o disco.
 */
const mockStat = jest.fn();
jest.mock('fs/promises', () => ({
  ...jest.requireActual('fs/promises'),
  stat: (...args: unknown[]) => mockStat(...args),
}));
jest.mock('../../config/env', () => ({ ATTACHMENTS_DIR: '/tmp/attachments-test' }));

import { fileExists } from '../attachmentStorage';

const errno = (code: string) => Object.assign(new Error(code), { code });

describe('fileExists', () => {
  beforeEach(() => mockStat.mockReset());

  it('arquivo regular → true', async () => {
    mockStat.mockResolvedValue({ isFile: () => true });
    await expect(fileExists('a/b.pdf')).resolves.toBe(true);
  });

  it('diretório (não é arquivo regular) → false', async () => {
    mockStat.mockResolvedValue({ isFile: () => false });
    await expect(fileExists('a/b.pdf')).resolves.toBe(false);
  });

  it('ENOENT → false', async () => {
    mockStat.mockRejectedValue(errno('ENOENT'));
    await expect(fileExists('a/b.pdf')).resolves.toBe(false);
  });

  it('EACCES → relança o mesmo erro (não vira "ausente")', async () => {
    const e = errno('EACCES');
    mockStat.mockRejectedValue(e);
    await expect(fileExists('a/b.pdf')).rejects.toBe(e);
  });
});
