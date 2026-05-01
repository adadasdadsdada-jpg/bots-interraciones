/**
 * Comando de Panel de Verificación
 * Sistema completo de verificación con FSM y persistencia
 */

const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');

const { createVerificationRequest, updateVerificationStatus } = require('../modules/database');
const { ROLES, ROLE_SELECT_OPTIONS, ROLE_VALUE_MAP, NICKNAME_PREFIXES } = require('../types');

/**
 * Panel data - textos configurables
 */
const PANEL_DATA = {
  title: 'BIENVENIDO AL SISTEMA DE VERIFICACIÓN',
  description: 'Solicita tu acceso al staff',
  howItWorks: '📋 Cómo funciona?\n• Selecciona tu rango del menú\n• Completa el formulario\n• Espera autorización',
  dataRequired: '📝 Datos requeridos\n• Nombre IC\n• ID de personaje',
  note: '⚡ Nota\nAlta Cúpula solo puede ser aprobado por DEV o Alta Cúpula',
  footer: 'Staff v2.0',
};

/**
 * Configuración del panel
 * @param {Object} config - ConfigManager del bot
 * @returns {Object} Handlers configurados
 */
function createPanelHandlers(config) {
  const client = config.client;

  /**
   * Registrar comandos de panel
   */
  async function setupPanelCommand() {
    const guild = client.guilds.cache.get(config.bot.serverId);
    if (!guild) {
      console.log('[PANEL] Servidor no encontrado');
      return;
    }

    const commands = await guild.commands.fetch();
    const existingPanel = commands.find(c => c.name === 'panel');
    if (existingPanel) {
      await existingPanel.delete();
      console.log('[PANEL] Comando /panel eliminado para recrear');
    }

    await guild.commands.create({
      name: 'panel',
      description: 'Muestra el panel de verificación del staff',
    });

    console.log('[PANEL] Comando /panel creado');
  }

  /**
   * Handler para comando /panel
   */
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'panel') return;

    const embed = new EmbedBuilder()
      .setTitle(`**${PANEL_DATA.title}**`)
      .setDescription(`**${PANEL_DATA.description}**\n\n${PANEL_DATA.howItWorks}\n\n${PANEL_DATA.dataRequired}\n\n${PANEL_DATA.note}`)
      .setColor(config.colors.verify)
      .setFooter({ text: `${PANEL_DATA.footer} • ${new Date().toLocaleDateString('es-ES')}` });

    const verifyButton = new ButtonBuilder()
      .setCustomId('verify_open_modal')
      .setLabel('Verificarse')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🛡️');

    const row = new ActionRowBuilder().addComponents(verifyButton);

    await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
  });

  /**
   * Handler para botón de verificación
   */
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || interaction.customId !== 'verify_open_modal') return;

    const rangoSelectMenu = new StringSelectMenuBuilder()
      .setCustomId('verify_role_select')
      .setPlaceholder('Selecciona tu rango')
      .addOptions(ROLE_SELECT_OPTIONS);

    const rangoRow = new ActionRowBuilder().addComponents(rangoSelectMenu);

    await interaction.reply({
      content: '**Selecciona tu rango:**',
      components: [rangoRow],
      ephemeral: true,
    });
  });

  /**
   * Handler para selección de rol
   */
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu() || interaction.customId !== 'verify_role_select') return;

    const selectedRole = interaction.values[0];

    const modal = new ModalBuilder()
      .setCustomId('verify_modal')
      .setTitle('Formulario de Verificación');

    const nombreICInput = new TextInputBuilder()
      .setCustomId('verify_nombre_ic')
      .setLabel('Nombre IC')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ej: Jack Martinez')
      .setRequired(true)
      .setMinLength(2)
      .setMaxLength(50);

    const idPersonajeInput = new TextInputBuilder()
      .setCustomId('verify_id_personaje')
      .setLabel('ID de Personaje')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Ej: 69899')
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(20);

    // Hidden field with selected role
    const rangoInput = new TextInputBuilder()
      .setCustomId('verify_rango')
      .setLabel('Rango')
      .setStyle(TextInputStyle.Short)
      .setValue(selectedRole)
      .setRequired(true)
      .setMaxLength(20);

    const firstRow = new ActionRowBuilder().addComponents(nombreICInput);
    const secondRow = new ActionRowBuilder().addComponents(idPersonajeInput);
    const thirdRow = new ActionRowBuilder().addComponents(rangoInput);

    modal.addComponents(firstRow, secondRow, thirdRow);

    await interaction.showModal(modal);
  });

  /**
   * Handler para modal de verificación
   */
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit() || interaction.customId !== 'verify_modal') return;

    const nombreIC = interaction.fields.getTextInputValue('verify_nombre_ic');
    const idPersonaje = interaction.fields.getTextInputValue('verify_id_personaje');
    const rangoKey = interaction.fields.getTextInputValue('verify_rango');

    const rangoSolicitado = ROLE_VALUE_MAP[rangoKey] || ROLES.MIEMBRO;

    // Guardar en base de datos
    createVerificationRequest(
      interaction.user.id,
      interaction.user.tag,
      nombreIC,
      idPersonaje,
      rangoSolicitado
    );

    // Enviar al canal de moderadores
    const moderatorChannel = client.channels.cache.get(config.channels.setsPendientes);

    if (moderatorChannel && moderatorChannel.isTextBased() && !moderatorChannel.isDMBased()) {
      const requestEmbed = new EmbedBuilder()
        .setTitle('📋 Nueva Solicitud de Verificación')
        .setColor(config.colors.info)
        .addFields(
          { name: 'Usuario', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
          { name: 'Nombre IC', value: nombreIC, inline: true },
          { name: 'ID Personaje', value: idPersonaje, inline: true },
          { name: 'Rango Solicitado', value: rangoSolicitado, inline: true }
        )
        .setTimestamp();

      const approveBtn = new ButtonBuilder()
        .setCustomId(`verify_approve_${interaction.user.id}`)
        .setLabel('Aprobar')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅');

      const rejectBtn = new ButtonBuilder()
        .setCustomId(`verify_reject_${interaction.user.id}`)
        .setLabel('Rechazar')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌');

      const row = new ActionRowBuilder().addComponents(approveBtn, rejectBtn);

      await moderatorChannel.send({ embeds: [requestEmbed], components: [row] });
    }

    await interaction.reply({
      content: '✅ Tu solicitud ha sido enviada. Un administrador la revisará pronto.',
      ephemeral: true,
    });
  });

  /**
   * Handler para botones de aprobar/rechazar
   */
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;

    if (customId.startsWith('verify_approve_')) {
      const userId = customId.replace('verify_approve_', '');
      await handleVerifyApprove(interaction, userId, config);
    } else if (customId.startsWith('verify_reject_')) {
      const userId = customId.replace('verify_reject_', '');
      await handleVerifyReject(interaction, userId);
    }
  });

  return { setupPanelCommand };
}

