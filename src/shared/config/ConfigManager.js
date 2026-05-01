/**
 * @fileoverview ConfigManager - Carga y valida configuración desde .env
 * @module shared/config/ConfigManager
 * @author Staff Bot System
 * @version 2.0.0
 */

'use strict';

/**
 * @typedef {Object} BotConfig
 * @property {string} token - Token del bot de Discord
 * @property {string} serverId - ID del servidor de Discord
 * @property {string} logChannelId - ID del canal de logs
 * @property {string} modLogChannelId - ID del canal de logs de moderación
 * @property {string} devUserId - ID del usuario desarrollador
 * @property {string} logDir - Directorio para archivos de log
 */

/**
 * @typedef {Object} ChannelConfig
 * @property {string} recepcion - Canal de recepción
 * @property {string} aceptados - Canal de solicitudes aceptadas
 * @property {string} rechazados - Canal de solicitudes rechazadas
 * @property {string} solicitudes - Canal de solicitudes pendientes
 * @property {string} coordenadas - Canal de coordenadas
 * @property {string} mapaEventos - Canal de mapa de eventos
 * @property {string} anuncios - Canal de anuncios
 * @property {string} logsActividad - Canal de logs de actividad
 */

/**
 * @typedef {Object} RoleConfig
 * @property {string} altaCupula - Rol de alta cúpula
 * @property {string} respInt - Rol de responsable INT
 * @property {string} adm - Rol de administrador
 * @property {string} aux - Rol de auxiliar
 * @property {string} lid - Rol de líder
 * @property {string} sub - Rol de subordinado
 * @property {string} miembro - Rol de miembro
 * @property {string} tester - Rol de tester
 */

/**
 * Configuración de colores para embeds (por tipo de evento)
 * @typedef {Object.<string, number>} ColorConfig
 */

class ConfigManager {
    /**
     * @param {string} botPrefix - Prefijo para variables de entorno (e.g., 'BOT3')
     */
    constructor(botPrefix = 'BOT') {
        /** @type {string} */
        this.prefix = botPrefix;
        /** @type {BotConfig} */
        this._bot = this._loadBotConfig();
        /** @type {ChannelConfig} */
        this._channels = this._loadChannelConfig();
        /** @type {RoleConfig} */
        this._roles = this._loadRoleConfig();
        /** @type {ColorConfig} */
        this._colors = this._loadColorConfig();
        /** @type {string[]} */
        this._verificacionAutorizados = this._loadVerificacionAutorizados();
        /** @type {RoleConfig} */
        this._rolesDisponibles = this._roles;
        /** @type {Array} */
        this._jerarquia = this._loadJerarquia();
        /** @type {string[]} */
        this._managedChannels = this._loadManagedChannels();
    }

    /**
     * Obtiene la configuración del bot
     * @returns {BotConfig}
     */
    get bot() {
        return this._bot;
    }

    /**
     * Obtiene la configuración de canales
     * @returns {ChannelConfig}
     */
    get channels() {
        return this._channels;
    }

    /**
     * Obtiene la configuración de roles
     * @returns {RoleConfig}
     */
    get roles() {
        return this._roles;
    }

    /**
     * Obtiene la configuración de colores
     * @returns {ColorConfig}
     */
    get colors() {
        return this._colors;
    }

    /**
     * Obtiene los roles autorizados para verificación
     * @returns {string[]}
     */
    get verificacionAutorizados() {
        return this._verificacionAutorizados;
    }

    /**
     * Obtiene los roles disponibles para solicitud (key = id de rol)
     * @returns {Object.<string, string>}
     */
    get roleMapping() {
        // Retorna { '1498534443206443047': 'Alta Cúpula', ... }
        const mapping = {};
        for (const [key, roleId] of Object.entries(this._roles)) {
            // Convertir 'altaCupula' a 'Alta Cúpula'
            const displayName = this._formatRoleName(key);
            mapping[roleId] = displayName;
        }
        return Object.freeze(mapping);
    }

    /**
     * Obtiene los roles disponibles para solicitud (key = id de rol, legacy)
     * @returns {RoleConfig}
     */
    get rolesDisponibles() {
        return this._rolesDisponibles;
    }

    /**
     * Formatea el nombre de un rol para display
     * @private
     * @param {string} key
     * @returns {string}
     */
    _formatRoleName(key) {
        const names = {
            altaCupula: 'Alta Cúpula',
            respInt: 'Resp.INT',
            adm: 'ADM',
            aux: 'AUX',
            lid: 'LID',
            sub: 'SUB',
            miembro: 'MIEMBRO',
            tester: 'TESTER'
        };
        return names[key] || key;
    }

