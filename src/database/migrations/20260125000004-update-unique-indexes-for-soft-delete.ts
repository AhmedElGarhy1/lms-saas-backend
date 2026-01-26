import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to update unique constraints to partial unique indexes
 * that only apply to non-deleted records (WHERE "deletedAt" IS NULL)
 *
 * This allows the same unique value to exist for both deleted and non-deleted records,
 * which is essential for soft delete functionality.
 */
export class UpdateUniqueIndexesForSoftDelete20260125000004
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old unique constraints/indexes and create new partial unique indexes
    // We use a robust approach that finds constraints by columns, not by name

    // Helper function to drop unique constraint by finding it via columns
    const dropUniqueByColumns = async (
      tableName: string,
      columns: string[],
    ) => {
      // Find unique constraint by matching columns
      const constraints = (await queryRunner.query(
        `
        SELECT conname
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = $1
        AND c.contype = 'u'
        AND array_length(c.conkey, 1) = $2
        AND (
          SELECT array_agg(a.attname::text ORDER BY a.attnum)
          FROM pg_attribute a
          WHERE a.attrelid = c.conrelid
          AND a.attnum = ANY(c.conkey)
        ) = $3::text[]
      `,
        [tableName, columns.length, `{${columns.join(',')}}`],
      )) as Array<{ conname: string }>;

      for (const constraint of constraints) {
        const constraintName: string = constraint.conname;
        await queryRunner.query(
          `ALTER TABLE "${tableName}" DROP CONSTRAINT IF EXISTS "${constraintName}";`,
        );
      }

      // Also try to drop common index name patterns
      const indexPatterns = [
        `IDX_${tableName}_${columns.join('_')}`,
        `UQ_${tableName}_${columns.join('_')}`,
      ];

      for (const indexName of indexPatterns) {
        await queryRunner.query(`DROP INDEX IF EXISTS "${indexName}";`);
      }
    };

    // 1. Users table - phone unique constraint
    await dropUniqueByColumns('users', ['phone']);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_phone" 
      ON "users" ("phone") 
      WHERE "deletedAt" IS NULL;
    `);

    // 2. User profiles table - code unique constraint
    await dropUniqueByColumns('user_profiles', ['code']);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_user_profiles_code" 
      ON "user_profiles" ("code") 
      WHERE "deletedAt" IS NULL;
    `);

    // 3. Centers table - email unique constraint (with existing WHERE clause)
    await dropUniqueByColumns('centers', ['email']);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_centers_email" 
      ON "centers" ("email") 
      WHERE "email" IS NOT NULL AND "deletedAt" IS NULL;
    `);

    // 4. Centers table - phone unique constraint (with existing WHERE clause)
    await dropUniqueByColumns('centers', ['phone']);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_centers_phone" 
      ON "centers" ("phone") 
      WHERE "phone" IS NOT NULL AND "deletedAt" IS NULL;
    `);

    // 5. Classes table - composite unique constraint (name, centerId, branchId)
    await dropUniqueByColumns('classes', ['name', 'centerId', 'branchId']);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_classes_name_centerId_branchId" 
      ON "classes" ("name", "centerId", "branchId") 
      WHERE "deletedAt" IS NULL;
    `);

    // 6. Groups table - composite unique constraint (name, classId)
    await dropUniqueByColumns('groups', ['name', 'classId']);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_groups_name_classId" 
      ON "groups" ("name", "classId") 
      WHERE "deletedAt" IS NULL;
    `);

    // 7. Levels table - composite unique constraint (name, centerId)
    await dropUniqueByColumns('levels', ['name', 'centerId']);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_levels_name_centerId" 
      ON "levels" ("name", "centerId") 
      WHERE "deletedAt" IS NULL;
    `);

    // 8. Subjects table - composite unique constraint (name, centerId)
    await dropUniqueByColumns('subjects', ['name', 'centerId']);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_subjects_name_centerId" 
      ON "subjects" ("name", "centerId") 
      WHERE "deletedAt" IS NULL;
    `);

    // 9. Roles table - composite unique constraint (name, centerId)
    await dropUniqueByColumns('roles', ['name', 'centerId']);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_roles_name_centerId" 
      ON "roles" ("name", "centerId") 
      WHERE "deletedAt" IS NULL;
    `);

    // 10. Center access table - composite unique constraint (userProfileId, centerId)
    await dropUniqueByColumns('center_access', ['userProfileId', 'centerId']);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_center_access_userProfileId_centerId" 
      ON "center_access" ("userProfileId", "centerId") 
      WHERE "deletedAt" IS NULL;
    `);

    // 11. Profile roles table - composite unique constraint (userProfileId, centerId, roleId)
    await dropUniqueByColumns('profile_roles', [
      'userProfileId',
      'centerId',
      'roleId',
    ]);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_profile_roles_userProfileId_centerId_roleId" 
      ON "profile_roles" ("userProfileId", "centerId", "roleId") 
      WHERE "deletedAt" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop partial unique indexes and recreate standard unique indexes

    // 1. Users table
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_phone";`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_phone" ON "users" ("phone");
    `);

    // 2. User profiles table
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_profiles_code";`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_user_profiles_code" ON "user_profiles" ("code");
    `);

    // 3. Centers table - email
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_centers_email";`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_centers_email" 
      ON "centers" ("email") 
      WHERE "email" IS NOT NULL;
    `);

    // 4. Centers table - phone
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_centers_phone";`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_centers_phone" 
      ON "centers" ("phone") 
      WHERE "phone" IS NOT NULL;
    `);

    // 5. Classes table
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_classes_name_centerId_branchId";`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_classes_name_centerId_branchId" 
      ON "classes" ("name", "centerId", "branchId");
    `);

    // 6. Groups table
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_groups_name_classId";`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_groups_name_classId" 
      ON "groups" ("name", "classId");
    `);

    // 7. Levels table
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_levels_name_centerId";`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_levels_name_centerId" 
      ON "levels" ("name", "centerId");
    `);

    // 8. Subjects table
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_subjects_name_centerId";`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_subjects_name_centerId" 
      ON "subjects" ("name", "centerId");
    `);

    // 9. Roles table
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_roles_name_centerId";`);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_roles_name_centerId" 
      ON "roles" ("name", "centerId");
    `);

    // 10. Center access table
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_center_access_userProfileId_centerId";`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_center_access_userProfileId_centerId" 
      ON "center_access" ("userProfileId", "centerId");
    `);

    // 11. Profile roles table
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_profile_roles_userProfileId_centerId_roleId";`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_profile_roles_userProfileId_centerId_roleId" 
      ON "profile_roles" ("userProfileId", "centerId", "roleId");
    `);
  }
}
