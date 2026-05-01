/**
 * BOT 3 - Sistema de Registro y Auditoría REFACTORIZADO
 * Departamento de Fiestas - STAFF FIESTAS
 *
 * Arquitectura mejorada con:
 * - Módulos compartidos DRY
 * - FSM para verificación
 * - Logging estructurado
 * - Circuit breaker en API
 * - Cache con TTL
 */

'use strict';

require('dotenv').config();

// ============================================================================
// IMPORTS
// ============================================================================

const {
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder,
    ButtonBuilder, ButtonStyle, TextInputBuilder, TextInputStyle,
    ModalBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
    Partials, AuditLogEvent, ChannelType
} = require('discord.js');

const {
    configManager,
    createLogger,
    EmbedFactory,
    DiscordClientWrapper,
    VerificationService,
    VerificationState,
    AuditService,
    AuditEventType,
    dashboardAPIClient,
    StringUtils: { truncate, formatDateLocal, generateSolicitudeFooter }
} = require('./src/shared');

// ============================================================================
// CONFIGURACIÓN (Delegada a ConfigManager)
// ============================================================================

const CONFIG = configManager;
const logger = createLogger('Bot3', CONFIG.bot.logDir);

// Configurar Dashboard API
dashboardAPIClient.config({
    apiKey: process.env.DASHBOARD_API_KEY || 'discord-bot-dashboard-2024',
    baseURL: process.env.DASHBOARD_URL || 'http://localhost:3000/api'
});

// ============================================================================
// SERVICES (Inicialización)
// ============================================================================

/** @type {VerificationService} */
const verificationService = new VerificationService({
    logger,
    configManager: CONFIG
});

/** @type {AuditService} */
const auditService = new AuditService({
    logger,
    configManager: CONFIG
});

/** @type {DiscordClientWrapper} */
const discordClient = new DiscordClientWrapper({
    token: CONFIG.bot.token,
    botName: 'Bot3-StaffFiestas',
    serverId: CONFIG.bot.serverId,
    logger
});

// ============================================================================
// CONSTANTES LOCALES (Solo lo que no está en ConfigManager)
// ============================================================================

const SLASH_COMMANDS = [
    { name: 'panel', description: 'Solicitar verificación de staff' },
    { name: 'dm', description: 'Enviar mensaje al staff' },
    { name: 'personalizar', description: 'Mantener mi propio apodo sin cambios' },
    { name: 'restaurar', description: 'Volver al apodo automático' }
];

// Roles que pueden ENVIAR mensajes via /dm
const DM_ENVIAN_ROLES = Object.freeze([
    '1498534445060329504', // AUX
    '1498534444179656885', // ADM
    '1498534444460671077', // RESP
    '1498534443206443047'  // ALTA CUPULA
]);

// ============================================================================
// HANDLERS DE INTERACCIÓN (Refactorizados con DRY)
// ============================================================================

/**
 * Maneja comandos slash
 * @param {Object} interaction
 */
async function handleSlashCommand(interaction) {
    const { commandName } = interaction;

    switch (commandName) {
        case 'panel':
            await handlePanelCommand(interaction);
            break;
        case 'dm':
            await handleDMCommand(interaction);
            break;
        case 'personalizar':
            await handlePersonalizar(interaction);
            break;
        case 'restaurar':
            await handleRestaurar(interaction);
            break;
        default:
            logger.warn(`Comando desconocido: ${commandName}`, 'InteractionHandler');
    }
}

/**
 * Muestra el panel de verificación
 * @param {Object} interaction
 */
async function handlePanelCommand(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🛡️ Sistema de Verificación | Staff Fiestas')
        .setDescription('**BIENVENIDO AL SISTEMA DE VERIFICACIÓN**\nSolicita tu acceso al staff')
        .setColor(CONFIG.colors.verification)
        .addFields(
            { name: '📋 Cómo funciona?', value: '1. Haz clic en "Verificarse"\n2. Completa el formulario\n3. Selecciona tu rango\n4. Espera autorización', inline: true },
            { name: '📝 Datos requeridos', value: '• Nombre IC\n• ID de personaje\n• Rango solicitado', inline: true },
            { name: '⚡ Nota', value: 'Alta Cúpula solo puede ser aprobado por DEV o Alta Cúpula', inline: true }
        )
        .setFooter({ text: 'Staff Fiestas v2.0' })
        .setTimestamp();

    const button = new ButtonBuilder()
        .setCustomId('btn_verificar')
        .setLabel('Verificarse')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('🛡️');

    await interaction.reply({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] });
}

