/**
 * Sistema de Sets - Manejo de solicitudes de sets de coordenadas
 * Con botones de aceptar/rechazar y persistencia en base de datos
 */

const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  TextChannel,
} = require('discord.js');

const { createSetRequest, updateSetStatus } = require('../shared/modules/database');

/**
 * Crear handlers de sets
 * @param {Object} config - ConfigManager del bot
 */
function createSetHandlers(config) {
  const client = config.client;

  /**
   * Configurar el sistema de sets
   * Busca mensajes existentes en el canal de sets pendientes y les añade botones
   */
  function setupSetHandlers() {
    const channelSetPendientes = client.channels.cache.get(config.channels.setsPendientes);

    if (channelSetPendientes && channelSetPendientes.isTextBased()) {
      const fetchMessages = async () => {
        try {
          const messages = await channelSetPendientes.messages.fetch({ limit: 100 });
          messages.forEach((message) => {
            if (!message.author.bot && message.components.length === 0) {
              addSetButtons(message);
            }
          });
        } catch (err) {
          console.log('[SETS] Error fetching messages:', err.message);
        }
      };

      // Delay para esperar a que el cliente esté completamente listo
      setTimeout(fetchMessages, 3000);
    }

    // Listener para nuevos mensajes en el canal de sets
    client.on('messageCreate', async (message) => {
      if (
        message.guild?.id === config.bot.serverId &&
        message.channel.id === config.channels.setsPendientes &&
        !message.author.bot
      ) {
        addSetButtons(message);
      }
    });

    // Listener para interacciones (botones)
    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isButton()) return;

      const customId = interaction.customId;

      if (customId.startsWith('set_accept_')) {
        const messageId = customId.replace('set_accept_', '');
        await handleSetAccept(interaction, messageId, config);
      } else if (customId.startsWith('set_reject_')) {
        const messageId = customId.replace('set_reject_', '');
        await handleSetReject(interaction, messageId, config);
      }
    });

    console.log('[SETS] Handlers configurados');
  }

  return { setupSetHandlers };
}

/**
 * Añadir botones de aceptar/rechazar a un mensaje
 * @param {Object} message - Mensaje de Discord
 */
async function addSetButtons(message) {
  if (message.components.length > 0) return;

  const acceptBtn = new ButtonBuilder()
    .setCustomId(`set_accept_${message.id}`)
    .setLabel('Aceptar')
    .setStyle(ButtonStyle.Success)
    .setEmoji('✅');

  const rejectBtn = new ButtonBuilder()
    .setCustomId(`set_reject_${message.id}`)
    .setLabel('Rechazar')
    .setStyle(ButtonStyle.Danger)
    .setEmoji('❌');

  const row = new ActionRowBuilder().addComponents(acceptBtn, rejectBtn);

  try {
    await message.edit({ components: [row] });
  } catch (err) {
    console.log('[SETS] Error adding buttons:', err.message);
  }
}

/**
 * Manejar aceptación de set
 */
async function handleSetAccept(interaction, messageId, config) {
  const channel = interaction.channel;
  if (!channel || !channel.isTextBased()) return;

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) {
    await interaction.reply({ content: '❌ Mensaje no encontrado.', ephemeral: true });
    return;
  }

  const guild = interaction.guild;
  const member = message.member || await guild.members.fetch(message.author.id).catch(() => null);

  if (member) {
    // Asignar rol de miembro
    const miembroRole = guild.roles.cache.get(config.roles.miembro);
    if (miembroRole) {
      await member.roles.add(miembroRole).catch(() => {});
    }

    // Generar nickname
    const content = message.content || '';
    const lines = content.split('\n');
    let nombreSet = message.author.username;
    let idSet = '00000';

    // Extraer ID del contenido
    const idMatch = content.match(/ID:?\s*(\d+)/i) || content.match(/(\d{4,})/);
    if (idMatch) {
      idSet = idMatch[1];
    }

    // Extraer nombre del set
    const nombreMatch = content.match(/Nombre:?\s*([^\n]+)/i);
    if (nombreMatch) {
      nombreSet = nombreMatch[1].trim();
    } else if (lines.length > 0) {
      nombreSet = lines[0].substring(0, 30);
    }

    // Actualizar nickname
    if (member.manageable) {
      const nickname = `.FT |🎉${nombreSet} | ${idSet}`;
      await member.setNickname(nickname).catch(() => {});
    }

    // Notificar al usuario
    await member.send('✅ Tu set ha sido aprobado. Bienvenido!').catch(() => {});
  }

  // Registrar en base de datos
  createSetRequest(message.author.id, message.author.tag, nombreSet, messageId);
  updateSetStatus(messageId, 'APROBADO');

  // Enviar a canal de aceptados
  const aceptadosChannel = guild.channels.cache.get(config.channels.setsAceptados);
  if (aceptadosChannel && aceptadosChannel.isTextBased()) {
    const embed = new EmbedBuilder()
      .setTitle('✅ SET ACEPTADO')
      .setColor(config.colors.success)
      .addFields(
        { name: 'Usuario', value: message.author.tag, inline: true },
        { name: 'Contenido', value: truncate(message.content, 1024) || 'N/A' }
      )
      .setTimestamp();

    await aceptadosChannel.send({ embeds: [embed] });
  }

  // Eliminar mensaje original y responder
  await message.delete().catch(() => {});
  await interaction.reply({ content: '✅ Set aceptado y movido a #sets-aceptados', ephemeral: true });
}

/**
 * Manejar rechazo de set
 */
async function handleSetReject(interaction, messageId, config) {
  const channel = interaction.channel;
  if (!channel || !channel.isTextBased()) return;

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) {
    await interaction.reply({ content: '❌ Mensaje no encontrado.', ephemeral: true });
    return;
  }

  // Notificar al usuario
  const member = message.member || await interaction.guild.members.fetch(message.author.id).catch(() => null);
  if (member) {
    await member.send('❌ Tu set ha sido rechazado. Contacta a un ADM para más información.').catch(() => {});
  }

  // Registrar en base de datos
  createSetRequest(message.author.id, message.author.tag, 'RECHAZADO', messageId);
  updateSetStatus(messageId, 'RECHAZADO');

  // Enviar a canal de rechazados
  const rechazadosChannel = interaction.guild.channels.cache.get(config.channels.setsRechazados);
  if (rechazadosChannel && rechazadosChannel.isTextBased()) {
    const embed = new EmbedBuilder()
      .setTitle('❌ SET RECHAZADO')
      .setColor(config.colors.error)
      .addFields(
        { name: 'Usuario', value: message.author.tag, inline: true },
        { name: 'Contenido', value: truncate(message.content, 1024) || 'N/A' }
      )
      .setTimestamp();

    await rechazadosChannel.send({ embeds: [embed] });
  }

  // Eliminar mensaje original y responder
  await message.delete().catch(() => {});
  await interaction.reply({ content: '❌ Set rechazado y movido a #sets-rechazados', ephemeral: true });
}

/**
 * Truncar texto
 */
function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.substring(0, maxLen - 3) + '...' : str;
}

module.exports = { createSetHandlers };