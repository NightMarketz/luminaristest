import { apiClient } from '../api/api-client';
import { IUser } from '../../types/User';
import type {
  CreateUserInput,
  UpdatePreferencesInput,
  UpdateUserInput,
} from '@/types/contracts/users/UserDto.gen';

interface PaginationMetadata { page: number; limit: number; total: number; hasMore?: boolean; totalPages?: number; totalCount?: number }

/**
 * User Management Service (Client-side).
 */
export const UserService = {
  /**
   * Fetches a paginated list of users.
   * Backend returns the flat shape { data, total, page, pageSize }; this adapter rebuilds the
   * `pagination` object the pages consume so callers stay unchanged.
   */
  async getUsers(page: number, limit: number): Promise<{ data: IUser[], pagination: PaginationMetadata }> {
    const res = await apiClient.get<{ data: IUser[], total: number, page: number, pageSize: number }>(
      `/users?page=${page}&limit=${limit}`
    );
    return {
      data: res.data,
      pagination: {
        page: res.page,
        limit: res.pageSize,
        total: res.total,
        totalCount: res.total,
        totalPages: Math.ceil(res.total / (res.pageSize || limit)),
      },
    };
  },

  /**
   * Creates a new user.
   */
  async createUser(payload: CreateUserInput): Promise<IUser> {
    return apiClient.post<IUser>('/users', payload);
  },

  /**
   * Updates a user profile.
   */
  async updateProfile(userId: string, data: UpdateUserInput): Promise<IUser> {
    const response = await apiClient.put<{ success: boolean; data?: IUser; id?: string }>(`/users/${userId}`, data);
    return (response as { data?: IUser }).data || (response as unknown as IUser);
  },

  /**
   * Fetches a single user by ID.
   */
  async getUserById(userId: string): Promise<IUser> {
    const response = await apiClient.get<{ data: IUser } | IUser>(`/users/${userId}`);
    return (response as { data?: IUser }).data || (response as IUser);
  },

  /**
   * Deletes a user by ID.
   */
  async deleteUser(userId: string): Promise<void> {
    return apiClient.delete(`/users/${userId}`);
  },

  /**
   * Specialized method to change user role (ADMIN test feature).
   */
  async changeRole(userId: string, role: string): Promise<IUser> {
    return this.updateProfile(userId, { role: role as NonNullable<UpdateUserInput['role']> });
  },

  /**
   * Updates the authenticated user's locale/currency preferences.
   */
  async updatePreferences(data: UpdatePreferencesInput): Promise<{ success: boolean; data: IUser }> {
    return apiClient.patch('/users/me/preferences', data);
  },
};