/**
 * Maneja el comando DM (envío de mensajes)
 * @param {Object} interaction
 */
async function handleDMCommand(interaction) {
    // Verificar si el usuario tiene rol para enviar DM
    const puedeEnviar = interaction.member?.roles?.cache?.some(rol => DM_ENVIAN_ROLES.includes(rol.id));
    if (!puedeEnviar) {
        await interaction.reply({ content: '❌ No tienes permiso para enviar mensajes.', flags: 64 });
        return;
    }

    const modal = new ModalBuilder()
        .setCustomId('modal_dm')
        .setTitle('📨 Menú de Mensajes');

    const input = new TextInputBuilder()
        .setCustomId('input_mensaje')
        .setLabel('Mensaje')
        .setPlaceholder('Escribe...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(1500);

    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
}

/**
 * Maneja el comando /personalizar
 * @param {Object} interaction
 */
async function handlePersonalizar(interaction) {
    verificationService.setCustomNickname(interaction.user.id);

    const currentNick = interaction.member.nickname || interaction.user.username;
    await interaction.reply({
        content: `✨ **Apodo personalizado guardado**\n\nTu apodo \`${currentNick}\` será respetado.\n\nUsa \`/restaurar\` para volver al apodo automático.`,
        flags: 64
    });

    logger.info(`[Personalizar] Usuario ${interaction.user.tag} eligió nickname personalizado`, 'InteractionHandler');
}

/**
 * Maneja el comando /restaurar
 * @param {Object} interaction
 */
async function handleRestaurar(interaction) {
    verificationService.clearCustomNickname(interaction.user.id);

    await interaction.reply({
        content: `✅ **Preferencia eliminada**\n\nUsa \`/personalizar\` si quieres mantener tu apodo actual.`,
        flags: 64
    });

    logger.info(`[Restaurar] Usuario ${interaction.user.tag} eliminó preferencia de nickname`, 'InteractionHandler');
}

/**
 * Maneja botones
 * @param {Object} interaction
 */
async function handleButton(interaction) {
    switch (interaction.customId) {
        case 'btn_verificar':
            await handleVerificarButton(interaction);
            break;
        case 'btn_aceptar':
            await handleAcceptReject(interaction, true);
            break;
        case 'btn_rechazar':
            await handleAcceptReject(interaction, false);
            break;
    }
}

/**
 * Maneja el botón de verificación
 * @param {Object} interaction
 */
async function handleVerificarButton(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('modal_verificar')
        .setTitle('🛡️ Verificación');

    const nombreIC = new TextInputBuilder()
        .setCustomId('input_nombre')
        .setLabel('✏️ Nombre IC')
        .setPlaceholder('Tu nombre')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(50);

    const idIC = new TextInputBuilder()
        .setCustomId('input_id')
        .setLabel('🎮 ID')
        .setPlaceholder('Tu ID')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(20);

    modal.addComponents(
        new ActionRowBuilder().addComponents(nombreIC),
        new ActionRowBuilder().addComponents(idIC)
    );

    await interaction.showModal(modal);
}

/**
 * Maneja el select menu de rango
 * @param {Object} interaction
 */
async function handleSelectMenu(interaction) {
    if (interaction.customId !== 'select_rango') return;

    try {
        await interaction.deferUpdate();

        const rangoId = interaction.values[0];
        const rangoNombre = CONFIG.roleMapping[rangoId];
        const datos = verificationService.getPendingVerification(interaction.user.id);

        if (!datos) {
            await interaction.editReply({ content: '❌ Tiempo expirado.', components: [] });
            return;
        }

        // Actualizar estado con rango
        const result = verificationService.submitRango(interaction.user.id, rangoId, rangoNombre);

        if (!result.success) {
            await interaction.editReply({ content: `❌ ${result.error}`, components: [] });
            return;
        }

        const { nombreIC, idIC, discordId, discordTag } = datos;

        // Crear embed con datos del solicitante
        const embed = new EmbedBuilder()
            .setTitle('📋 Nueva Solicitud')
            .setDescription(`**Solicitante:** <@${discordId}>`)
            .setColor(CONFIG.colors.verification)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))
            .addFields(
                { name: 'Discord', value: `<@${discordId}> (${discordTag})\nID: ${discordId}`, inline: false },
                { name: 'Nombre IC', value: nombreIC, inline: true },
                { name: 'ID', value: idIC, inline: true },
                { name: 'Rango', value: rangoNombre, inline: true }
            )
            .setFooter({ text: generateSolicitudeFooter(discordId) })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_aceptar').setLabel('Aceptar').setStyle(ButtonStyle.Success).setEmoji('✅'),
            new ButtonBuilder().setCustomId('btn_rechazar').setLabel('Rechazar').setStyle(ButtonStyle.Danger).setEmoji('❌')
        );

        // Enviar al canal de solicitudes
        const canal = discordClient.guildCache.getChannel(CONFIG.channels.solicitudes);
        if (canal) {
            await canal.send({ embeds: [embed], components: [row] });
        } else {
            logger.warn(`Canal de solicitudes no encontrado: ${CONFIG.channels.solicitudes}`, 'InteractionHandler');
        }

        await interaction.editReply({ content: '🎖️ **SOLICITUD ENVIADA**\n⏳ Pendiente de revisión', components: [] });

    } catch (err) {
        logger.error('Error en handleSelectMenu', err, 'InteractionHandler');
    }
}

