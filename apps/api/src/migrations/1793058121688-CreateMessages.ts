import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMessages1793058121688 implements MigrationInterface {
    name = 'CreateMessages1793058121688'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "senderId" uuid NOT NULL, "recipientId" uuid NOT NULL, "clientMessageId" uuid NOT NULL, "content" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_80f6b2235e14899014e4e7f2f1" ON "messages"  ("senderId", "clientMessageId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_80f6b2235e14899014e4e7f2f1"`);
        await queryRunner.query(`DROP TABLE "messages"`);
    }

}
