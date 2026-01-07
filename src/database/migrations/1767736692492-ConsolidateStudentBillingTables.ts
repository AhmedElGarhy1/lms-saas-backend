import { MigrationInterface, QueryRunner } from "typeorm";

export class ConsolidateStudentBillingTables1767736692492 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create the unified student_charges table
        await queryRunner.query(`
            CREATE TABLE "student_charges" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "studentUserProfileId" uuid NOT NULL,
                "chargeType" character varying NOT NULL CHECK ("chargeType" IN ('SESSION', 'SUBSCRIPTION', 'CLASS')),
                "centerId" uuid NOT NULL,
                "branchId" uuid NOT NULL,
                "classId" uuid NOT NULL,
                "amount" numeric(10,2) NOT NULL,
                "paymentSource" character varying NOT NULL CHECK ("paymentSource" IN ('WALLET', 'CASH')),
                "paymentId" uuid,
                "status" character varying NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'COMPLETED', 'REFUNDED', 'CANCELLED')),
                "sessionId" uuid,
                "month" integer,
                "year" integer,
                "refundedAt" TIMESTAMPTZ,
                "refundReason" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP,
                CONSTRAINT "PK_student_charges" PRIMARY KEY ("id")
            )
        `);

        // Create indexes for performance
        await queryRunner.query(`
            CREATE INDEX "IDX_student_charges_student" ON "student_charges" ("studentUserProfileId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_student_charges_type" ON "student_charges" ("chargeType")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_student_charges_center" ON "student_charges" ("centerId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_student_charges_branch" ON "student_charges" ("branchId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_student_charges_class" ON "student_charges" ("classId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_student_charges_session" ON "student_charges" ("sessionId")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_student_charges_month_year" ON "student_charges" ("month", "year")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_student_charges_status" ON "student_charges" ("status")
        `);

        // Migrate student_session_charges data
        await queryRunner.query(`
            INSERT INTO "student_charges" (
                "id", "studentUserProfileId", "chargeType", "centerId", "branchId", "classId", "amount",
                "paymentSource", "paymentId", "status", "sessionId",
                "createdAt", "updatedAt"
            )
            SELECT
                ssc."id", ssc."studentUserProfileId", 'SESSION'::varchar, s."centerId", s."branchId", ssc."classId", ssc."amount",
                ssc."paymentSource", ssc."paymentId",
                CASE
                    WHEN ssc."status" = 'PAID' THEN 'COMPLETED'::varchar
                    ELSE ssc."status"
                END,
                ssc."sessionId", ssc."createdAt", ssc."updatedAt"
            FROM "student_session_charges" ssc
            LEFT JOIN "sessions" s ON s."id" = ssc."sessionId"
        `);

        // Migrate student_class_subscriptions data
        await queryRunner.query(`
            INSERT INTO "student_charges" (
                "id", "studentUserProfileId", "chargeType", "centerId", "branchId", "classId", "amount",
                "paymentSource", "paymentId", "status", "month", "year",
                "createdAt", "updatedAt"
            )
            SELECT
                scs."id", scs."studentUserProfileId", 'SUBSCRIPTION'::varchar,
                c."centerId", c."branchId", scs."classId", COALESCE(sps."monthPrice", 0), -- Get price from strategy
                scs."paymentSource", scs."paymentId",
                CASE
                    WHEN scs."status" = 'ACTIVE' THEN 'COMPLETED'::varchar
                    WHEN scs."status" = 'EXPIRED' THEN 'COMPLETED'::varchar
                    ELSE scs."status"
                END,
                scs."month", scs."year", scs."createdAt", scs."updatedAt"
            FROM "student_class_subscriptions" scs
            LEFT JOIN "student_payment_strategies" sps ON sps."classId" = scs."classId"
            LEFT JOIN "classes" c ON c."id" = scs."classId"
        `);

        // Migrate student_class_charges data
        await queryRunner.query(`
            INSERT INTO "student_charges" (
                "id", "studentUserProfileId", "chargeType", "centerId", "branchId", "classId", "amount",
                "paymentSource", "paymentId", "status",
                "createdAt", "updatedAt"
            )
            SELECT
                scc."id", scc."studentUserProfileId", 'CLASS'::varchar, c."centerId", c."branchId", scc."classId", scc."amount",
                scc."paymentSource", scc."paymentId",
                CASE
                    WHEN scc."status" = 'PAID' THEN 'COMPLETED'::varchar
                    ELSE scc."status"
                END,
                scc."createdAt", scc."updatedAt"
            FROM "student_class_charges" scc
            LEFT JOIN "classes" c ON c."id" = scc."classId"
        `);

        // Migrate refund data from student_billing_records
        await queryRunner.query(`
            UPDATE "student_charges" sc
            SET "refundedAt" = sbr."refundedAt", "refundReason" = sbr."refundReason", "status" = 'REFUNDED'::varchar
            FROM "student_billing_records" sbr
            WHERE sc."id" = sbr."refId" AND sbr."status" = 'REFUNDED'
        `);

        // Drop old tables
        await queryRunner.query(`DROP TABLE "student_session_charges"`);
        await queryRunner.query(`DROP TABLE "student_class_subscriptions"`);
        await queryRunner.query(`DROP TABLE "student_class_charges"`);
        await queryRunner.query(`DROP TABLE "student_billing_records"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Recreate the old tables (simplified - would need full schema recreation in production)
        await queryRunner.query(`
            CREATE TABLE "student_session_charges" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "studentUserProfileId" uuid NOT NULL,
                "sessionId" uuid NOT NULL,
                "classId" uuid NOT NULL,
                "amount" numeric(10,2) NOT NULL,
                "paymentSource" character varying NOT NULL,
                "paymentId" uuid,
                "status" character varying NOT NULL DEFAULT 'PAID',
                "paidAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP,
                CONSTRAINT "PK_student_session_charges" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "student_class_subscriptions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "studentUserProfileId" uuid NOT NULL,
                "classId" uuid NOT NULL,
                "month" integer NOT NULL,
                "year" integer NOT NULL,
                "status" character varying NOT NULL DEFAULT 'ACTIVE',
                "paymentSource" character varying NOT NULL,
                "paymentId" uuid,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP,
                CONSTRAINT "PK_student_class_subscriptions" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "student_class_charges" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "studentUserProfileId" uuid NOT NULL,
                "classId" uuid NOT NULL,
                "amount" numeric(10,2) NOT NULL,
                "paymentSource" character varying NOT NULL,
                "paymentId" uuid,
                "status" character varying NOT NULL DEFAULT 'PAID',
                "paidAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP,
                CONSTRAINT "PK_student_class_charges" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "student_billing_records" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "studentUserProfileId" uuid NOT NULL,
                "type" character varying NOT NULL,
                "refId" uuid NOT NULL,
                "classId" uuid NOT NULL,
                "branchId" uuid NOT NULL,
                "centerId" uuid NOT NULL,
                "paymentSource" character varying NOT NULL,
                "status" character varying NOT NULL DEFAULT 'PENDING',
                "amount" numeric(12,2) NOT NULL,
                "paymentId" uuid,
                "refundedAt" TIMESTAMPTZ,
                "refundReason" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "month" integer,
                "year" integer,
                CONSTRAINT "PK_student_billing_records" PRIMARY KEY ("id")
            )
        `);

        // Migrate data back (simplified - production would need careful data mapping)
        await queryRunner.query(`
            INSERT INTO "student_session_charges"
            SELECT "id", "studentUserProfileId", "sessionId", "classId", "amount",
                   "paymentSource", "paymentId",
                   CASE WHEN "status" = 'COMPLETED' THEN 'PAID' ELSE "status" END,
                   NULL, "createdAt", "updatedAt"
            FROM "student_charges" WHERE "chargeType" = 'SESSION'
        `);

        await queryRunner.query(`
            INSERT INTO "student_class_subscriptions"
            SELECT "id", "studentUserProfileId", "classId", "month", "year",
                   CASE WHEN "status" = 'COMPLETED' THEN 'ACTIVE' ELSE "status" END,
                   "paymentSource", "paymentId", "createdAt", "updatedAt"
            FROM "student_charges" WHERE "chargeType" = 'SUBSCRIPTION'
        `);

        await queryRunner.query(`
            INSERT INTO "student_class_charges"
            SELECT "id", "studentUserProfileId", "classId", "amount",
                   "paymentSource", "paymentId",
                   CASE WHEN "status" = 'COMPLETED' THEN 'PAID' ELSE "status" END,
                   NULL, "createdAt", "updatedAt"
            FROM "student_charges" WHERE "chargeType" = 'CLASS'
        `);

        await queryRunner.query(`
            INSERT INTO "student_billing_records"
            SELECT "id", "studentUserProfileId",
                   CASE WHEN "chargeType" = 'SUBSCRIPTION' THEN 'MONTHLY'
                        WHEN "chargeType" = 'SESSION' THEN 'SESSION'
                        WHEN "chargeType" = 'CLASS' THEN 'CLASS' END,
                   "id", "classId", 'branch-placeholder', 'center-placeholder',
                   "paymentSource", "status", "amount", "paymentId",
                   "refundedAt", "refundReason", "createdAt", "month", "year"
            FROM "student_charges"
        `);

        // Drop the unified table
        await queryRunner.query(`DROP TABLE "student_charges"`);
    }

}
