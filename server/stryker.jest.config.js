// Jest para o Stryker (mutation testing fiscal/contábil — ver stryker.config.mjs). Só o projeto
// `unit`: o `integration` exige SQLite serial (--runInBand) e os workers paralelos do Stryker
// disputariam o mesmo arquivo de banco.
const { projects } = require('./jest.config');

const unit = projects.find((p) => p.displayName === 'unit');
const { displayName: _ignored, ...config } = unit;

// inPlace guarda os originais em .stryker-tmp/backup-*: fora da coleta de testes e do haste map.
const STRYKER_TMP = '/\\.stryker-tmp/';

// Testes que leem o FONTE como texto (scanner por regex) quebram com o código instrumentado
// (`stryMutAct_…` no lugar do literal) — incompatíveis com mutação por construção, não por bug.
const SOURCE_SCANNERS = ['auditAllowlistCoverage\\.test\\.ts$'];

module.exports = {
  ...config,
  rootDir: __dirname,
  testPathIgnorePatterns: [...config.testPathIgnorePatterns, STRYKER_TMP, ...SOURCE_SCANNERS],
  modulePathIgnorePatterns: [STRYKER_TMP],
};
