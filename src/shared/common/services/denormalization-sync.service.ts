import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { DataSource } from 'typeorm';

@Injectable()
export class DenormalizationSyncService {
  private readonly logger = new Logger(DenormalizationSyncService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Sync denormalized fields for class_packages when class hierarchy changes
   * Called when: class.branchId changes (centerId is derived from branch)
   */
  @Transactional()
  async syncClassPackageDenormalizedFields(classId?: string): Promise<number> {
    let query = `
      UPDATE class_packages
      SET
        "branchId" = c."branchId",
        "centerId" = c."centerId"
      FROM classes c
      WHERE class_packages."classId" = c.id
    `;

    const params: any[] = [];

    if (classId) {
      query += ' AND c.id = $1';
      params.push(classId);
    }

    const result = await this.dataSource.query(query, params);

    const affectedRows = result[1] || 0; // TypeORM returns [undefined, affectedRows]

    if (affectedRows > 0) {
      this.logger.log(
        `Synced denormalized fields for ${affectedRows} class packages${classId ? ` (class: ${classId})` : ''}`,
      );
    }

    return affectedRows;
  }

  /**
   * Sync denormalized fields for enrollments when session hierarchy changes
   * Called when: session.branchId changes (centerId is derived from branch)
   */
  @Transactional()
  async syncEnrollmentDenormalizedFields(sessionId?: string): Promise<number> {
    let query = `
      UPDATE enrollments
      SET
        "branchId" = s."branchId",
        "centerId" = s."centerId"
      FROM sessions s
      WHERE enrollments."sessionId" = s.id
    `;

    const params: any[] = [];

    if (sessionId) {
      query += ' AND s.id = $1';
      params.push(sessionId);
    }

    const result = await this.dataSource.query(query, params);

    const affectedRows = result[1] || 0;

    if (affectedRows > 0) {
      this.logger.log(
        `Synced denormalized fields for ${affectedRows} enrollments${sessionId ? ` (session: ${sessionId})` : ''}`,
      );
    }

    return affectedRows;
  }

  /**
   * Sync all denormalized fields (expensive - use for initial migration or maintenance)
   */
  @Transactional()
  async syncAllDenormalizedFields(): Promise<{
    packages: number;
    enrollments: number;
  }> {
    this.logger.log('Starting full denormalization sync...');

    const packages = await this.syncClassPackageDenormalizedFields();
    const enrollments = await this.syncEnrollmentDenormalizedFields();

    this.logger.log(
      `Full sync completed: ${packages} packages, ${enrollments} enrollments`,
    );

    return { packages, enrollments };
  }

  /**
   * Validate denormalized data consistency (for monitoring/debugging)
   */
  async validateDenormalizedData(): Promise<{
    invalidPackages: number;
    invalidEnrollments: number;
    totalPackages: number;
    totalEnrollments: number;
  }> {
    // Check class_packages consistency (only branchId and centerId)
    const [invalidPackagesResult] = await this.dataSource.query(`
      SELECT COUNT(*) as count FROM class_packages cp
      LEFT JOIN classes c ON cp."classId" = c.id
      WHERE cp."branchId" != c."branchId"
         OR cp."centerId" != c."centerId"
    `);

    // Check enrollments consistency (only branchId and centerId)
    const [invalidEnrollmentsResult] = await this.dataSource.query(`
      SELECT COUNT(*) as count FROM enrollments e
      LEFT JOIN sessions s ON e."sessionId" = s.id
      WHERE e."branchId" != s."branchId"
         OR e."centerId" != s."centerId"
    `);

    const [totalPackagesResult] = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM class_packages',
    );
    const [totalEnrollmentsResult] = await this.dataSource.query(
      'SELECT COUNT(*) as count FROM enrollments',
    );

    const result = {
      invalidPackages: parseInt(invalidPackagesResult.count) || 0,
      invalidEnrollments: parseInt(invalidEnrollmentsResult.count) || 0,
      totalPackages: parseInt(totalPackagesResult.count) || 0,
      totalEnrollments: parseInt(totalEnrollmentsResult.count) || 0,
    };

    if (result.invalidPackages > 0 || result.invalidEnrollments > 0) {
      this.logger.warn(
        `Data consistency issues found: ${result.invalidPackages}/${result.totalPackages} packages, ${result.invalidEnrollments}/${result.totalEnrollments} enrollments`,
      );
    }

    return result;
  }
}