/**
 * Manejar aprobación de verificación
 */
async function handleVerifyApprove(interaction, targetUserId, config) {
  const guild = interaction.guild;
  const member = await guild.members.fetch(targetUserId).catch(() => null);

  if (!member) {
    await interaction.reply({ content: '❌ No se encontró el usuario.', ephemeral: true });
    return;
  }

  // Buscar solicitud pendiente
  const { getVerificationRequests } = require('../modules/database');
  const verificationRequests = getVerificationRequests('PENDIENTE');
  const request = verificationRequests.find(
    r => r.userId === targetUserId && r.status === 'PENDIENTE'
  );

  if (!request) {
    await interaction.reply({ content: '⚠️ No se encontró solicitud pendiente para este usuario.', ephemeral: true });
    return;
  }

  // Mapping de roles
  const rangoRoleIdMap = {
    [ROLES.ALTA_CUPULA]: config.roles.altaCupula,
    [ROLES.RESP_INT]: config.roles.respInt,
    [ROLES.ADM]: config.roles.adm,
    [ROLES.AUX]: config.roles.aux,
    [ROLES.LID]: config.roles.lid,
    [ROLES.SUB]: config.roles.sub,
    [ROLES.MIEMBRO]: config.roles.miembro,
    [ROLES.TESTER]: config.roles.tester,
  };

  // Remover roles anteriores de staff
  const previousRoles = [
    config.roles.altaCupula,
    config.roles.respInt,
    config.roles.adm,
    config.roles.aux,
    config.roles.lid,
    config.roles.sub,
    config.roles.miembro,
    config.roles.tester,
  ];

  for (const roleIdToRemove of previousRoles) {
    const oldRole = guild.roles.cache.get(roleIdToRemove);
    if (oldRole && member.roles.cache.has(oldRole.id)) {
      await member.roles.remove(oldRole).catch(() => {});
    }
  }

  // Asignar nuevo rol
  const roleId = rangoRoleIdMap[request.rangoSolicitado];
  const role = roleId ? guild.roles.cache.get(roleId) : null;

  if (role) {
    await member.roles.add(role).catch(() => {});
  }

  // Actualizar nickname
  const prefix = NICKNAME_PREFIXES[request.rangoSolicitado];
  if (prefix && member.manageable) {
    const userTag = member.user.tag || '';
    const tagParts = userTag.split('#');
    const userName = tagParts[0] || userTag;
    const userDiscrim = tagParts.length > 1 ? `#${tagParts[1]}` : '';

    let newNickname = '';
    if (request.rangoSolicitado === ROLES.ALTA_CUPULA) {
      newNickname = `🔥 ${userName} ${userDiscrim}`;
    } else if (request.rangoSolicitado === ROLES.RESP_INT) {
      newNickname = `Resp.INT|💀 ${userName} ${userDiscrim}`;
    } else {
      newNickname = `${prefix}${request.nombreIC} | ${request.idPersonaje}`;
    }
    await member.setNickname(newNickname).catch(() => {});
  }

  // Actualizar estado en BD
  updateVerificationStatus(request.id, 'APROBADO', interaction.user.id);

  // Deshabilitar botones
  if (interaction.message && interaction.message.components) {
    const newComponents = interaction.message.components.map((actionRow) => {
      const disabledComponents = actionRow.components.map((comp) => {
        if (comp.type === 2) {
          return ButtonBuilder.from(comp).setDisabled(true);
        }
        return comp;
      });
      return ActionRowBuilder.from(actionRow).setComponents(disabledComponents);
    });
    await interaction.message.edit({ components: newComponents }).catch(() => {});
  }

  // Notificar al canal de aceptados
  const aceptadosChannel = guild.channels.cache.get(config.channels.setsAceptados);
  if (aceptadosChannel && aceptadosChannel.isTextBased()) {
    const approvalEmbed = new EmbedBuilder()
      .setTitle('✅ VERIFICACIÓN APROBADA')
      .setColor(config.colors.success)
      .setDescription('✨ ¡Felicidades! La verificación ha sido aprobada.')
      .addFields(
        { name: 'Solicitante', value: `**${NICKNAME_PREFIXES[request.rangoSolicitado] || ''}${request.nombreIC}** | ${request.idPersonaje}`, inline: true }
      )
      .addFields(
        { name: 'Discord', value: `${member.user.tag} (${member.user.userId})`, inline: true }
      )
      .addFields(
        { name: '📝 Nombre IC', value: request.nombreIC, inline: true },
        { name: '🎮 ID', value: request.idPersonaje, inline: true },
        { name: '⭐ Rango Solicitado', value: request.rangoSolicitado, inline: true },
        { name: '👮 Autorizado por', value: `${interaction.user.tag} (${interaction.user.id})`, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: 'Staff - Sistema de Verificación' });

    await aceptadosChannel.send({ embeds: [approvalEmbed] });
  }

  // Enviar DM al usuario
  await member.send('✅ Tu solicitud ha sido aprobada. Bienvenido al staff!').catch(() => {});

  await interaction.reply({ content: `✅ Solicitud de ${member.user.tag} aprobada.`, ephemeral: true });
}