/**
 * Maneja el envío de modales
 * @param {Object} interaction
 */
async function handleModalSubmit(interaction) {
    switch (interaction.customId) {
        case 'modal_verificar':
            await handleVerificacionModal(interaction);
            break;
        case 'modal_dm':
            await handleDModal(interaction);
            break;
    }
}

/**
 * Maneja el modal de verificación
 * @param {Object} interaction
 */
async function handleVerificacionModal(interaction) {
    try {
        await interaction.deferReply({ flags: 64 });

        const nombreIC = interaction.fields.getTextInputValue('input_nombre');
        const idIC = interaction.fields.getTextInputValue('input_id');

        // Iniciar FSM de verificación
        const startResult = verificationService.startVerification(interaction.user.id, interaction.user.tag);

        if (!startResult.success) {
            await interaction.editReply({ content: `❌ ${startResult.error}` });
            return;
        }

        // Registrar datos
        const dataResult = verificationService.submitVerificationData(interaction.user.id, nombreIC, idIC);

        if (!dataResult.success) {
            await interaction.editReply({ content: `❌ ${dataResult.error}` });
            return;
        }

        // Crear select menu para rango
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_rango')
            .setPlaceholder('Selecciona tu rango...');

        for (const [id, name] of Object.entries(CONFIG.roleMapping)) {
            if (id && name) {
                selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel(name).setValue(id));
            }
        }

        await interaction.editReply({
            content: `🎖️ **Datos registrados**\n📝 **Nombre IC:** \`${nombreIC}\`\n🎮 **ID:** \`${idIC}\`\n\n⭐ **Selecciona tu rango:**`,
            components: [new ActionRowBuilder().addComponents(selectMenu)]
        });

    } catch (err) {
        logger.error('Error en handleVerificacionModal', err, 'InteractionHandler');
    }
}

/**
 * Maneja el modal de DM
 * @param {Object} interaction
 */
