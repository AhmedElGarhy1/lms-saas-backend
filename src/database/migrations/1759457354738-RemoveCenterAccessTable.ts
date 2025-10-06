import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveCenterAccessTable1759457354738
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the user_centers table since center access is now managed through user_roles
    await queryRunner.query(`DROP TABLE IF EXISTS "user_centers"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate the user_centers table if needed to rollback
    await queryRunner.query(`
            CREATE TABLE "user_centers" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" uuid NOT NULL,
                "centerId" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "deletedAt" TIMESTAMP,
                "createdBy" uuid NOT NULL,
                "updatedBy" uuid,
                "deletedBy" uuid,
                CONSTRAINT "PK_user_centers" PRIMARY KEY ("id"),
                CONSTRAINT "FK_user_centers_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_user_centers_center" FOREIGN KEY ("centerId") REFERENCES "centers"("id") ON DELETE CASCADE
            )
        `);

    // Add unique constraint
    await queryRunner.query(`
            ALTER TABLE "user_centers" 
            ADD CONSTRAINT "UQ_user_centers_user_center" UNIQUE ("userId", "centerId")
        `);
  }
}
