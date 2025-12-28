import { MigrationInterface, QueryRunner, TableForeignKey, TableIndex } from 'typeorm';

export class ChangePackageClassRelationship1766934864000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ===== CHANGE FOREIGN KEY: class_packages.groupId -> class_packages.classId =====

    // Drop the existing foreign key to groups
    await queryRunner.dropForeignKey('class_packages', 'FK_class_packages_group');

    // Rename the column from groupId to classId
    await queryRunner.query(`ALTER TABLE "class_packages" RENAME COLUMN "groupId" TO "classId"`);

    // Create new foreign key to classes
    await queryRunner.createForeignKey(
      'class_packages',
      new TableForeignKey({
        columnNames: ['classId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'classes',
        onDelete: 'CASCADE',
        name: 'FK_class_packages_class',
      }),
    );

    // ===== UPDATE INDEX =====
    // Drop old index and create new one
    await queryRunner.dropIndex('class_packages', 'IDX_class_packages_groupId');

    await queryRunner.createIndex(
      'class_packages',
      new TableIndex({
        name: 'IDX_class_packages_classId',
        columnNames: ['classId'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ===== REVERT CHANGES =====

    // Drop the foreign key to classes
    await queryRunner.dropForeignKey('class_packages', 'FK_class_packages_class');

    // Rename the column back from classId to groupId
    await queryRunner.query(`ALTER TABLE "class_packages" RENAME COLUMN "classId" TO "groupId"`);

    // Recreate foreign key to groups
    await queryRunner.createForeignKey(
      'class_packages',
      new TableForeignKey({
        columnNames: ['groupId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'groups',
        onDelete: 'CASCADE',
        name: 'FK_class_packages_group',
      }),
    );

    // Revert index
    await queryRunner.dropIndex('class_packages', 'IDX_class_packages_classId');

    await queryRunner.createIndex(
      'class_packages',
      new TableIndex({
        name: 'IDX_class_packages_groupId',
        columnNames: ['groupId'],
      }),
    );
  }
}
