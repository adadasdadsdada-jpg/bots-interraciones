/**
 * Shared modules index - Exports centralizados
 */

const { ConfigManager, createConfig } = require('./config');
const { Logger, createLogger } = require('./modules/logger');
const database = require('./modules/database');
const types = require('./types');

module.exports = {
  // Config
  ConfigManager,
  createConfig,

  // Modules
  Logger,
  createLogger,
  database,

  // Types
  ROLES: types.ROLES,
  NICKNAME_PREFIXES: types.NICKNAME_PREFIXES,
  ROLE_HIERARCHY: types.ROLE_HIERARCHY,
  VERIFICATION_STATUS: types.VERIFICATION_STATUS,
  VERIFICATION_STATE: types.VERIFICATION_STATE,
  MOD_ACTIONS: types.MOD_ACTIONS,
  ROLE_KEYS: types.ROLE_KEYS,
  ROLE_SELECT_OPTIONS: types.ROLE_SELECT_OPTIONS,
  ROLE_VALUE_MAP: types.ROLE_VALUE_MAP,
};