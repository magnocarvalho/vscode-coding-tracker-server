//@ts-check

"use strict";

const DataReader = require('../database/DataReader');
const log = require('../Log');

/**
 * ReportMiddleware V3 - Compatível com PostgreSQL
 * Substitui o ReportMiddlewareV2 para usar dados do banco
 */

module.exports = {
    /**
     * Middleware principal para relatórios
     */
    middleware: async function(req, res) {
        try {
            const query = req.query;
            const options = parseQueryOptions(query);
            
            const activities = await DataReader.getCodingActivities(options);
            const statistics = await DataReader.getStatistics(options);
            
            const result = {
                success: true,
                data: activities,
                statistics: statistics,
                meta: {
                    total: activities.length,
                    startDate: options.startDate ? options.startDate.toISOString() : null,
                    endDate: options.endDate ? options.endDate.toISOString() : null,
                    filters: {
                        projects: options.projects || [],
                        languages: options.languages || [],
                        computers: options.computers || [],
                        files: options.files || []
                    }
                }
            };
            
            res.json(result);
        } catch (error) {
            log.error('Erro no ReportMiddleware V3:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Endpoint para estatísticas agregadas
     */
    statisticsMiddleware: async function(req, res) {
        try {
            const query = req.query;
            const options = parseQueryOptions(query);
            
            const statistics = await DataReader.getStatistics(options);
            const groupedData = await DataReader.getActivityGroupedByTime(options, query.groupBy || 'day');
            
            res.json({
                success: true,
                statistics: statistics,
                timeline: groupedData
            });
        } catch (error) {
            log.error('Erro no statistics middleware:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    },

    /**
     * Endpoint para listas de filtros disponíveis
     */
    filtersMiddleware: async function(req, res) {
        try {
            const [projects, languages, computers] = await Promise.all([
                DataReader.getProjects(),
                DataReader.getLanguages(),
                DataReader.getComputers()
            ]);
            
            res.json({
                success: true,
                filters: {
                    projects: projects,
                    languages: languages,
                    computers: computers
                }
            });
        } catch (error) {
            log.error('Erro no filters middleware:', error.message);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
};

/**
 * Converte parâmetros de query em opções para DataReader
 * @param {Object} query - Query parameters do request
 */
function parseQueryOptions(query) {
    const options = {};
    
    // Filtros de data
    if (query.startDate) {
        options.startDate = new Date(query.startDate);
    }
    if (query.endDate) {
        options.endDate = new Date(query.endDate);
    }
    
    // Se não especificado, usar últimos 7 dias
    if (!options.startDate && !options.endDate) {
        options.endDate = new Date();
        options.startDate = new Date();
        options.startDate.setDate(options.startDate.getDate() - 7);
    }
    
    // Filtros por arrays
    if (query.projects) {
        options.projects = Array.isArray(query.projects) ? query.projects : [query.projects];
    }
    if (query.languages) {
        options.languages = Array.isArray(query.languages) ? query.languages : [query.languages];
    }
    if (query.computers) {
        options.computers = Array.isArray(query.computers) ? query.computers : [query.computers];
    }
    if (query.files) {
        options.files = Array.isArray(query.files) ? query.files : [query.files];
    }
    
    // Paginação
    if (query.limit) {
        options.limit = parseInt(query.limit);
    }
    if (query.offset) {
        options.offset = parseInt(query.offset);
    }
    
    return options;
}
