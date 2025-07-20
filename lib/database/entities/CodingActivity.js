//@ts-check

const { EntitySchema } = require('typeorm');

/**
 * CodingActivity Entity - representa os dados de rastreamento de codificação
 */
const CodingActivity = new EntitySchema({
    name: 'CodingActivity',
    tableName: 'coding_activities',
    columns: {
        id: {
            type: 'int',
            primary: true,
            generated: true
        },
        type: {
            type: 'int',
            comment: '0=open, 1=look, 2=code'
        },
        time: {
            type: 'bigint',
            comment: 'timestamp em milliseconds'
        },
        duration: {
            type: 'int',
            comment: 'duração em milliseconds'
        },
        language: {
            type: 'varchar',
            length: 100,
            nullable: true
        },
        file: {
            type: 'text',
            nullable: true
        },
        project: {
            type: 'text',
            nullable: true
        },
        computer_id: {
            type: 'varchar',
            length: 100,
            nullable: true
        },
        vcs_type: {
            type: 'varchar',
            length: 50,
            nullable: true
        },
        vcs_repo: {
            type: 'text',
            nullable: true
        },
        vcs_branch: {
            type: 'varchar',
            length: 200,
            nullable: true
        },
        line: {
            type: 'int',
            default: 0
        },
        char: {
            type: 'int',
            default: 0
        },
        created_at: {
            type: 'timestamp',
            default: () => 'CURRENT_TIMESTAMP'
        }
    },
    indices: [
        {
            name: 'IDX_TIME',
            columns: ['time']
        },
        {
            name: 'IDX_PROJECT',
            columns: ['project']
        },
        {
            name: 'IDX_LANGUAGE',
            columns: ['language']
        },
        {
            name: 'IDX_COMPUTER_ID',
            columns: ['computer_id']
        },
        {
            name: 'IDX_CREATED_AT',
            columns: ['created_at']
        }
    ]
});

module.exports = CodingActivity;