async function handleDModal(interaction) {
    const mensaje = interaction.fields.getTextInputValue('input_mensaje');
    await interaction.deferReply({ flags: 64 });

    const guild = discordClient.getGuild();
    let enviados = 0, errores = 0;

    if (guild) {
        // Usar caché del gateway (se mantiene actualizado automáticamente)
        // Solo hacer fetch si el caché está vacío o es muy pequeño
        let members = guild.members.cache;

        if (members.size < 5) {
            logger.info('[DM] Caché pequeño, obteniendo miembros...', 'DModal');
            try {
                // Fetch con delay para evitar rate limit
                members = await guild.members.fetch({ limit: 1000 });
                logger.info(`[DM] Miembros obtenidos: ${members.size}`, 'DModal');
            } catch (err) {
                logger.warn(`[DM] Rate limit o error en fetch: ${err.message}`, 'DModal');
                // Usar lo que haya en caché aunque sea poco
            }
        } else {
            logger.info(`[DM] Usando caché: ${members.size} miembros`, 'DModal');
        }

        const sendPromises = [];

        for (const [, member] of members) {
            // Enviar a todos los miembros que no sean bots
            if (member.user.bot) continue;

            sendPromises.push(
                member.send(`📨 **MENSAJE DEL STAFF**\n\n${mensaje}`)
                    .then(() => {
                        enviados++;
                    })
                    .catch(() => {
                        errores++;
                    })
            );
        }

        await Promise.all(sendPromises);
        logger.info(`[DM] Enviados: ${enviados}, Errores: ${errores}`, 'DModal');
    } else {
        await interaction.editReply({ content: '❌ Servidor no disponible.' });
        return;
    }

    await interaction.editReply({ content: `✅ Enviados: ${enviados}\n❌ Errores: ${errores}` });
}

/**
 * Maneja aceptación/rechazo de solicitudes
 * @param {Object} interaction
 * @param {boolean} isAceptar
 */
async function handleAcceptReject(interaction, isAceptar) {
    const member = interaction.member;

    if (!member) {
        await interaction.reply({ content: '❌ Error', flags: 64 });
        return;
    }

    if (!verificationService.hasVerificationPermission(member)) {
        await interaction.reply({ content: '❌ Sin permiso.', flags: 64 });
        return;
    }

    // Deshabilitar botones
    const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_aceptar').setLabel('Aceptar').setStyle(ButtonStyle.Success).setDisabled(true),
        new ButtonBuilder().setCustomId('btn_rechazar').setLabel('Rechazar').setStyle(ButtonStyle.Danger).setDisabled(true)
    );
    await interaction.update({ components: [disabledRow] });

    // Extraer datos del embed
    const embed = interaction.message.embeds[0];
    const fields = embed.data.fields;
    const rangoSolicitado = fields.find(f => f.name === '⭐ Rango Solicitado')?.value || '';

    // Extraer discord ID del solicitante
    const discordField = fields.find(f => f.name === 'Discord');
    const discordIdMatch = discordField?.value?.match(/<@(\d+)>/);
    const solicitanteId = discordIdMatch ? discordIdMatch[1] : null;

    // Obtener datos del solicitante
    const nombre = fields.find(f => f.name === 'Nombre IC')?.value || '';
    const idIC = fields.find(f => f.name === 'ID')?.value || '';

    const guild = discordClient.getGuild();
    const canalDestino = isAceptar ? CONFIG.channels.aceptados : CONFIG.channels.rechazados;
    const color = isAceptar ? CONFIG.colors.success : CONFIG.colors.error;
    const emoji = isAceptar ? '✅' : '❌';

    // Enviar log al canal correspondiente
    if (guild) {
        const canal = discordClient.guildCache.getChannel(canalDestino);
        if (canal) {
            const targetUser = await discordClient.getMember(solicitanteId);
            const targetUserObj = targetUser || { id: solicitanteId, displayAvatarURL: () => null };

            const embedLog = isAceptar
                ? EmbedFactory.verificationApproved(interaction.user, targetUserObj, nombre, idIC, rangoSolicitado, color)
                : EmbedFactory.verificationRejected(interaction.user, targetUserObj, nombre, idIC, rangoSolicitado, color);

            await canal.send({ embeds: [embedLog] });
        }
    }

    // Procesar verificación
    const result = isAceptar
        ? verificationService.approveVerification(interaction.user.id, solicitanteId)
        : verificationService.rejectVerification(interaction.user.id, solicitanteId);

    await interaction.followUp({
        content: isAceptar ? '✅ Aceptado.' : '❌ Rechazado.',
        flags: 64
    });

    // Si fue aceptado, procesar
    if (isAceptar && result.success && solicitanteId) {
        await processAcceptedVerification(solicitanteId, nombre, idIC, rangoSolicitado);
    }
    // Si fue rechazado, quitar roles y nickname
    else if (!isAceptar && result.success && solicitanteId) {
        await processRejectedVerification(solicitanteId);
    }
}

