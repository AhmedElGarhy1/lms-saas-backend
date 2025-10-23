import { ChangePasswordRequestDto } from '../dto/change-password.dto';

export interface ChangePasswordParams {
  userId: string;
  dto: ChangePasswordRequestDto;
  centerId?: string;
}

export interface UserServiceResponse<T = any> {
  data?: T;
  message?: string;
  success: boolean;
}
