const fs = require('fs');

// Simple repository updates
const updates = [
  {
    file: 'src/modules/access-control/repositories/center-access.repository.ts',
    entity: 'CenterAccess',
  },
  {
    file: 'src/modules/access-control/repositories/role-permission.repository.ts',
    entity: 'RolePermission',
  },
  {
    file: 'src/modules/access-control/repositories/user-access.repository.ts',
    entity: 'UserAccess',
  },
  {
    file: 'src/modules/centers/repositories/branches.repository.ts',
    entity: 'Branch',
  },
  {
    file: 'src/modules/centers/repositories/centers.repository.ts',
    entity: 'Center',
  },
  {
    file: 'src/shared/modules/activity-log/repositories/activity-log.repository.ts',
    entity: 'ActivityLog',
  },
];

const template = (entityName) => `import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { BaseRepository } from '@/shared/common/repositories/base.repository';
import { ${entityName} } from '../entities/${entityName.toLowerCase()}.entity';
import { LoggerService } from '@/shared/services/logger.service';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';

@Injectable()
export class ${entityName}Repository extends BaseRepository<${entityName}> {
  constructor(
    protected readonly logger: LoggerService,
    protected readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super(logger, txHost);
  }

  protected getEntityClass(): typeof ${entityName} {
    return ${entityName};
  }
}`;

updates.forEach(({ file, entity }) => {
  try {
    fs.writeFileSync(file, template(entity));
    console.log(`✅ Updated ${file}`);
  } catch (error) {
    console.error(`❌ Error updating ${file}:`, error.message);
  }
});

console.log('🎉 All repositories updated!');
