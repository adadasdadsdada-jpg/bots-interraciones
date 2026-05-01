/**
 * Módulo de base de datos - Persistencia JSON
 * Sistema de almacenamiento para verificaciones, sets y logs de moderación
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');

// Interfaces
/**
 * @typedef {Object} VerificationRequest
 * @property {number} id
 * @property {string} userId
 * @property {string} username
 * @property {string} nombreIC
 * @property {string} idPersonaje
 * @property {string} rangoSolicitado
 * @property {'PENDIENTE'|'APROBADO'|'RECHAZADO'} status
 * @property {string} createdAt
 * @property {string} [processedBy]
 * @property {string} [processedAt]
 */

/**
 * @typedef {Object} SetRequest
 * @property {number} id
 * @property {string} userId
 * @property {string} username
 * @property {string} nombreSet
 * @property {string} messageId
 * @property {'PENDIENTE'|'APROBADO'|'RECHAZADO'} status
 * @property {string} createdAt
 */

/**
 * @typedef {Object} ModLog
 * @property {number} id
 * @property {string} action
 * @property {string} targetId
 * @property {string} targetTag
 * @property {string} moderatorId
 * @property {string} moderatorTag
 * @property {string} [reason]
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Database
 * @property {VerificationRequest[]} verificationRequests
 * @property {SetRequest[]} setRequests
 * @property {ModLog[]} modLogs
 */

let db = {
  verificationRequests: [],
  setRequests: [],
  modLogs: [],
};

let nextIds = { verification: 1, set: 1, modLog: 1 };

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getDbFile() {
  return path.join(DATA_DIR, 'bot_data.json');
}

function loadDatabase() {
  try {
    ensureDataDir();
    const dbFile = getDbFile();
    if (fs.existsSync(dbFile)) {
      const data = fs.readFileSync(dbFile, 'utf-8');
      const parsed = JSON.parse(data);
      db = parsed.db || db;
      nextIds = parsed.nextIds || { verification: 1, set: 1, modLog: 1 };
    }
  } catch (err) {
    console.log('[DB] Error cargando base de datos:', err.message);
  }
}

function saveDatabase() {
  try {
    ensureDataDir();
    const dbFile = getDbFile();
    fs.writeFileSync(dbFile, JSON.stringify({ db, nextIds }, null, 2));
  } catch (err) {
    console.log('[DB] Error guardando base de datos:', err.message);
  }
}

/**
 * Inicializar la base de datos
 */
function initDatabase() {
  loadDatabase();
  console.log('[DB] Base de datos inicializada');
}

/**
 * Crear solicitud de verificación
 * @param {string} userId
 * @param {string} username
 * @param {string} nombreIC
 * @param {string} idPersonaje
 * @param {string} rangoSolicitado
 * @returns {VerificationRequest}
 */
function createVerificationRequest(userId, username, nombreIC, idPersonaje, rangoSolicitado) {
  const request = {
    id: nextIds.verification++,
    userId,
    username,
    nombreIC,
    idPersonaje,
    rangoSolicitado,
    status: 'PENDIENTE',
    createdAt: new Date().toISOString(),
  };
  db.verificationRequests.push(request);
  saveDatabase();
  return request;
}

/**
 * Obtener solicitudes de verificación
 * @param {string} [status] - Filtrar por estado
 * @returns {VerificationRequest[]}
 */
function getVerificationRequests(status) {
  if (status) {
    return db.verificationRequests.filter(r => r.status === status);
  }
  return db.verificationRequests.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Actualizar estado de verificación
 * @param {number} id
 * @param {string} status
 * @param {string} processedBy
 * @returns {VerificationRequest|undefined}
 */
function updateVerificationStatus(id, status, processedBy) {
  const request = db.verificationRequests.find(r => r.id === id);
  if (request) {
    request.status = status;
    request.processedBy = processedBy;
    request.processedAt = new Date().toISOString();
    saveDatabase();
  }
  return request;
}

/**
 * Crear solicitud de set
 * @param {string} userId
 * @param {string} username
 * @param {string} nombreSet
 * @param {string} messageId
 * @returns {SetRequest}
 */
function createSetRequest(userId, username, nombreSet, messageId) {
  const request = {
    id: nextIds.set++,
    userId,
    username,
    nombreSet,
    messageId,
    status: 'PENDIENTE',
    createdAt: new Date().toISOString(),
  };
  db.setRequests.push(request);
  saveDatabase();
  return request;
}

/**
 * Obtener solicitudes de sets
 * @param {string} [status]
 * @returns {SetRequest[]}
 */
function getSetRequests(status) {
  if (status) {
    return db.setRequests.filter(r => r.status === status);
  }
  return db.setRequests.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Actualizar estado de set
 * @param {number} id
 * @param {string} status
 * @returns {SetRequest|undefined}
 */
function updateSetStatus(id, status) {
  const request = db.setRequests.find(r => r.id === id);
  if (request) {
    request.status = status;
    saveDatabase();
  }
  return request;
}

/**
 * Registrar acción de moderación
 * @param {string} action
 * @param {string} targetId
 * @param {string} targetTag
 * @param {string} moderatorId
 * @param {string} moderatorTag
 * @param {string} [reason]
 * @returns {ModLog}
 */
function logModAction(action, targetId, targetTag, moderatorId, moderatorTag, reason) {
  const log = {
    id: nextIds.modLog++,
    action,
    targetId,
    targetTag,
    moderatorId,
    moderatorTag,
    reason,
    createdAt: new Date().toISOString(),
  };
  db.modLogs.push(log);
  saveDatabase();
  return log;
}

/**
 * Obtener logs de moderación
 * @param {number} [limit]
 * @returns {ModLog[]}
 */
function getModLogs(limit) {
  const logs = db.modLogs.sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return limit ? logs.slice(0, limit) : logs;
}

/**
 * Limpiar solicitudes expiradas (más de 24 horas)
 */
function cleanupExpiredRequests() {
  const now = Date.now();
  const expirationTime = 24 * 60 * 60 * 1000; // 24 horas

  const beforeCount = db.verificationRequests.length;
  db.verificationRequests = db.verificationRequests.filter(r => {
    if (r.status !== 'PENDIENTE') return true;
    const createdTime = new Date(r.createdAt).getTime();
    return (now - createdTime) < expirationTime;
  });

  const removed = beforeCount - db.verificationRequests.length;
  if (removed > 0) {
    saveDatabase();
    console.log(`[DB] Limpiadas ${removed} solicitudes expiradas`);
  }
  return removed;
}

module.exports = {
  initDatabase,
  createVerificationRequest,
  getVerificationRequests,
  updateVerificationStatus,
  createSetRequest,
  getSetRequests,
  updateSetStatus,
  logModAction,
  getModLogs,
  cleanupExpiredRequests,
};