/**
 * Manejar rechazo de verificación
 */
async function handleVerifyReject(interaction, targetUserId) {
  const { getVerificationRequests, updateVerificationStatus } = require('../modules/database');
  const verificationRequests = getVerificationRequests('PENDIENTE');
  const request = verificationRequests.find(
    r => r.userId === targetUserId && r.status === 'PENDIENTE'
  );

  if (!request) {
    await interaction.reply({ content: '⚠️ No se encontró solicitud pendiente para este usuario.', ephemeral: true });
    return;
  }

  updateVerificationStatus(request.id, 'RECHAZADO', interaction.user.id);

  // Deshabilitar botones
  if (interaction.message && interaction.message.components) {
    const newComponents = interaction.message.components.map((actionRow) => {
      const disabledComponents = actionRow.components.map((comp) => {
        if (comp.type === 2) {
          return ButtonBuilder.from(comp).setDisabled(true);
        }
        return comp;
      });
      return ActionRowBuilder.from(actionRow).setComponents(disabledComponents);
    });
    await interaction.message.edit({ components: newComponents }).catch(() => {});
  }

  // Enviar DM al usuario
  const guild = interaction.guild;
  const member = await guild.members.fetch(targetUserId).catch(() => null);
  if (member) {
    await member.send('❌ Tu solicitud ha sido rechazada. Contacta a un ADM para más información.').catch(() => {});
  }

  await interaction.reply({ content: '❌ Solicitud rechazada.', ephemeral: true });
}

module.exports = { createPanelHandlers };