import { apiClient } from '../api/api-client';
import { IUser } from '../../types/User';
import type { CreateUserInput, LoginInput } from '@/types/contracts/users/UserDto.gen';

/**
 * Authentication Service (Client-side).
 * Handles login, signup, and potentially logout/refresh logic.
 * Request bodies are the generated contract (`@/types/contracts/users/UserDto.gen`) — nunca espelho à mão.
 */
export const AuthService = {
  /**
   * Performs user login.
   * Returns the user object and the JWT token.
   */
  async login(formData: LoginInput): Promise<{ data: { user: IUser; token: string } }> {
    return apiClient.post<{ data: { user: IUser; token: string } }>('/auth/login', formData);
  },

  /**
   * Performs user registration (signup).
   */
  async signup(formData: CreateUserInput): Promise<{ data: { user: IUser; token: string } }> {
    return apiClient.post<{ data: { user: IUser; token: string } }>('/users', formData);
  },
};
