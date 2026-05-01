/**
 * Tipos y constantes compartidas para bots de Staff
 */

// Nombres de roles (display)
const ROLES = {
  ALTA_CUPULA: '🔥 Alta Cúpula',
  RESP_INT: '💀 Resp.INT',
  ADM: '🎉 ADM',
  AUX: '🎉 AUX',
  LID: '🎉 LID',
  SUB: '🎉 SUB',
  MIEMBRO: '🎉 MIEMBRO',
  TESTER: '🎉 TESTER',
};

// Prefijos de nickname por rol
const NICKNAME_PREFIXES = {
  [ROLES.ALTA_CUPULA]: '🔥 ',
  [ROLES.RESP_INT]: 'Resp.INT|💀',
  [ROLES.ADM]: 'ADM.FT |🎉',
  [ROLES.AUX]: 'Aux.FT |🎉',
  [ROLES.LID]: 'Lid.FT |🎉',
  [ROLES.SUB]: 'Sub.FT |🎉',
  [ROLES.MIEMBRO]: 'FT |🎉',
  [ROLES.TESTER]: 'FT-T |🎉',
};

// Jerarquía de roles (orden de mayor a menor)
const ROLE_HIERARCHY = [
  ROLES.ADM,
  ROLES.AUX,
  ROLES.LID,
  ROLES.SUB,
  ROLES.MIEMBRO,
  ROLES.TESTER,
];

// Estados de verificación
const VERIFICATION_STATUS = {
  PENDIENTE: 'PENDIENTE',
  APROBADO: 'APROBADO',
  RECHAZADO: 'RECHAZADO',
};

// Estados de FSM de verificación
const VERIFICATION_STATE = {
  DORMANT: 'DORMANT',
  AWAITING_DATA: 'AWAITING_DATA',
  AWAITING_ROLE: 'AWAITING_ROLE',
  PENDING_REVIEW: 'PENDING_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

// Acciones de moderación
const MOD_ACTIONS = {
  KICK: 'KICK',
  BAN: 'BAN',
  MUTE: 'MUTE',
  WARN: 'WARN',
};

/**
 * Mapping de claves de rol a IDs de rol (para ConfigManager)
 */
const ROLE_KEYS = {
  altaCupula: 'ROLE_ALTA_CUPULA',
  respInt: 'ROLE_RESP_INT',
  adm: 'ROLE_ADM',
  aux: 'ROLE_AUX',
  lid: 'ROLE_LID',
  sub: 'ROLE_SUB',
  miembro: 'ROLE_MIEMBRO',
  tester: 'ROLE_TESTER',
};

/**
 * Opciones de select menu para rangos
 */
const ROLE_SELECT_OPTIONS = [
  { label: '🔥 Alta Cúpula', value: 'ALTA_CUPULA' },
  { label: '💀 Resp.INT', value: 'RESP_INT' },
  { label: '🎉 ADM', value: 'ADM' },
  { label: '🎉 AUX', value: 'AUX' },
  { label: '🎉 LID', value: 'LID' },
  { label: '🎉 SUB', value: 'SUB' },
  { label: '🎉 MIEMBRO', value: 'MIEMBRO' },
  { label: '🎉 TESTER', value: 'TESTER' },
];

/**
 * Mapeo de clave de rol a nombre de rol
 */
const ROLE_VALUE_MAP = {
  ALTA_CUPULA: ROLES.ALTA_CUPULA,
  RESP_INT: ROLES.RESP_INT,
  ADM: ROLES.ADM,
  AUX: ROLES.AUX,
  LID: ROLES.LID,
  SUB: ROLES.SUB,
  MIEMBRO: ROLES.MIEMBRO,
  TESTER: ROLES.TESTER,
};

module.exports = {
  ROLES,
  NICKNAME_PREFIXES,
  ROLE_HIERARCHY,
  VERIFICATION_STATUS,
  VERIFICATION_STATE,
  MOD_ACTIONS,
  ROLE_KEYS,
  ROLE_SELECT_OPTIONS,
  ROLE_VALUE_MAP,
};