import { Injectable } from '@nestjs/common';
import { UserInfo } from '../entities/user-info.entity';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class UserInfoRepository extends BaseRepository<UserInfo> {
  constructor(
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(txHost);
  }

  protected getEntityClass(): typeof UserInfo {
    return UserInfo;
  }

  async findUserInfoByUserId(userId: string): Promise<UserInfo | null> {
    return this.getRepository().findOne({
      where: { userId },
    });
  }

  async updateUserInfo(
    userId: string,
    userInfoData: Partial<UserInfo>,
  ): Promise<void> {
    const userInfo = await this.getRepository().findOne({
      where: { userId },
    });
    if (!userInfo) {
      throw new ResourceNotFoundException(
        'User info not found',
        't.errors.userInfoNotFound',
      );
    }

    await this.getRepository().update(userInfo.id, userInfoData);
  }

  async createUserInfo(
    userId: string,
    userInfoData: Partial<UserInfo>,
  ): Promise<UserInfo> {
    const userInfo = this.getRepository().create({
      ...userInfoData,
      userId,
    });
    return this.getRepository().save(userInfo);
  }

  async deleteUserInfo(userInfoId: string): Promise<void> {
    await this.getRepository().softDelete(userInfoId);
  }
}