    /**
     * Obtiene la jerarquía de roles
     * @returns {Array}
     */
    get jerarquia() {
        return this._jerarquia;
    }

    /**
     * Obtiene los canales manejados
     * @returns {string[]}
     */
    get managedChannels() {
        return this._managedChannels;
    }

    /**
     * Carga configuración del bot desde environment
     * @private
     * @returns {BotConfig}
     */
    _loadBotConfig() {
        return Object.freeze({
            token: this._getEnv(`${this.prefix}_TOKEN`, ''),
            serverId: this._getEnv(`${this.prefix}_SERVER_ID`, '1498519623774244985'),
            logChannelId: this._getEnv(`${this.prefix}_LOG_CHANNEL`, '1498534563549417654'),
            modLogChannelId: this._getEnv(`${this.prefix}_MOD_LOG_CHANNEL`, '1498534565285859358'),
            devUserId: this._getEnv(`${this.prefix}_DEV_USER_ID`, ''),
            logDir: this._getEnv('LOG_DIR', './logs_bot3')
        });
    }

    /**
     * Carga configuración de canales
     * @private
     * @returns {ChannelConfig}
     */
    _loadChannelConfig() {
        return Object.freeze({
            recepcion: this._getEnv(`${this.prefix}_CHANNEL_RECEPCION`, '1498534574161002577'),
            aceptados: this._getEnv(`${this.prefix}_CHANNEL_ACEPTADOS`, '1498534571417796660'),
            rechazados: this._getEnv(`${this.prefix}_CHANNEL_RECHAZADOS`, '1498534572684738582'),
            solicitudes: this._getEnv(`${this.prefix}_CHANNEL_SOLICITUDES`, '1498534574161002577'),
            coordenadas: this._getEnv(`${this.prefix}_CHANNEL_COORDENADAS`, '1498534578015440937'),
            mapaEventos: this._getEnv(`${this.prefix}_CHANNEL_MAPA_EVENTOS`, '1498534578397253713'),
            anuncios: this._getEnv(`${this.prefix}_CHANNEL_ANUNCIOS`, '1498534718214508635'),
            logsActividad: this._getEnv(`${this.prefix}_CHANNEL_LOGS_ACTIVIDAD`, '1498534563549417654'),
            setsPendientes: this._getEnv(`${this.prefix}_CHANNEL_SETS_PENDIENTES`, '1498534574161002577'),
            setsAceptados: this._getEnv(`${this.prefix}_CHANNEL_SETS_ACEPTADOS`, '1498534572684738582'),
            setsRechazados: this._getEnv(`${this.prefix}_CHANNEL_SETS_RECHAZADOS`, '1498534575826014259'),
        });
    }

    /**
     * Carga configuración de roles
     * @private
     * @returns {RoleConfig}
     */
    _loadRoleConfig() {
        return Object.freeze({
            altaCupula: this._getEnv(`${this.prefix}_ROLE_ALTA_CUPULA`, '1498534443206443047'),
            respInt: this._getEnv(`${this.prefix}_ROLE_RESP_INT`, '1498534444460671077'),
            adm: this._getEnv(`${this.prefix}_ROLE_ADM`, '1498534444179656885'),
            aux: this._getEnv(`${this.prefix}_ROLE_AUX`, '1498534445060329504'),
            lid: this._getEnv(`${this.prefix}_ROLE_LID`, '1498534456322031757'),
            sub: this._getEnv(`${this.prefix}_ROLE_SUB`, '1498534447069401130'),
            miembro: this._getEnv(`${this.prefix}_ROLE_MIEMBRO`, '1498534448684208289'),
            tester: this._getEnv(`${this.prefix}_ROLE_TESTER`, '1498534449770663966')
        });
    }

