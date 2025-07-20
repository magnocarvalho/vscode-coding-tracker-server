#!/usr/bin/env node

//@ts-check

"use strict";

/**
 * Teste básico para verificar o funcionamento do PostgreSQL Storage
 */

const log = require('./lib/Log');
const StorageAdapter = require('./lib/StorageAdapter');

async function testStorage() {
    try {
        log.info('Testando StorageAdapter...');
        
        // Inicializar storage
        await StorageAdapter.init('./database');
        
        log.success(`Storage inicializado: ${StorageAdapter.isUsingPostgres() ? 'PostgreSQL' : 'Arquivo'}`);
        
        // Testar escrita de dados
        const testData = {
            type: 'code',
            time: Date.now().toString(),
            long: '5000',
            lang: 'javascript',
            file: '/test/file.js',
            proj: '/test/project',
            pcid: 'test-computer',
            vcs_type: 'git',
            vcs_repo: 'test-repo',
            vcs_branch: 'main',
            line: '10',
            char: '5'
        };
        
        log.info('Enviando dados de teste...');
        StorageAdapter.write(testData);
        
        // Aguardar um pouco para processamento
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Se estiver usando PostgreSQL, testar DataReader
        if (StorageAdapter.isUsingPostgres()) {
            const DataReader = require('./lib/database/DataReader');
            
            log.info('Testando DataReader...');
            
            const activities = await DataReader.getCodingActivities({
                limit: 5
            });
            
            log.success(`Encontradas ${activities.length} atividades`);
            
            const statistics = await DataReader.getStatistics();
            log.success(`Estatísticas: ${statistics.activityCount} atividades, ${statistics.totalDuration}ms total`);
            
            const projects = await DataReader.getProjects();
            log.success(`Projetos únicos: ${projects.length}`);
        }
        
        log.success('Teste concluído com sucesso!');
        
    } catch (error) {
        log.error('Erro no teste:', error.message);
        console.error(error.stack);
    } finally {
        await StorageAdapter.disconnect();
        process.exit(0);
    }
}

if (require.main === module) {
    testStorage();
}
