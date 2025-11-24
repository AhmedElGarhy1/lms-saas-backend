import { Injectable, Logger } from '@nestjs/common';
import { AdminRepository } from '../repositories/admin.repository';
import { UserService } from '@/modules/user/services/user.service';
import { AccessControlHelperService } from '@/modules/access-control/services/access-control-helper.service';
import { PaginateAdminDto } from '../dto/paginate-admin.dto';
import { ActorUser } from '@/shared/common/types/actor-user.type';
import { User } from '@/modules/user/entities/user.entity';
import { BaseService } from '@/shared/common/services/base.service';
import { ResourceNotFoundException } from '@/shared/common/exceptions/custom.exceptions';
import { I18nService } from 'nestjs-i18n';
import { I18nTranslations } from '@/generated/i18n.generated';

@Injectable()
export class AdminService extends BaseService {
  private readonly logger: Logger = new Logger(AdminService.name);

  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly userService: UserService,
    private readonly accessControlHelperService: AccessControlHelperService,
    private readonly i18n: I18nService<I18nTranslations>,
  ) {
    super();
  }

  async paginateAdmins(params: PaginateAdminDto, actor: ActorUser) {
    const centerId = params.centerId ?? actor.centerId;
    params.centerId = centerId;
    return this.userService.paginateAdmins(params, actor);
  }

  async findOne(userProfileId: string, actor: ActorUser): Promise<User> {
    const user = await this.userService.findUserByProfileId(
      userProfileId,
      actor,
    );
    if (!user) {
      throw new ResourceNotFoundException(
        this.i18n.translate('t.errors.userNotFound'),
      );
    }
    return user;
  }
}
