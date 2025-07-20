//@ts-check

require('dotenv').config();
require('reflect-metadata');
const { createConnection } = require('typeorm');
const CodingActivity = require('./entities/CodingActivity');
const log = require('../Log');

let connection = null;

/**
 * Configuração do banco de dados
 */
const dbConfig = {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'coding_tracker',
    entities: [CodingActivity],
    synchronize: true, // Em produção, usar migrations
    logging: process.env.NODE_ENV === 'development',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

/**
 * Conecta ao banco de dados
 */
async function connect() {
    if (connection && connection.isConnected) {
        return connection;
    }

    try {
        connection = await createConnection(dbConfig);
        log.success('Conectado ao banco de dados PostgreSQL');
        return connection;
    } catch (error) {
        log.error('Erro ao conectar com o banco de dados:', error.message);
        throw error;
    }
}

/**
 * Desconecta do banco de dados
 */
async function disconnect() {
    if (connection && connection.isConnected) {
        await connection.close();
        connection = null;
        log.info('Desconectado do banco de dados');
    }
}

/**
 * Retorna a conexão atual
 */
function getConnection() {
    if (!connection || !connection.isConnected) {
        throw new Error('Banco de dados não conectado');
    }
    return connection;
}

/**
 * Retorna o repositório da entidade CodingActivity
 */
function getCodingActivityRepository() {
    return getConnection().getRepository('CodingActivity');
}

module.exports = {
    connect,
    disconnect,
    getConnection,
    getCodingActivityRepository,
    dbConfig
};
