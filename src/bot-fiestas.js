/**
 * Bot Launcher - FIESTAS
 * Configuración específica para el bot de FIESTAS
 */

require('dotenv').config();

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { ConfigManager } = require('./shared/config');
const { initDatabase } = require('./shared/modules/database');
const { createPanelHandlers } = require('./commands/fiestas/panel');
const { createDmHandlers } = require('./commands/fiestas/dm');
const { createSetHandlers } = require('./commands/fiestas/sets');
const { createModerationHandlers } = require('./commands/fiestas/moderation');

const BOT_PREFIX = 'FIESTAS';

function createFiestasBot() {
  const config = new ConfigManager(BOT_PREFIX);

  const validation = config.validate();
  if (!validation.valid) {
    console.warn(`[${BOT_PREFIX}] ⚠️ Configuración inválida:`, validation.errors);
    console.warn(`[${BOT_PREFIX}] Saltando inicialización...`);
    return null;
  }

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

  config.client = client;

  const panelHandlers = createPanelHandlers(config);
  const dmHandlers = createDmHandlers(config);
  const setHandlers = createSetHandlers(config);
  const modHandlers = createModerationHandlers(config);

  client.on('ready', async () => {
    console.log(`\n========================================`);
    console.log(`[${BOT_PREFIX}] ✅ Conectado como ${client.user?.tag}`);
    console.log(`[${BOT_PREFIX}] 📗 Servidor: ${client.guilds.cache.first()?.name || 'N/A'}`);
    console.log(`[${BOT_PREFIX}] 🆔 Server ID: ${config.bot.serverId}`);
    console.log(`========================================\n`);

    try {
      await panelHandlers.setupPanelCommand();
      await dmHandlers.setupDmCommand();
      console.log(`[${BOT_PREFIX}] ✅ Comandos registrados`);
    } catch (err) {
      console.error(`[${BOT_PREFIX}] Error registrando comandos:`, err.message);
    }

    try {
      setHandlers.setupSetHandlers();
    } catch (err) {
      console.error(`[${BOT_PREFIX}] Error configurando sets:`, err.message);
    }

    try {
      modHandlers.setupModCommands();
    } catch (err) {
      console.error(`[${BOT_PREFIX}] Error configurando moderación:`, err.message);
    }
  });

  client.on('guildMemberAdd', (member) => {
    if (member.guild.id === config.bot.serverId) {
      console.log(`[${BOT_PREFIX}] 👋 Nuevo miembro: ${member.user.tag}`);
    }
  });

  client.on('guildMemberRemove', (member) => {
    if (member.guild.id === config.bot.serverId) {
      console.log(`[${BOT_PREFIX}] 👋 Miembro salió: ${member.user.tag}`);
    }
  });

  client.on('messageDelete', (message) => {
    if (message.guild?.id === config.bot.serverId) {
      console.log(`[${BOT_PREFIX}] 🗑️ Mensaje eliminado en #${message.channel.name}`);
    }
  });

  client.on('error', (error) => {
    console.error(`[${BOT_PREFIX}] Error de Discord:`, error.message);
  });

  client.login(config.bot.token).catch((err) => {
    console.error(`[${BOT_PREFIX}] ❌ Error al conectar:`, err.message);
  });

  return client;
}

if (require.main === module) {
  console.log('═══════════════════════════════════════');
  console.log('🎮 BOT FIESTAS - STAFF VERIFICATION');
  console.log('═══════════════════════════════════════\n');

  initDatabase();

  const bot = createFiestasBot();

  if (bot) {
    console.log('✅ FIESTAS bot iniciado correctamente');
  } else {
    console.error('❌ Error iniciando FIESTAS bot');
    process.exit(1);
  }

  process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando FIESTAS bot...');
    bot.destroy();
    process.exit(0);
  });
}

module.exports = { createFiestasBot };