/**
 * Configuración centralizada para bots de Staff
 * Cada bot tiene su propio prefijo en variables de entorno
 *
 * Compatibilidad con variables de entorno existentes:
 * - BOT1_ALTA_CUPULA_ID, BOT1_ADM_ROLE_ID, etc. (para bot.js)
 * - BOT1_ROLE_ALTA_CUPULA, BOT1_ROLE_ADM, etc. (estándar)
 */

/**
 * @typedef {Object} BotConfig
 * @property {string} token - Token del bot
 * @property {string} serverId - ID del servidor
 * @property {string} logChannelId - Canal de logs
 * @property {string} modLogChannelId - Canal de logs de moderación
 * @property {string} devUserId - ID del usuario desarrollador
 * @property {string} logDir - Directorio de logs
 */

/**
 * @typedef {Object} ChannelConfig
 * @property {string} logs - Canal de logs principal
 * @property {string} moderatorOnly - Canal solo para moderadores
 * @property {string} setsPendientes - Canal de sets pendientes
 * @property {string} setsAceptados - Canal de sets aceptados
 * @property {string} setsRechazados - Canal de sets rechazados
 */

/**
 * @typedef {Object} RoleConfig
 * @property {string} altaCupula - Rol Alta Cúpula
 * @property {string} respInt - Rol Responsable INT
 * @property {string} adm - Rol Administrador
 * @property {string} aux - Rol Auxiliar
 * @property {string} lid - Rol Líder
 * @property {string} sub - Rol Subordinado
 * @property {string} miembro - Rol Miembro
 * @property {string} tester - Rol Tester
 */

class ConfigManager {
  /**
   * @param {string} botPrefix - Prefijo para variables de entorno (e.g., 'BOT1', 'BOT3')
   */
  constructor(botPrefix = 'BOT') {
    this.prefix = botPrefix;
    this._bot = this._loadBotConfig();
    this._channels = this._loadChannelConfig();
    this._roles = this._loadRoleConfig();
    this._colors = this._loadColorConfig();
    this._jerarquia = this._loadJerarquia();
    this.client = null; // Se asigna desde bot.js
  }

  /** @returns {BotConfig} */
  get bot() { return this._bot; }

  /** @returns {ChannelConfig} */
  get channels() { return this._channels; }

  /** @returns {RoleConfig} */
  get roles() { return this._roles; }

  /** @returns {Object} */
  get colors() { return this._colors; }

  /** @returns {Array} */
  get jerarquia() { return this._jerarquia; }

  /**
   * Obtener variable de entorno con múltiples posibles nombres
   * @param {string[]} keys - Posibles nombres de variables
   * @param {string} defaultValue - Valor por defecto
   * @returns {string}
   */
  _getEnvMulti(keys, defaultValue = '') {
    for (const key of keys) {
      const value = process.env[key];
      if (value) return value;
    }
    return defaultValue;
  }

  /**
   * Obtener variable de entorno simple
   * @param {string} key
   * @param {string} defaultValue
   * @returns {string}
   */
  _getEnv(key, defaultValue = '') {
    return process.env[`${this.prefix}_${key}`] || process.env[key] || defaultValue;
  }

  _loadBotConfig() {
    return {
      token: this._getEnv('TOKEN', ''),
      serverId: this._getEnv('SERVER_ID', ''),
      logChannelId: this._getEnv('CHANNEL_LOGS', '') || this._getEnv('CANALES_LOGS', ''),
      modLogChannelId: this._getEnv('MOD_LOG_CHANNEL', ''),
      devUserId: this._getEnv('DEV_USER_ID', '') || this._getEnv('DEV_USER_ID', ''),
      logDir: this._getEnv('LOG_DIR', './logs'),
    };
  }

  _loadChannelConfig() {
    // Compatibilidad con diferentes naming conventions
    return {
      logs: this._getEnv('CHANNEL_LOGS', '') || this._getEnv('CANALES_LOGS', ''),
      moderatorOnly: this._getEnv('CHANNEL_MODERATOR_ONLY', ''),
      setsPendientes: this._getEnv('CHANNEL_SETS_PENDIENTES', '') || this._getEnv('CANALES_SOLICITUDES', ''),
      setsAceptados: this._getEnv('CHANNEL_SETS_ACEPTADOS', ''),
      setsRechazados: this._getEnv('CHANNEL_SETS_RECHAZADOS', ''),
    };
  }

