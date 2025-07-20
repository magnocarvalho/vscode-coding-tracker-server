#!/usr/bin/env node

//@ts-check

"use strict";

/**
 * Teste simples de conexão PostgreSQL
 */

const { Client } = require('pg');

async function testConnection() {
    const client = new Client({
        host: 'localhost',
        port: 5432,
        user: 'postgres', 
        password: 'postgres',
        database: 'postgres'
    });
    
    try {
        console.log('Tentando conectar ao PostgreSQL...');
        await client.connect();
        console.log('✅ Conectado com sucesso!');
        
        const result = await client.query('SELECT version()');
        console.log('Versão do PostgreSQL:', result.rows[0].version);
        
    } catch (error) {
        console.error('❌ Erro ao conectar:', error.message);
        console.log('\nPossíveis soluções:');
        console.log('1. Verificar se PostgreSQL está rodando');
        console.log('2. Verificar credenciais (usuário: postgres, senha: postgres)');
        console.log('3. Verificar se está na porta 5432');
        console.log('4. Criar usuário postgres se não existir');
    } finally {
        await client.end();
    }
}

testConnection();
