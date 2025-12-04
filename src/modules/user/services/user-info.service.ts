import { Injectable } from '@nestjs/common';
import { UserInfo } from '../entities/user-info.entity';
import { UserInfoRepository } from '../repositories/user-info.repository';
import { BaseService } from '@/shared/common/services/base.service';

@Injectable()
export class UserInfoService extends BaseService {
  constructor(private readonly userInfoRepository: UserInfoRepository) {
    super();
  }

  // User info CRUD methods
  async findUserInfoByUserId(userId: string): Promise<UserInfo | null> {
    return this.userInfoRepository.findUserInfoByUserId(userId);
  }

  async updateUserInfo(
    userId: string,
    userInfoData: Partial<UserInfo>,
  ): Promise<void> {
    return this.userInfoRepository.updateUserInfo(userId, userInfoData);
  }

  async createUserInfo(
    userId: string,
    userInfoData: Partial<UserInfo>,
  ): Promise<UserInfo> {
    return this.userInfoRepository.createUserInfo(userId, userInfoData);
  }

  async deleteUserInfo(userInfoId: string): Promise<void> {
    return this.userInfoRepository.deleteUserInfo(userInfoId);
  }
}
