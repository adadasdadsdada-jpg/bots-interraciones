/**
 * Bot Launcher - Ejecutar múltiples bots con configuraciones diferentes
 * Cada bot tiene su propio prefijo de variables de entorno
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
 * Crear una instancia de bot con configuración específica
 * @param {string} prefix - Prefijo para variables de entorno (e.g., 'BOT1', 'BOT3')
 * @returns {Client}
 */
function createBot(prefix) {
  const config = new ConfigManager(prefix);

  // Validar configuración
  const validation = config.validate();
  if (!validation.valid) {
    console.warn(`[${prefix}] ⚠️ Configuración inválida:`, validation.errors);
    console.warn(`[${prefix}] Saltando inicialización...`);
    return null;
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

  // Crear handlers
  const panelHandlers = createPanelHandlers(config);
  const dmHandlers = createDmHandlers(config);
  const setHandlers = createSetHandlers(config);
  const modHandlers = createModerationHandlers(config);

  // ============================================
  // EVENTOS DE DISCORD
  // ============================================

  client.on('ready', async () => {
    console.log(`\n========================================`);
    console.log(`[${prefix}] ✅ Conectado como ${client.user?.tag}`);
    console.log(`[${prefix}] 📗 Servidor: ${client.guilds.cache.first()?.name || 'N/A'}`);
    console.log(`========================================\n`);

    // Registrar comandos
    try {
      await panelHandlers.setupPanelCommand();
      await dmHandlers.setupDmCommand();
      console.log(`[${prefix}] ✅ Comandos registrados`);
    } catch (err) {
      console.error(`[${prefix}] Error registrando comandos:`, err.message);
    }

    // Configurar handlers de sets
    try {
      setHandlers.setupSetHandlers();
    } catch (err) {
      console.error(`[${prefix}] Error configurando sets:`, err.message);
    }

    // Configurar comandos de moderación
    try {
      modHandlers.setupModCommands();
    } catch (err) {
      console.error(`[${prefix}] Error configurando moderación:`, err.message);
    }
  });

  // Eventos de miembro
  client.on('guildMemberAdd', (member) => {
    if (member.guild.id === config.bot.serverId) {
      console.log(`[${prefix}] 👋 Nuevo miembro: ${member.user.tag}`);
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
    console.error(`[${prefix}] ❌ Error al conectar:`, err.message);
  });

  return client;
}

/**
 * Launcher principal
 */
function launchAllBots() {
  console.log('═══════════════════════════════════════');
  console.log('🎮 MULTI-BOT STAFF SYSTEM');
  console.log('═══════════════════════════════════════\n');

  // Inicializar base de datos compartida
  initDatabase();

  // Bots a iniciar
  const botPrefixes = ['BOT1', 'BOT3'];

  const bots = [];

  for (const prefix of botPrefixes) {
    const token = process.env(`${prefix}_TOKEN`);
    if (token) {
      console.log(`📋 Iniciando bot ${prefix}...`);
      const bot = createBot(prefix);
      if (bot) {
        bots.push({ prefix, bot });
      }
    } else {
      console.log(`⚠️ ${prefix}_TOKEN no configurado, saltando...`);
    }
  }

  console.log(`\n✅ ${bots.length} bot(s) iniciado(s)\n`);

  // Cleanup al cerrar
  process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando bots...');
    for (const { prefix, bot } of bots) {
      console.log(`[${prefix}] Cerrando...`);
      bot.destroy();
    }
    process.exit(0);
  });
}

// Ejecutar si se llama directamente
if (require.main === module) {
  launchAllBots();
}

module.exports = { createBot, launchAllBots };