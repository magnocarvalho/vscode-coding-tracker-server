#!/usr/bin/env node

//@ts-check

"use strict";

/**
 * Script para configurar o banco de dados PostgreSQL
 * Cria o banco de dados e usuário se não existirem
 */

const { Client } = require('pg');
const log = require('./lib/Log');

require('dotenv').config();

const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: 'postgres' // Conecta primeiro ao postgres para criar o banco
};

const dbName = process.env.DB_DATABASE || 'coding_tracker';

async function setupDatabase() {
    const client = new Client(config);
    
    try {
        await client.connect();
        log.success('Conectado ao PostgreSQL');

        // Verifica se o banco existe
        const dbResult = await client.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [dbName]
        );

        if (dbResult.rows.length === 0) {
            log.info(`Criando banco de dados: ${dbName}`);
            await client.query(`CREATE DATABASE "${dbName}"`);
            log.success(`Banco de dados ${dbName} criado com sucesso`);
        } else {
            log.info(`Banco de dados ${dbName} já existe`);
        }

    } catch (error) {
        log.error('Erro ao configurar banco de dados:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

async function testConnection() {
    const testConfig = {
        ...config,
        database: dbName
    };

    const client = new Client(testConfig);
    
    try {
        await client.connect();
        log.success(`Conexão com ${dbName} testada com sucesso`);
        
        // Testa se consegue criar uma tabela simples
        await client.query(`
            CREATE TABLE IF NOT EXISTS connection_test (
                id SERIAL PRIMARY KEY,
                test_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await client.query('DROP TABLE connection_test');
        log.success('Permissões de criação de tabela verificadas');
        
    } catch (error) {
        log.error('Erro ao testar conexão:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

async function main() {
    log.info('Configurando banco de dados PostgreSQL...');
    log.info(`Host: ${config.host}:${config.port}`);
    log.info(`Usuário: ${config.user}`);
    log.info(`Banco: ${dbName}`);
    
    await setupDatabase();
    await testConnection();
    
    log.success('Configuração do banco de dados concluída!');
    log.info('\nPróximos passos:');
    log.info('1. Copie .env.example para .env e configure as variáveis');
    log.info('2. Execute: node migrate-to-postgres.js ./database (se tiver dados antigos)');
    log.info('3. Inicie o servidor normalmente');
}

if (require.main === module) {
    main().catch(error => {
        console.error('Erro fatal:', error);
        process.exit(1);
    });
}
