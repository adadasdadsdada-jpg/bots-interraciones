/**
 * Bot Principal - Entry point para bots de Staff
 * Usa la arquitectura modular compartida
 */

require('dotenv').config();

const { Client, GatewayIntentBits, Partials } = require('discord.js');

// Módulos compartidos
const { ConfigManager } = require('./shared/config');
const { initDatabase } = require('./shared/modules/database');

// Comandos y eventos
const { createPanelHandlers } = require('./commands/panel');
const { createDmHandlers } = require('./commands/dm');
const { createSetHandlers } = require('./events/sets');
const { createModerationHandlers } = require('./commands/moderation');

/**
 * Crear bot con configuración específica
 * @param {string} prefix - Prefijo para variables de entorno (e.g., 'BOT1', 'BOT3')
 */
function createBot(prefix) {
  const config = new ConfigManager(prefix);

  // Validar configuración
  const validation = config.validate();
  if (!validation.valid) {
    console.error(`[${prefix}] Configuración inválida:`, validation.errors);
    process.exit(1);
  }

  // Cliente de Discord
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  });

  // Asignar cliente a config para uso en handlers
  config.client = client;

  // Inicializar base de datos
  initDatabase();

  // Crear handlers
  const panelHandlers = createPanelHandlers(config);
  const dmHandlers = createDmHandlers(config);
  const setHandlers = createSetHandlers(config);
  const modHandlers = createModerationHandlers(config);

  // ============================================
  // EVENTOS DE DISCORD
  // ============================================

  client.on('ready', async () => {
    console.log(`[${prefix}] ✅ Conectado como ${client.user?.tag}`);
    console.log(`[${prefix}] 📗 Servidor: ${client.guilds.cache.first()?.name || 'N/A'}`);

    // Registrar comandos
    try {
      await panelHandlers.setupPanelCommand();
      await dmHandlers.setupDmCommand();
    } catch (err) {
      console.error(`[${prefix}] Error registrando comandos:`, err.message);
    }

    // Configurar handlers de sets
    setHandlers.setupSetHandlers();

    // Configurar comandos de moderación
    modHandlers.setupModCommands();
  });

  // Eventos de miembro
  client.on('guildMemberAdd', (member) => {
    if (member.guild.id === config.bot.serverId) {
      console.log(`[${prefix}] 👋 Miembro nuevo: ${member.user.tag}`);
    }
  });

  client.on('guildMemberRemove', (member) => {
    if (member.guild.id === config.bot.serverId) {
      console.log(`[${prefix}] 👋 Miembro salió: ${member.user.tag}`);
    }
  });

  // Eventos de mensaje
  client.on('messageDelete', (message) => {
    if (message.guild?.id === config.bot.serverId) {
      console.log(`[${prefix}] 🗑️ Mensaje eliminado en #${message.channel.name}`);
    }
  });

  // Manejo de errores
  client.on('error', (error) => {
    console.error(`[${prefix}] Error de Discord:`, error.message);
  });

  // Login
  client.login(config.bot.token).catch((err) => {
    console.error(`[${prefix}] Error al conectar:`, err.message);
  });

  return client;
}

// Si se ejecuta directamente, crear bot con prefijo BOT1
if (require.main === module) {
  const prefix = process.env.BOT_PREFIX || 'BOT1';
  console.log(`🎮 Iniciando bot con configuración ${prefix}...`);
  createBot(prefix);
}

module.exports = { createBot };