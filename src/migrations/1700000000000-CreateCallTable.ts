import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCallTable1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'calls',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'callerId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'recipientId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '50',
            default: "'pending'",
          },
          {
            name: 'duration',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
        indices: [
          {
            name: 'IDX_CALL_STATUS',
            columnNames: ['status'],
          },
          {
            name: 'IDX_CALL_CREATED_AT',
            columnNames: ['createdAt'],
          },
          {
            name: 'IDX_CALL_CALLER_ID',
            columnNames: ['callerId'],
          },
        ],
      }),
      true,
    );

    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('calls');
  }
}
