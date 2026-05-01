/**
 * Comando de Envío de Mensajes DM
 * Sistema para enviar mensajes a todos los miembros con ciertos roles
 */

const {
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');

/**
 * Crear handlers de DM
 * @param {Object} config - ConfigManager del bot
 */
function createDmHandlers(config) {
  const client = config.client;

  /**
   * Registrar comando /dm
   */
  async function setupDmCommand() {
    const guild = client.guilds.cache.get(config.bot.serverId);
    if (!guild) {
      console.log('[DM] Servidor no encontrado');
      return;
    }

    const commands = await guild.commands.fetch();
    const existingDm = commands.find(c => c.name === 'dm');
    if (existingDm) {
      await existingDm.delete();
      console.log('[DM] Comando /dm eliminado para recrear');
    }

    await guild.commands.create({
      name: 'dm',
      description: 'Enviar mensaje directo a todos los miembros (excepto Alta Cúpula y Resp.INT)',
    });

    console.log('[DM] Comando /dm creado');
  }

  /**
   * Verificar si el miembro tiene permiso para enviar DM
   */
  function hasPermisoEnviarDM(member) {
    if (!member) return false;
    return member.roles.cache.some(
      r =>
        r.id === config.roles.adm ||
        r.id === config.roles.aux ||
        r.id === config.roles.respInt ||
        r.id === config.roles.altaCupula
    );
  }

  // ============================================
  // HANDLERS DE INTERACCIÓN
  // ============================================

  /**
   * Handler para comando /dm
   */
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'dm') return;

    if (!hasPermisoEnviarDM(interaction.member)) {
      await interaction.reply({
        content: '❌ No tienes permisos para usar este comando.',
        ephemeral: true,
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId('dm_modal')
      .setTitle('📬 Enviar Mensaje a Miembros');

    const mensajeInput = new TextInputBuilder()
      .setCustomId('dm_mensaje')
      .setLabel('Mensaje')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Escribe el mensaje que quieres enviar a todos los miembros...')
      .setRequired(true)
      .setMaxLength(2000);

    const row = new ActionRowBuilder().addComponents(mensajeInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
  });

  /**
   * Handler para modal de DM
   */
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit() || interaction.customId !== 'dm_modal') return;

    const mensaje = interaction.fields.getTextInputValue('dm_mensaje');

    if (!mensaje) {
      await interaction.reply({
        content: '❌ Debes escribir un mensaje.',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: '📤 Enviando mensajes...',
      ephemeral: true,
    });

    const guild = interaction.guild;
    const excludedRoles = [config.roles.respInt, config.roles.altaCupula];

    let enviados = 0;
    let errores = 0;

    const members = await guild.members.fetch();

    for (const [, member] of members) {
      if (member.user.bot) continue;

      // Excluir roles que no deben recibir mensajes
      const hasExcludedRole = member.roles.cache.some(r => excludedRoles.includes(r.id));
      if (hasExcludedRole) continue;

      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle('📬 Mensaje del Staff')
          .setColor(config.colors.info)
          .setDescription(mensaje)
          .setTimestamp()
          .setFooter({ text: 'Staff' });

        await member.send({ embeds: [dmEmbed] });
        enviados++;
      } catch {
        errores++;
      }
    }

    await interaction.editReply({
      content: `✅ Mensaje enviado a ${enviados} miembros.\n❌ Errores: ${errores}`,
    });
  });

  return { setupDmCommand };
}

module.exports = { createDmHandlers };