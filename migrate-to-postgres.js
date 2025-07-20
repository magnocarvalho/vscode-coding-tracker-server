#!/usr/bin/env node

//@ts-check

"use strict";

/**
 * Script para migrar dados dos arquivos antigos para PostgreSQL
 * Uso: node migrate-to-postgres.js <databaseFolder>
 */

const fs = require('fs');
const path = require('path');
const log = require('./lib/Log');
const Database = require('./lib/database/Database');

const TYPE_NAMES = { 0: 'open', 1: 'look', 2: 'code' };
const EMPTY_VCS = '::';

/**
 * Processa um arquivo de dados antigo
 * @param {string} filePath - Caminho para o arquivo
 */
async function processFile(filePath) {
    const fileName = path.basename(filePath);
    log.info(`Processando arquivo: ${fileName}`);

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/[\n\r]+/);
    
    if (lines.length === 0) {
        log.info(`Arquivo vazio: ${fileName}`);
        return { processed: 0, errors: 0 };
    }

    // Primeira linha deve conter a versão
    const version = lines[0].trim();
    if (!version.match(/^[34]\.0$/)) {
        log.error(`Versão não suportada no arquivo ${fileName}: ${version}`);
        return { processed: 0, errors: 1 };
    }

    const repository = Database.getCodingActivityRepository();
    let processed = 0;
    let errors = 0;

    // Processa cada linha de dados
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
            const activity = parseLine(line, version);
            if (activity) {
                await repository.save(activity);
                processed++;
            }
        } catch (error) {
            log.error(`Erro ao processar linha ${i} do arquivo ${fileName}: ${error.message}`);
            errors++;
        }
    }

    log.success(`Arquivo ${fileName}: ${processed} registros processados, ${errors} erros`);
    return { processed, errors };
}

/**
 * Faz o parse de uma linha de dados
 * @param {string} line - Linha de dados
 * @param {string} version - Versão do formato
 */
function parseLine(line, version) {
    const parts = line.split(' ');
    
    if (version === '3.0' && parts.length < 7) {
        throw new Error('Formato inválido para versão 3.0');
    }
    if (version === '4.0' && parts.length < 12) {
        throw new Error('Formato inválido para versão 4.0');
    }

    const activity = {
        type: parseInt(parts[0]),
        time: parseInt(parts[1]),
        duration: parseInt(parts[2]),
        language: decodeURIComponent(parts[3] || ''),
        file: decodeURIComponent(parts[4] || ''),
        project: decodeURIComponent(parts[5] || ''),
        computer_id: decodeURIComponent(parts[6] || ''),
        line: 0,
        char: 0,
        vcs_type: '',
        vcs_repo: '',
        vcs_branch: ''
    };

    // Para versão 4.0, extrair informações adicionais
    if (version === '4.0' && parts.length >= 12) {
        const vcsInfo = parts[7] || EMPTY_VCS;
        const vcsParts = vcsInfo.split(':');
        
        activity.vcs_type = decodeURIComponent(vcsParts[0] || '');
        activity.vcs_repo = decodeURIComponent(vcsParts[1] || '');
        activity.vcs_branch = decodeURIComponent(vcsParts[2] || '');
        activity.line = parseInt(parts[8]) || 0;
        activity.char = parseInt(parts[9]) || 0;
    }

    // Validações básicas
    if (isNaN(activity.type) || isNaN(activity.time) || isNaN(activity.duration)) {
        throw new Error('Dados numéricos inválidos');
    }

    return activity;
}

/**
 * Função principal
 */
async function main() {
    const databaseFolder = process.argv[2];
    
    if (!databaseFolder) {
        console.error('Uso: node migrate-to-postgres.js <databaseFolder>');
        process.exit(1);
    }

    if (!fs.existsSync(databaseFolder) || !fs.statSync(databaseFolder).isDirectory()) {
        console.error('Pasta de banco de dados não encontrada:', databaseFolder);
        process.exit(1);
    }

    try {
        // Conectar ao banco de dados
        log.info('Conectando ao PostgreSQL...');
        await Database.connect();
        log.success('Conectado ao PostgreSQL');

        // Listar arquivos .db
        const files = fs.readdirSync(databaseFolder)
            .filter(file => file.endsWith('.db'))
            .map(file => path.join(databaseFolder, file));

        if (files.length === 0) {
            log.info('Nenhum arquivo .db encontrado na pasta');
            return;
        }

        log.info(`Encontrados ${files.length} arquivos para migração`);

        let totalProcessed = 0;
        let totalErrors = 0;

        // Processar cada arquivo
        for (const file of files) {
            const result = await processFile(file);
            totalProcessed += result.processed;
            totalErrors += result.errors;
        }

        log.success(`Migração concluída: ${totalProcessed} registros processados, ${totalErrors} erros`);

    } catch (error) {
        log.error('Erro durante a migração:', error.message);
        process.exit(1);
    } finally {
        await Database.disconnect();
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main().catch(error => {
        console.error('Erro fatal:', error);
        process.exit(1);
    });
}

module.exports = { processFile, parseLine };