/**
 * Procesa una verificación aceptada
 * @param {string} solicitanteId
 * @param {string} nombre
 * @param {string} idIC
 * @param {string} rangoSolicitado
 */
async function processAcceptedVerification(solicitanteId, nombre, idIC, rangoSolicitado) {
    const guild = discordClient.getGuild();
    if (!guild) return;

    try {
        const miembro = await guild.members.fetch(solicitanteId);
        if (!miembro) return;

        logger.info(`[Verification] Procesando aceptación para ${miembro.user.tag}`, 'VerificationProcessor');

        // PASO 1: Quitar TODOS los roles existentes del usuario
        try {
            const rolesActuales = miembro.roles.cache.filter(r => r.id !== guild.roles.everyone.id);
            if (rolesActuales.size > 0) {
                await miembro.roles.remove(rolesActuales);
                logger.info(`[Verification] Roles quitados: ${rolesActuales.map(r => r.name).join(', ')}`, 'VerificationProcessor');
            }
        } catch (err) {
            logger.warn(`[Verification] Error quitando roles: ${err.message}`, 'VerificationProcessor');
        }

        // PASO 2: Buscar y asignar el nuevo rol
        logger.info(`[Verification] Buscando rol para rangoSolicitado: "${rangoSolicitado}"`, 'VerificationProcessor');
        const rolId = Object.entries(CONFIG.roleMapping).find(([, name]) => name === rangoSolicitado)?.[0];
        logger.info(`[Verification] rolId encontrado: ${rolId}`, 'VerificationProcessor');
        if (rolId) {
            try {
                const rol = await guild.roles.fetch(rolId);
                if (rol) {
                    await miembro.roles.add(rol);
                    logger.info(`[Verification] Rol asignado: ${rol.name} a ${miembro.user.tag}`, 'VerificationProcessor');
                }
            } catch (err) {
                logger.error(`[Verification] Error asignando rol ${rolId}`, err, 'VerificationProcessor');
            }
        } else {
            logger.warn(`[Verification] No se encontró rolId para rango: "${rangoSolicitado}"`, 'VerificationProcessor');
        }

        // PASO 3: Actualizar nickname (solo si no eligió personalizar)
        if (!verificationService.hasCustomNickname(solicitanteId)) {
            const nuevoNickname = `${rangoSolicitado}.FT |🎉${nombre} | ${idIC}`;
            try {
                await miembro.setNickname(nuevoNickname);
                logger.info(`[Verification] Nickname asignado: ${nuevoNickname} a ${miembro.user.tag}`, 'VerificationProcessor');
            } catch (err) {
                logger.warn(`[Verification] No se pudo asignar nickname: ${err.message}`, 'VerificationProcessor');
            }
        } else {
            logger.info(`[Verification] Usuario ${miembro.user.tag} eligió nickname personalizado, no se cambia`, 'VerificationProcessor');
        }

        // PASO 4: Enviar DM de confirmación
        try {
            const embedAprobado = new EmbedBuilder()
                .setTitle('🎪 SISTEMA DE VERIFICACIÓN — APROBADO')
                .setDescription('✨ **¡Bienvenido al Staff de Fiestas!** ✨\n\nJuntos creamos experiencias únicas.')
                .setColor(CONFIG.colors.success)
                .addFields(
                    { name: '📝 Nombre IC', value: nombre, inline: true },
                    { name: '🆔 ID', value: idIC, inline: true },
                    { name: '⭐ Rango', value: rangoSolicitado, inline: true }
                )
                .setFooter({ text: 'Staff Fiestas — "Juntos creamos experiencias únicas"' })
                .setTimestamp();

            await miembro.send({ embeds: [embedAprobado] });
            logger.info(`[Verification] DM enviado a ${miembro.user.tag}`, 'VerificationProcessor');
        } catch (err) {
            logger.warn(`[Verification] No se pudo enviar DM: ${err.message}`, 'VerificationProcessor');
        }

    } catch (err) {
        logger.error('Error en processAcceptedVerification', err, 'VerificationProcessor');
    }
}

/**
 * Procesa una verificación rechazada - quita roles y nickname
 * @param {string} solicitanteId
 */
