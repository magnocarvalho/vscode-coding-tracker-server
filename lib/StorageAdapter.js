//@ts-check

"use strict";

const log = require('./Log');

let storageProvider = null;
let usePostgres = true;

// Determina qual storage usar baseado na configuração
try {
    require('dotenv').config();
    usePostgres = process.env.USE_FILE_STORAGE_FALLBACK !== 'true';
} catch (error) {
    log.error('Erro ao carregar configuração, usando storage em arquivo como fallback');
    usePostgres = false;
}

/**
 * Adapter para storage - permite usar PostgreSQL ou arquivos
 */
module.exports = {
    async init(path) {
        if (usePostgres) {
            try {
                const StoragePostgres = require('./StoragePostgres');
                await StoragePostgres.init(path);
                storageProvider = StoragePostgres;
                log.success('Usando PostgreSQL Storage');
            } catch (error) {
                log.error('Erro ao inicializar PostgreSQL, fallback para arquivo:', error.message);
                usePostgres = false;
            }
        }
        
        if (!usePostgres) {
            const StorageFile = require('./Storage');
            await new Promise((resolve) => {
                StorageFile.init(path);
                resolve();
            });
            storageProvider = StorageFile;
            log.info('Usando File Storage');
        }
    },

    write(data) {
        if (!storageProvider) {
            log.error('Storage não foi inicializado');
            return;
        }
        return storageProvider.write(data);
    },

    async disconnect() {
        if (storageProvider && storageProvider.disconnect) {
            await storageProvider.disconnect();
        }
    },

    getProvider() {
        return storageProvider;
    },

    isUsingPostgres() {
        return usePostgres;
    }
};
