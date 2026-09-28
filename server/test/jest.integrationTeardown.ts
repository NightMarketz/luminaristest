/**
 * Integration project only (setupFilesAfterEnv). Disconnects the `@/lib/prisma` singleton after every test file,
 * even files that never call `disconnectDb()` because they talk to their own SQLite file but still import code
 * that connects the singleton to test-integration.db. On Windows an open engine handle blocks the next file's
 * `pushTestSchema()` unlink (EBUSY) until GC; Linux deletes open files, so CI never saw it.
 */
afterAll(async () => {
  await globalThis.prisma?.$disconnect();
});