async function processRejectedVerification(solicitanteId) {
    const guild = discordClient.getGuild();
    if (!guild) return;

    try {
        const miembro = await guild.members.fetch(solicitanteId);
        if (!miembro) return;

        logger.info(`[Verification] Procesando rechazo para ${miembro.user.tag}`, 'VerificationProcessor');

        // PASO 1: Quitar TODOS los roles existentes
        try {
            const rolesActuales = miembro.roles.cache.filter(r => r.id !== guild.roles.everyone.id);
            if (rolesActuales.size > 0) {
                await miembro.roles.remove(rolesActuales);
                logger.info(`[Verification] Roles quitados por rechazo: ${rolesActuales.map(r => r.name).join(', ')}`, 'VerificationProcessor');
            }
        } catch (err) {
            logger.warn(`[Verification] Error quitando roles en rechazo: ${err.message}`, 'VerificationProcessor');
        }

        // PASO 2: Quitar el nickname
        try {
            if (miembro.nickname) {
                await miembro.setNickname(null, 'Verificación rechazada');
                logger.info(`[Verification] Nickname removido de ${miembro.user.tag}`, 'VerificationProcessor');
            }
        } catch (err) {
            logger.warn(`[Verification] Error removiendo nickname: ${err.message}`, 'VerificationProcessor');
        }

    } catch (err) {
        logger.error('Error en processRejectedVerification', err, 'VerificationProcessor');
    }
}

// ============================================================================
// EVENT HANDLERS (Refactorizados)
// ============================================================================

/**
 * Registra los handlers de eventos de Discord
 */
