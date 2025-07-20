//@ts-check

"use strict";
const log = require('./Log');
const createQueue = require('./StorageQueue');
const Database = require('./database/Database');

const TYPE = { 'open': 0, 'look': 1, 'code': 2 };
const EMPTY_ERROR = { message: '', stack: '' };

let queue = createQueue(write);
let isInitialized = false;

module.exports = {
    init: async function(path) { 
        try {
            await Database.connect();
            isInitialized = true;
            log.success('Storage PostgreSQL inicializado com sucesso');
        } catch (error) {
            log.error('Erro ao inicializar Storage PostgreSQL:', error.message);
            throw error;
        }
    },
    write: function(data) {
        if (!isInitialized) {
            return log.error('Storage PostgreSQL não foi inicializado');
        }

        // add into queue
        let description = `${data.type} (${data.file}) ${getReadableDuration(data.long)}`;
        queue.add({ description, data: getStorableData(data) });
    },
    disconnect: async function() {
        if (isInitialized) {
            await Database.disconnect();
            isInitialized = false;
        }
    }
};

/**
 * Esta é a função principal de armazenamento que será chamada pela variável `queue`
 */
function write({ description, data }) {
    // Usar Promise para manter compatibilidade com o sistema de queue síncrono
    (async () => {
        try {
            const repository = Database.getCodingActivityRepository();
            
            // Salva no banco de dados
            await repository.save(data);
            
            //@ts-ignore
            global.DEBUG && log.success(`Storage success: ${description} => PostgreSQL`);
            
            queue.next();
        } catch (error) {
            recordError(description, error);
            queue.retry();
        }
    })();
}

function recordError(description, error) {
    if (!error)
        error = EMPTY_ERROR;
    log.error(`Storage failed: ${error.message} => ${description}\n${error.stack}`);
}

/** @param {number} ms */
function getReadableDuration(ms) {
    let s = Math.floor(ms / 1000), m = 0;
    if (s > 60) { 
        m = Math.floor(s / 60); 
        s -= m * 60; 
    }
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function getStorableData(data) {
    return {
        type: TYPE[data.type] || 0,
        time: parseInt(data.time),
        duration: parseInt(data.long),
        language: decodeURIComponent(data.lang || ''),
        file: decodeURIComponent(data.file || ''),
        project: decodeURIComponent(data.proj || ''),
        computer_id: decodeURIComponent(data.pcid || ''),
        vcs_type: decodeURIComponent(data.vcs_type || ''),
        vcs_repo: decodeURIComponent(data.vcs_repo || ''),
        vcs_branch: decodeURIComponent(data.vcs_branch || ''),
        line: parseInt(data.line) || 0,
        char: parseInt(data.char) || 0
    };
}
