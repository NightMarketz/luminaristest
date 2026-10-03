import type { Role } from './Role';
import type { UpdateUserInput } from './contracts/users/UserDto.gen';

export interface IUser {
  id: string;
  name: string | null;
  username: string;
  email: string;
  role: Role;
  locale?: string;
  currency?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// Contrato gerado (users/UserDto) — nunca espelho à mão.
export type UpdateUserDto = UpdateUserInput;
