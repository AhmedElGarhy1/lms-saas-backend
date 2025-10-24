import { Injectable } from '@nestjs/common';
import { UserInfo } from '../entities/user-info.entity';
import { LoggerService } from 'src/shared/services/logger.service';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import { Transactional, Propagation } from '@nestjs-cls/transactional';
import { UserInfoRepository } from '../repositories/user-info.repository';

@Injectable()
export class UserInfoService {
  constructor(
    private readonly logger: LoggerService,
    private readonly userInfoRepository: UserInfoRepository,
  ) {}

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
