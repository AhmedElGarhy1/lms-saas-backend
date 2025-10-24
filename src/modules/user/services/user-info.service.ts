import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserInfo } from '../entities/user-info.entity';
import { LoggerService } from 'src/shared/services/logger.service';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';

@Injectable()
export class UserInfoService {
  constructor(
    @InjectRepository(UserInfo)
    private readonly userInfoRepository: Repository<UserInfo>,
    private readonly logger: LoggerService,
  ) {}

  // User info CRUD methods
  async findUserInfoByUserId(userId: string): Promise<UserInfo | null> {
    return this.userInfoRepository.findOne({
      where: { userId },
    });
  }

  async updateUserInfo(
    userId: string,
    userInfoData: Partial<UserInfo>,
  ): Promise<void> {
    const userInfo = await this.userInfoRepository.findOne({
      where: { userId },
    });
    if (!userInfo) {
      throw new ResourceNotFoundException('User info not found');
    }

    await this.userInfoRepository.update(userInfo.id, userInfoData);
  }

  async createUserInfo(
    userId: string,
    userInfoData: Partial<UserInfo>,
  ): Promise<UserInfo> {
    const userInfo = this.userInfoRepository.create({
      ...userInfoData,
      userId,
    });
    return this.userInfoRepository.save(userInfo);
  }

  async deleteUserInfo(userInfoId: string): Promise<void> {
    await this.userInfoRepository.softDelete(userInfoId);
  }
}