    /**
     * Carga configuración de colores
     * @private
     * @returns {ColorConfig}
     */
    _loadColorConfig() {
        return Object.freeze({
            messageCreate: 0x00FF00,
            messageUpdate: 0xFFA500,
            messageDelete: 0xFF0000,
            memberJoin: 0x00CED1,
            memberLeave: 0x8B0000,
            memberKick: 0xDC143C,
            memberBan: 0x4B0082,
            memberUnban: 0x9370DB,
            roleAdd: 0x32CD32,
            roleRemove: 0xFF6347,
            serverUpdate: 0xFFD700,
            channelCreate: 0x00BFFF,
            channelDelete: 0xFF4500,
            channelUpdate: 0x1E90FF,
            voiceJoin: 0x7CFC00,
            voiceLeave: 0xCD853F,
            voiceMove: 0x20B2AA,
            timeout: 0xFF8C00,
            nickname: 0xDDA0DD,
            emojiCreate: 0x00CED1,
            emojiDelete: 0xFF6347,
            emojiUpdate: 0xFFA500,
            stickerCreate: 0x00CED1,
            stickerDelete: 0xFF6347,
            stickerUpdate: 0xFFA500,
            webhookCreate: 0x00BFFF,
            webhookDelete: 0xFF4500,
            webhookUpdate: 0x1E90FF,
            stageCreate: 0x9B59B6,
            stageDelete: 0xE74C3C,
            stageUpdate: 0x3498DB,
            threadCreate: 0x00BFFF,
            threadDelete: 0xFF4500,
            threadUpdate: 0x1E90FF,
            memberChunk: 0x9B59B6,
            integrationCreate: 0x00FF00,
            integrationDelete: 0xFF0000,
            integrationUpdate: 0xFFA500,
            commandExecute: 0x9B59B6,
            verification: 0x00BFFF,
            success: 0x00FF00,
            error: 0xFF0000,
            warning: 0xFFA500
        });
    }

    /**
     * Carga roles autorizados para verificación
     * @private
     * @returns {string[]}
     */
    _loadVerificacionAutorizados() {
        return Object.freeze([
            this._getEnv(`${this.prefix}_ROLE_DEV`, '1498520261228630016'),
            this._roles.altaCupula,
            this._roles.respInt,
            this._roles.adm,
            this._roles.aux,
            this._getEnv(`${this.prefix}_ROLE_LID`, '1498534445886472254')
        ]);
    }

    /**
     * Carga canales manejados para logging
     * @private
     * @returns {string[]}
     */
    _loadManagedChannels() {
        return Object.freeze([
            '1498534570495311902',
            '1498534571417796660',
            '1498534572684738582',
            '1498534574161002577',
            '1498534578015440937',
            '1498534578397253713',
            '1498534718214508635',
            '1498534563549417654'
        ]);
    }

    /**
     * Carga jerarquía de roles para verificación
     * @private
     * @returns {Array}
     */
    _loadJerarquia() {
        return Object.freeze([
            {
                id: this._getEnv(`${this.prefix}_ROLE_DEV`, '1498520261228630016'),
                nombre: 'DEV',
                puedeAceptar: ['Alta Cúpula', 'Resp.INT', 'ADM', 'AUX', 'LID', 'SUB', 'MIEMBRO', 'TESTER']
            },
            {
                id: this._roles.altaCupula,
                nombre: 'Alta Cúpula',
                puedeAceptar: ['Alta Cúpula', 'Resp.INT', 'ADM', 'AUX', 'LID', 'SUB', 'MIEMBRO', 'TESTER']
            },
            {
                id: this._roles.respInt,
                nombre: 'Resp.INT',
                puedeAceptar: ['ADM', 'AUX', 'LID', 'SUB', 'MIEMBRO', 'TESTER']
            },
            {
                id: this._roles.adm,
                nombre: 'ADM',
                puedeAceptar: ['AUX', 'LID', 'SUB', 'MIEMBRO', 'TESTER']
            },
            {
                id: this._roles.aux,
                nombre: 'AUX',
                puedeAceptar: ['LID', 'SUB', 'MIEMBRO', 'TESTER']
            }
        ]);
    }

    /**
     * Obtiene variable de entorno con valor por defecto
     * @private
     * @param {string} key - Nombre de la variable
     * @param {string} defaultValue - Valor por defecto
     * @returns {string}
     */
    _getEnv(key, defaultValue) {
        return process.env[key] || defaultValue;
    }

    /**
     * Verifica si la configuración es válida
     * @returns {{valid: boolean, errors: string[]}}
     */
    validate() {
        const errors = [];

        if (!this._bot.token) {
            errors.push(`${this.prefix}_TOKEN is required`);
        }

        if (!this._bot.serverId) {
            errors.push(`${this.prefix}_SERVER_ID is required`);
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
}

/**
 * Instancia singleton del ConfigManager para Bot3 (Staff Fiestas)
 * @type {ConfigManager}
 */
const configManager = new ConfigManager('BOT3');

module.exports = { ConfigManager, configManager };