  _loadRoleConfig() {
    // Intentar múltiples convenciones de nombres
    return {
      altaCupula: this._getEnvMulti([
        `${this.prefix}_ALTA_CUPULA_ID`,
        `${this.prefix}_ROLE_ALTA_CUPULA`,
        'ALTA_CUPULA_ID',
        'ROLE_ALTA_CUPULA'
      ], ''),
      respInt: this._getEnvMulti([
        `${this.prefix}_RESPONSABLE_ID`,
        `${this.prefix}_ROLE_RESP_INT`,
        'RESPONSABLE_ID',
        'ROLE_RESP_INT'
      ], ''),
      adm: this._getEnvMulti([
        `${this.prefix}_ADM_ROLE_ID`,
        `${this.prefix}_ROLE_ADM`,
        'ADM_ROLE_ID',
        'ROLE_ADM'
      ], ''),
      aux: this._getEnvMulti([
        `${this.prefix}_AUX_ID`,
        `${this.prefix}_ROLE_AUX`,
        'AUX_ID',
        'ROLE_AUX'
      ], ''),
      lid: this._getEnvMulti([
        `${this.prefix}_LID_ID`,
        `${this.prefix}_ROLE_LID`,
        'LID_ID',
        'ROLE_LID'
      ], ''),
      sub: this._getEnvMulti([
        `${this.prefix}_SUB_ID`,
        `${this.prefix}_ROLE_SUB`,
        'SUB_ID',
        'ROLE_SUB'
      ], ''),
      miembro: this._getEnvMulti([
        `${this.prefix}_MIEMBRO_ID`,
        `${this.prefix}_USUARIO_ID`,
        `${this.prefix}_ROLE_MIEMBRO`,
        'MIEMBRO_ID',
        'USUARIO_ID',
        'ROLE_MIEMBRO'
      ], ''),
      tester: this._getEnvMulti([
        `${this.prefix}_TESTER_ID`,
        `${this.prefix}_ROLE_TESTER`,
        'TESTER_ID',
        'ROLE_TESTER'
      ], ''),
    };
  }

  _loadColorConfig() {
    return {
      success: 0x00FF00,
      error: 0xFF0000,
      warning: 0xFFAA00,
      info: 0x3498DB,
      verify: 0x5865F2,
      memberJoin: 0x00CED1,
      memberLeave: 0x8B0000,
      messageCreate: 0x00FF00,
      messageUpdate: 0xFFA500,
      messageDelete: 0xFF0000,
      roleAdd: 0x32CD32,
      roleRemove: 0xFF6347,
      nickname: 0xDDA0DD,
    };
  }

  _loadJerarquia() {
    return [
      { id: this._getEnvMulti([`${this.prefix}_DEV_ROLE_ID`, 'DEV_ROLE_ID', `${this.prefix}_DEV_USER_ID`], ''), nombre: 'DEV', puedeAceptar: ['🔥 Alta Cúpula', '💀 Resp.INT', '🎉 ADM', '🎉 AUX', '🎉 LID', '🎉 SUB', '🎉 MIEMBRO', '🎉 TESTER'] },
      { id: this._roles.altaCupula, nombre: 'Alta Cúpula', puedeAceptar: ['🔥 Alta Cúpula', '💀 Resp.INT', '🎉 ADM', '🎉 AUX', '🎉 LID', '🎉 SUB', '🎉 MIEMBRO', '🎉 TESTER'] },
      { id: this._roles.respInt, nombre: 'Resp.INT', puedeAceptar: ['🎉 ADM', '🎉 AUX', '🎉 LID', '🎉 SUB', '🎉 MIEMBRO', '🎉 TESTER'] },
      { id: this._roles.adm, nombre: 'ADM', puedeAceptar: ['🎉 AUX', '🎉 LID', '🎉 SUB', '🎉 MIEMBRO', '🎉 TESTER'] },
      { id: this._roles.aux, nombre: 'AUX', puedeAceptar: ['🎉 LID', '🎉 SUB', '🎉 MIEMBRO', '🎉 TESTER'] },
    ];
  }

  /**
   * Verifica si la configuración es válida
   * @returns {{valid: boolean, errors: string[]}}
   */
  validate() {
    const errors = [];
    if (!this._bot.token) errors.push(`${this.prefix}_TOKEN es requerido`);
    if (!this._bot.serverId) errors.push(`${this.prefix}_SERVER_ID es requerido`);
    return { valid: errors.length === 0, errors };
  }
}

/**
 * Crear configuración para un bot específico
 * @param {string} prefix - Prefijo del bot (e.g., 'BOT1', 'BOT3')
 * @returns {ConfigManager}
 */
function createConfig(prefix) {
  return new ConfigManager(prefix);
}

module.exports = { ConfigManager, createConfig };