//@ts-check

"use strict";
const Database = require('./database/Database');
const log = require('./Log');

/**
 * Módulo para leitura de dados do PostgreSQL
 * Substitui a leitura dos arquivos de dados antigos
 */
module.exports = {
    /**
     * Lê dados de atividades de codificação com filtros
     * @param {Object} options - Opções de filtro
     * @param {Date} options.startDate - Data de início
     * @param {Date} options.endDate - Data de fim
     * @param {string[]} options.projects - Lista de projetos para filtrar
     * @param {string[]} options.languages - Lista de linguagens para filtrar
     * @param {string[]} options.computers - Lista de computadores para filtrar
     * @param {string[]} options.files - Lista de arquivos para filtrar
     * @param {number} options.limit - Limite de registros
     * @param {number} options.offset - Offset para paginação
     */
    async getCodingActivities(options = {}) {
        try {
            const repository = Database.getCodingActivityRepository();
            let query = repository.createQueryBuilder('activity');

            // Filtros de data
            if (options.startDate) {
                query.andWhere('activity.time >= :startTime', { 
                    startTime: options.startDate.getTime() 
                });
            }
            if (options.endDate) {
                query.andWhere('activity.time <= :endTime', { 
                    endTime: options.endDate.getTime() 
                });
            }

            // Filtros por arrays
            if (options.projects && options.projects.length > 0) {
                query.andWhere('activity.project IN (:...projects)', { 
                    projects: options.projects 
                });
            }
            if (options.languages && options.languages.length > 0) {
                query.andWhere('activity.language IN (:...languages)', { 
                    languages: options.languages 
                });
            }
            if (options.computers && options.computers.length > 0) {
                query.andWhere('activity.computer_id IN (:...computers)', { 
                    computers: options.computers 
                });
            }
            if (options.files && options.files.length > 0) {
                query.andWhere('activity.file IN (:...files)', { 
                    files: options.files 
                });
            }

            // Ordenação e paginação
            query.orderBy('activity.time', 'DESC');
            
            if (options.limit) {
                query.limit(options.limit);
            }
            if (options.offset) {
                query.offset(options.offset);
            }

            const activities = await query.getMany();
            return activities;
        } catch (error) {
            log.error('Erro ao buscar atividades de codificação:', error.message);
            throw error;
        }
    },

    /**
     * Obtém estatísticas agregadas
     * @param {Object} options - Opções de filtro (mesmas de getCodingActivities)
     */
    async getStatistics(options = {}) {
        try {
            const repository = Database.getCodingActivityRepository();
            let query = repository.createQueryBuilder('activity');

            // Aplicar os mesmos filtros de getCodingActivities
            if (options.startDate) {
                query.andWhere('activity.time >= :startTime', { 
                    startTime: options.startDate.getTime() 
                });
            }
            if (options.endDate) {
                query.andWhere('activity.time <= :endTime', { 
                    endTime: options.endDate.getTime() 
                });
            }
            if (options.projects && options.projects.length > 0) {
                query.andWhere('activity.project IN (:...projects)', { 
                    projects: options.projects 
                });
            }
            if (options.languages && options.languages.length > 0) {
                query.andWhere('activity.language IN (:...languages)', { 
                    languages: options.languages 
                });
            }
            if (options.computers && options.computers.length > 0) {
                query.andWhere('activity.computer_id IN (:...computers)', { 
                    computers: options.computers 
                });
            }

            // Estatísticas básicas
            const totalDuration = await query
                .select('SUM(activity.duration)', 'total')
                .getRawOne();

            const activityCount = await query
                .select('COUNT(activity.id)', 'count')
                .getRawOne();

            // Top linguagens
            const topLanguages = await repository.createQueryBuilder('activity')
                .select('activity.language', 'language')
                .addSelect('SUM(activity.duration)', 'duration')
                .addSelect('COUNT(activity.id)', 'count')
                .where(query.expressionMap.wheres.map(w => w.condition).join(' AND '))
                .setParameters(query.expressionMap.parameters)
                .groupBy('activity.language')
                .orderBy('duration', 'DESC')
                .limit(10)
                .getRawMany();

            // Top projetos
            const topProjects = await repository.createQueryBuilder('activity')
                .select('activity.project', 'project')
                .addSelect('SUM(activity.duration)', 'duration')
                .addSelect('COUNT(activity.id)', 'count')
                .where(query.expressionMap.wheres.map(w => w.condition).join(' AND '))
                .setParameters(query.expressionMap.parameters)
                .groupBy('activity.project')
                .orderBy('duration', 'DESC')
                .limit(10)
                .getRawMany();

            return {
                totalDuration: parseInt(totalDuration.total) || 0,
                activityCount: parseInt(activityCount.count) || 0,
                topLanguages: topLanguages.map(item => ({
                    language: item.language,
                    duration: parseInt(item.duration),
                    count: parseInt(item.count)
                })),
                topProjects: topProjects.map(item => ({
                    project: item.project,
                    duration: parseInt(item.duration),
                    count: parseInt(item.count)
                }))
            };
        } catch (error) {
            log.error('Erro ao obter estatísticas:', error.message);
            throw error;
        }
    },

    /**
     * Obtém dados agrupados por período (dia, hora, etc.)
     * @param {Object} options - Opções de filtro
     * @param {string} groupBy - 'hour', 'day', 'week', 'month'
     */
    async getActivityGroupedByTime(options = {}, groupBy = 'day') {
        try {
            const repository = Database.getCodingActivityRepository();
            let query = repository.createQueryBuilder('activity');

            // Aplicar filtros de data
            if (options.startDate) {
                query.andWhere('activity.time >= :startTime', { 
                    startTime: options.startDate.getTime() 
                });
            }
            if (options.endDate) {
                query.andWhere('activity.time <= :endTime', { 
                    endTime: options.endDate.getTime() 
                });
            }

            // Agrupamento por tempo
            let timeExpression;
            switch (groupBy) {
                case 'hour':
                    timeExpression = "to_char(to_timestamp(activity.time / 1000), 'YYYY-MM-DD HH24:00:00')";
                    break;
                case 'day':
                    timeExpression = "to_char(to_timestamp(activity.time / 1000), 'YYYY-MM-DD')";
                    break;
                case 'week':
                    timeExpression = "to_char(to_timestamp(activity.time / 1000), 'YYYY-\"W\"WW')";
                    break;
                case 'month':
                    timeExpression = "to_char(to_timestamp(activity.time / 1000), 'YYYY-MM')";
                    break;
                default:
                    timeExpression = "to_char(to_timestamp(activity.time / 1000), 'YYYY-MM-DD')";
            }

            const results = await query
                .select(`${timeExpression}`, 'period')
                .addSelect('SUM(activity.duration)', 'duration')
                .addSelect('COUNT(activity.id)', 'count')
                .groupBy('period')
                .orderBy('period', 'ASC')
                .getRawMany();

            return results.map(item => ({
                period: item.period,
                duration: parseInt(item.duration),
                count: parseInt(item.count)
            }));
        } catch (error) {
            log.error('Erro ao obter dados agrupados por tempo:', error.message);
            throw error;
        }
    },

    /**
     * Obtém lista única de projetos
     */
    async getProjects() {
        try {
            const repository = Database.getCodingActivityRepository();
            const results = await repository.createQueryBuilder('activity')
                .select('DISTINCT activity.project', 'project')
                .where('activity.project IS NOT NULL')
                .andWhere('activity.project != \'\'')
                .orderBy('activity.project', 'ASC')
                .getRawMany();

            return results.map(item => item.project);
        } catch (error) {
            log.error('Erro ao obter lista de projetos:', error.message);
            throw error;
        }
    },

    /**
     * Obtém lista única de linguagens
     */
    async getLanguages() {
        try {
            const repository = Database.getCodingActivityRepository();
            const results = await repository.createQueryBuilder('activity')
                .select('DISTINCT activity.language', 'language')
                .where('activity.language IS NOT NULL')
                .andWhere('activity.language != \'\'')
                .orderBy('activity.language', 'ASC')
                .getRawMany();

            return results.map(item => item.language);
        } catch (error) {
            log.error('Erro ao obter lista de linguagens:', error.message);
            throw error;
        }
    },

    /**
     * Obtém lista única de computadores
     */
    async getComputers() {
        try {
            const repository = Database.getCodingActivityRepository();
            const results = await repository.createQueryBuilder('activity')
                .select('DISTINCT activity.computer_id', 'computer_id')
                .where('activity.computer_id IS NOT NULL')
                .andWhere('activity.computer_id != \'\'')
                .orderBy('activity.computer_id', 'ASC')
                .getRawMany();

            return results.map(item => item.computer_id);
        } catch (error) {
            log.error('Erro ao obter lista de computadores:', error.message);
            throw error;
        }
    }
};
