import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSessions1792890031723 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE "session" (
        "sid" varchar PRIMARY KEY,
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
        )
    `);
    await queryRunner.query(
        `CREATE INDEX "IDX_session_expire" ON "session" ("expire")`,
    );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "session"`);
    }


}