function registerEventHandlers() {
    const client = discordClient.client;

    // Ready (clientReady for Discord.js v15+)
    discordClient.once('clientReady', async () => {
        logger.info(`Bot iniciado: ${client.user.tag}`, 'Ready');
        logger.info(`Servidores: ${client.guilds.cache.size}`, 'Ready');

        // Registrar comandos
        for (const cmd of SLASH_COMMANDS) {
            await discordClient.createCommand(cmd);
        }
        logger.info('Comandos registrados', 'Ready');
    });

    // Message Events
    client.on('messageCreate', async (message) => {
        if (message.author.bot || !message.guild || message.guild.id !== CONFIG.bot.serverId) return;

        auditService.logMessageCreate(message);

        const embed = EmbedFactory.messageCreate(message, CONFIG.colors.messageCreate, truncate);
        await discordClient.sendToChannel(CONFIG.bot.logChannelId, { embeds: [embed] });
    });

    client.on('messageUpdate', async (oldMessage, newMessage) => {
        if (newMessage.author?.bot || !newMessage.guild || newMessage.guild.id !== CONFIG.bot.serverId) return;

        const oldContent = oldMessage.content || '';
        const newContent = newMessage.content;
        if (oldContent === newContent) return;

        auditService.logMessageUpdate(oldMessage, newMessage);

        const embed = EmbedFactory.messageUpdate(oldMessage, newMessage, CONFIG.colors.messageUpdate, truncate);
        if (newMessage.url) embed.setURL(newMessage.url);
        await discordClient.sendToChannel(CONFIG.bot.logChannelId, { embeds: [embed] });
    });

    client.on('messageDelete', async (message) => {
        if (!message.guild || message.guild.id !== CONFIG.bot.serverId) return;
        if (message.author?.bot) return;

        auditService.logMessageDelete(message, message.author);

        const embed = EmbedFactory.messageDelete(message, message.author, CONFIG.colors.messageDelete, truncate);
        await discordClient.sendToChannel(CONFIG.bot.logChannelId, { embeds: [embed] });
    });

    // Member Events
    client.on('guildMemberAdd', async (member) => {
        if (member.guild.id !== CONFIG.bot.serverId) return;

        auditService.logMemberJoin(member);

        const embed = EmbedFactory.memberJoin(member, CONFIG.colors.memberJoin);
        await discordClient.sendToChannel(CONFIG.bot.logChannelId, { embeds: [embed] });
    });

    client.on('guildMemberUpdate', async (oldMember, newMember) => {
        if (newMember.guild.id !== CONFIG.bot.serverId) return;

        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;

        const addedRoles = newRoles.filter(r => !oldRoles.has(r.id));
        const removedRoles = oldRoles.filter(r => !newRoles.has(r.id));

        // Solo cambio de apodo
        if (addedRoles.size === 0 && removedRoles.size === 0) {
            if (oldMember.nickname !== newMember.nickname) {
                const embed = new EmbedBuilder()
                    .setColor(CONFIG.colors.nickname)
                    .setAuthor({
                        name: newMember.user.tag,
                        iconURL: newMember.user.displayAvatarURL({ dynamic: true, size: 64 })
                    })
                    .setTitle('📝 Cambio de Apodo')
                    .addFields(
                        { name: 'Usuario', value: `${newMember.user}`, inline: true },
                        { name: 'Apodo anterior', value: oldMember.nickname || '*Sin apodo*', inline: true },
                        { name: 'Apodo nuevo', value: newMember.nickname || '*Sin apodo*', inline: true }
                    )
                    .setTimestamp();

                await discordClient.sendToChannel(CONFIG.bot.logChannelId, { embeds: [embed] });
            }
            return;
        }

        // Role changes - Actualizar nickname según nuevo rol
        if (addedRoles.size > 0 && !verificationService.hasCustomNickname(newMember.user.id)) {
            // Verificar si el usuario está registrado
            const datosUsuario = verificationService.getRegisteredUser(newMember.user.id);
            if (datosUsuario) {
                // Buscar el rol más alto del usuario para determinar el formato
                const userRoles = newMember.roles.cache;
                let rolAplicar = null;
                for (const [rolId, rolName] of Object.entries(CONFIG.roleMapping)) {
                    if (userRoles.has(rolId)) {
                        // Tomar el primer rol que coincida (el orden de roleMapping determina prioridad)
                        if (!rolAplicar) {
                            rolAplicar = { id: rolId, nombre: rolName };
                        }
                    }
                }

                if (rolAplicar) {
                    const { nombreIC, idIC } = datosUsuario;
                    const nuevoNickname = `${rolAplicar.nombre}.FT |🎉${nombreIC} | ${idIC}`;
                    if (newMember.nickname !== nuevoNickname) {
                        try {
                            await newMember.setNickname(nuevoNickname);
                            logger.info(`[Nickname] Actualizado: ${newMember.user.tag} → ${nuevoNickname}`, 'GuildMemberUpdate');
                        } catch (err) {
                            logger.warn(`[Nickname] Error actualizando ${newMember.user.tag}: ${err.message}`, 'GuildMemberUpdate');
                        }
                    }
                }
            }
        }

        for (const [, role] of addedRoles) {
            auditService.logRoleChange(newMember, role, true);
            const embed = EmbedFactory.roleAdd(newMember, role, null, CONFIG.colors.roleAdd);
            await discordClient.sendToChannel(CONFIG.bot.logChannelId, { embeds: [embed] });
        }

        for (const [, role] of removedRoles) {
            auditService.logRoleChange(newMember, role, false);
            const embed = EmbedFactory.roleRemove(newMember, role, null, CONFIG.colors.roleRemove);
            await discordClient.sendToChannel(CONFIG.bot.logChannelId, { embeds: [embed] });
        }
    });

    // Interaction Handler
    client.on('interactionCreate', async (interaction) => {
        try {
            if (interaction.isChatInputCommand()) {
                auditService.logCommandExecute(interaction);
                await handleSlashCommand(interaction);
            } else if (interaction.isButton()) {
                await handleButton(interaction);
            } else if (interaction.isStringSelectMenu()) {
                await handleSelectMenu(interaction);
            } else if (interaction.isModalSubmit()) {
                await handleModalSubmit(interaction);
            }
        } catch (err) {
            logger.error('Error en interactionCreate', err, 'EventHandler');
        }
    });
}

// ============================================================================
// INICIO DEL BOT
// ============================================================================

logger.info('🎮 Iniciando Bot de Auditoría v2.0...', 'Bot3');

// Registrar handlers
registerEventHandlers();

// Iniciar sesión
discordClient.login().catch((err) => {
    logger.fatal('Error al iniciar bot', err, 'Bot3');
});

// Cleanup al cerrar
process.on('SIGINT', async () => {
    logger.info('Cerrando bot...', 'Bot3');
    await discordClient.destroy();
    await auditService.destroy();
    await logger.destroy();
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled rejection', error, 'Bot3');
});
