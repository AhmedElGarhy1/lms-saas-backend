import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration to remove soft delete from ProfileRole entity
 * ProfileRole should use hard delete for access control integrity
 */
export class RemoveProfileRoleSoftDelete20260126195533
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Drop the existing unique index with WHERE clause
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_profile_roles_userProfileId_centerId_roleId";`,
    );

    // Step 2: Hard delete any soft-deleted ProfileRole records
    // This ensures data integrity - deleted role assignments should be permanently removed
    await queryRunner.query(
      `DELETE FROM "profile_roles" WHERE "deletedAt" IS NOT NULL;`,
    );

    // Step 3: Drop the soft delete columns
    await queryRunner.query(
      `ALTER TABLE "profile_roles" DROP COLUMN IF EXISTS "deletedAt";`,
    );
    await queryRunner.query(
      `ALTER TABLE "profile_roles" DROP COLUMN IF EXISTS "deletedByProfileId";`,
    );

    // Step 4: Create new unique index without WHERE clause
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_profile_roles_userProfileId_centerId_roleId" 
       ON "profile_roles" ("userProfileId", "centerId", "roleId");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Drop the unique index without WHERE clause
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_profile_roles_userProfileId_centerId_roleId";`,
    );

    // Step 2: Add back the soft delete columns
    await queryRunner.query(
      `ALTER TABLE "profile_roles" 
       ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP WITH TIME ZONE,
       ADD COLUMN IF NOT EXISTS "deletedByProfileId" UUID;`,
    );

    // Step 3: Create unique index with WHERE clause
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_profile_roles_userProfileId_centerId_roleId" 
       ON "profile_roles" ("userProfileId", "centerId", "roleId") 
       WHERE "deletedAt" IS NULL;`,
    );

    // Note: We cannot restore the soft-deleted records that were hard deleted in the up migration
    // This is intentional - deleted role assignments should remain deleted
  }
}
