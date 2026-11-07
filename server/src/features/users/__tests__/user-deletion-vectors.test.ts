/**
 * Security/Privacy regression test: vector deletion ordering (R5)
 *
 * LGPD art.18 VI — right to erasure: vectors in the vec0 index (own SQLite file) must be purged
 * BEFORE the user row is removed from SQL.  If the vector index fails the SQL delete
 * must NOT execute, leaving the record intact for retry.
 *
 * Verified behaviours
 * -------------------
 * 1. deleteByUser is called during deleteUser.
 * 2. deleteByUser is called BEFORE deleteUser (ordering).
 * 3. If deleteByUser rejects, deleteUser is NOT called.
 */

import { UserService } from '../services/UserService';
import { Role } from '../models/User.model';

// ---------------------------------------------------------------------------
// Silence logger output during tests
// ---------------------------------------------------------------------------
jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));
jest.mock('@/lib/attachmentStorage', () => ({ deleteFile: jest.fn() }));

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------
const USER_ID = 'user-abc-123';

const ACTOR = {
  id: 'admin-001',
  userId: 'admin-001',
  username: 'admin',
  email: 'admin@example.com',
  userEmail: 'admin@example.com',
  userRole: Role.ADMIN,
  name: 'Admin',
  password: 'hashed',
  role: Role.ADMIN,
  locale: 'en',
  currency: 'USD',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const EXISTING_USER = {
  id: USER_ID,
  username: 'alice',
  email: 'alice@example.com',
  name: 'Alice',
  role: Role.USER,
  locale: 'en',
  currency: 'USD',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ---------------------------------------------------------------------------
// Helper — build a UserService with controllable mocks
// ---------------------------------------------------------------------------
function buildService(overrides: {
  deleteByUser?: jest.Mock;
  deleteUser?: jest.Mock;
}) {
  const deleteByUser = overrides.deleteByUser ?? jest.fn().mockResolvedValue(undefined);
  const deleteUser = overrides.deleteUser ?? jest.fn().mockResolvedValue(EXISTING_USER);

  const mockUserRepository = {
    getUserById: jest.fn().mockResolvedValue(EXISTING_USER),
    hasRestrictedDependents: jest.fn().mockResolvedValue(false),
    getAttachmentStorageKeys: jest.fn().mockResolvedValue([]),
    deleteUser,
    createUser: jest.fn(),
    getAllUsers: jest.fn(),
    getUserByUsername: jest.fn(),
    getUserByEmail: jest.fn(),
    updateUser: jest.fn(),
    convertRole: jest.fn(),
  };

  const mockUserPolicy = {
    canDelete: jest.fn().mockReturnValue(true),
    canCreate: jest.fn(),
    canListAll: jest.fn(),
    canView: jest.fn(),
    canUpdate: jest.fn(),
    canChangeRole: jest.fn(),
  };

  const mockVectorRepository = {
    deleteByUser,
    upsertChunks: jest.fn(),
    search: jest.fn(),
    searchVectors: jest.fn(),
    deletePoints: jest.fn(),
    getPointsByDocumentId: jest.fn(),
  };

  const service = new UserService(
    mockUserRepository as any,
    mockUserPolicy as any,
    mockVectorRepository as any,
  );

  return { service, mockUserRepository, mockVectorRepository, deleteByUser, deleteUser };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UserService.deleteUser — vector index ordering (R5)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls deleteByUser during user deletion', async () => {
    const { service, deleteByUser } = buildService({});

    await service.deleteUser(USER_ID, ACTOR);

    expect(deleteByUser).toHaveBeenCalledTimes(1);
    expect(deleteByUser).toHaveBeenCalledWith(USER_ID);
  });

  it('calls deleteByUser BEFORE deleteUser (ordering)', async () => {
    const callOrder: string[] = [];

    const deleteByUser = jest.fn().mockImplementation(async () => {
      callOrder.push('deleteByUser');
    });
    const deleteUser = jest.fn().mockImplementation(async () => {
      callOrder.push('deleteUser');
      return EXISTING_USER;
    });

    const { service } = buildService({ deleteByUser, deleteUser });

    await service.deleteUser(USER_ID, ACTOR);

    expect(callOrder).toEqual(['deleteByUser', 'deleteUser']);
    expect(callOrder.indexOf('deleteByUser')).toBeLessThan(
      callOrder.indexOf('deleteUser'),
    );
  });

  it('does NOT call deleteUser when deleteByUser rejects', async () => {
    const indexError = new Error('vector index connection refused');

    const deleteByUser = jest.fn().mockRejectedValue(indexError);
    const deleteUser = jest.fn().mockResolvedValue(EXISTING_USER);

    const { service } = buildService({ deleteByUser, deleteUser });

    await expect(service.deleteUser(USER_ID, ACTOR)).rejects.toThrow(indexError);

    expect(deleteByUser).toHaveBeenCalledTimes(1);
    expect(deleteUser).not.toHaveBeenCalled();
  });
});
