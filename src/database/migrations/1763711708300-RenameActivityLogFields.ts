import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class RenameActivityLogFields1763711708300 implements MigrationInterface {
  name = 'RenameActivityLogFields1763711708300';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop old indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ACTIVITY_LOGS_ACTOR_ID"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ACTIVITY_LOGS_ACTOR_CENTER_TYPE_CREATED_AT"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_activity_logs_userId"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_activity_logs_userId_centerId_type_createdAt"`,
    );

    // 2. Drop old foreign key constraints
    const table = await queryRunner.getTable('activity_logs');
    const actorForeignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('actorId') !== -1,
    );
    if (actorForeignKey) {
      await queryRunner.dropForeignKey('activity_logs', actorForeignKey);
    }

    const userForeignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('userId') !== -1 && fk.columnNames.length === 1,
    );
    if (userForeignKey) {
      await queryRunner.dropForeignKey('activity_logs', userForeignKey);
    }

    // 3. Rename actorId to userId (who performed the action)
    await queryRunner.query(
      `ALTER TABLE "activity_logs" RENAME COLUMN "actorId" TO "userId"`,
    );

    // 4. Rename userId to targetUserId (who was affected)
    await queryRunner.query(
      `ALTER TABLE "activity_logs" RENAME COLUMN "userId" TO "targetUserId"`,
    );

    // 5. Add foreign key constraint for userId (who performed action)
    await queryRunner.createForeignKey(
      'activity_logs',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // 6. Add foreign key constraint for targetUserId (who was affected)
    await queryRunner.createForeignKey(
      'activity_logs',
      new TableForeignKey({
        columnNames: ['targetUserId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // 7. Create new indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_ACTIVITY_LOGS_USER_ID" ON "activity_logs" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ACTIVITY_LOGS_TARGET_USER_ID" ON "activity_logs" ("targetUserId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ACTIVITY_LOGS_USER_CENTER_TYPE_CREATED_AT" ON "activity_logs" ("userId", "centerId", "type", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ACTIVITY_LOGS_TARGET_USER_CENTER_TYPE_CREATED_AT" ON "activity_logs" ("targetUserId", "centerId", "type", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop new indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ACTIVITY_LOGS_USER_ID"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ACTIVITY_LOGS_TARGET_USER_ID"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ACTIVITY_LOGS_USER_CENTER_TYPE_CREATED_AT"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ACTIVITY_LOGS_TARGET_USER_CENTER_TYPE_CREATED_AT"`,
    );

    // Drop foreign keys
    const table = await queryRunner.getTable('activity_logs');
    const userIdForeignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('userId') !== -1 && fk.columnNames.length === 1,
    );
    if (userIdForeignKey) {
      await queryRunner.dropForeignKey('activity_logs', userIdForeignKey);
    }

    const targetUserIdForeignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('targetUserId') !== -1,
    );
    if (targetUserIdForeignKey) {
      await queryRunner.dropForeignKey('activity_logs', targetUserIdForeignKey);
    }

    // Rename columns back
    await queryRunner.query(
      `ALTER TABLE "activity_logs" RENAME COLUMN "targetUserId" TO "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activity_logs" RENAME COLUMN "userId" TO "actorId"`,
    );

    // Recreate old foreign keys
    await queryRunner.createForeignKey(
      'activity_logs',
      new TableForeignKey({
        columnNames: ['actorId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'activity_logs',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    // Recreate old indexes
    await queryRunner.query(
      `CREATE INDEX "IDX_ACTIVITY_LOGS_ACTOR_ID" ON "activity_logs" ("actorId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_activity_logs_userId" ON "activity_logs" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ACTIVITY_LOGS_ACTOR_CENTER_TYPE_CREATED_AT" ON "activity_logs" ("actorId", "centerId", "type", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_activity_logs_userId_centerId_type_createdAt" ON "activity_logs" ("userId", "centerId", "type", "createdAt")`,
    );
  }
}

