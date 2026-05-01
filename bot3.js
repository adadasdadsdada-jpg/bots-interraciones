/**
 * BOT 3 - Sistema de Registro y Auditoría OPTIMIZADO
 * Departamento de Fiestas - STAFF FIESTAS
 *
 * Optimizado: DRY, KISS, YAGNI, Error Handling mejorado
 */

const {
    Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder,
    ButtonBuilder, ButtonStyle, TextInputBuilder, TextInputStyle,
    ModalBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
    Partials, AuditLogEvent, ChannelType
} = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ============================================================
// CONSTANTES (Eliminación de Magic Strings)
// ============================================================

const CONFIG = Object.freeze({
    token: process.env.BOT3_TOKEN,
    serverId: process.env.BOT3_SERVER_ID || '1498519623774244985',
    logChannelId: process.env.BOT3_LOG_CHANNEL || '1498534563549417654',
    modLogChannelId: process.env.BOT3_MOD_LOG_CHANNEL || '1498534565285859358',
    devUserId: process.env.BOT3_DEV_USER_ID || '',
    logDir: path.join(__dirname, 'logs_bot3'),

    channels: Object.freeze({
        recepcion: '1498534574161002577',
        aceptados: '1498534571417796660',
        rechazados: '1498534572684738582',
        solicitudes: '1498534574161002577', // 📋-sets-pendientes
        coordenadas: '1498534578015440937',
        mapaEventos: '1498534578397253713',
        anuncios: '1498534718214508635',
        logsActividad: '1498534563549417654'
    }),

    roles: Object.freeze({
        altaCupula: '1498534443206443047',
        respInt: '1498534444460671077',
        adm: '1498534444179656885',
        aux: '1498534445060329504',
        lid: '1498534456322031757',
        sub: '1498534447069401130',
        miembro: '1498534448684208289',
        tester: '1498534449770663966'
    }),

    // Roles con poder de verificación
    verificacionAutorizados: Object.freeze([
        '1498520261228630016', // DEV
        '1498534443206443047', // Alta Cúpula
        '1498534444460671077', // Resp.INT
        '1498534444179656885', // ADM
        '1498534445060329504', // AUX
        '1498534445886472254'  // LID
    ]),

    // Roles disponibles para solicitud
    rolesDisponibles: Object.freeze({
        '1498534443206443047': 'Alta Cúpula',
        '1498534444460671077': 'Resp.INT',
        '1498534444179656885': 'ADM',
        '1498534445060329504': 'AUX',
        '1498534445886472254': 'LID',
        '1498534447069401130': 'SUB',
        '1498534448684208289': 'MIEMBRO',
        '1498534449770663966': 'TESTER'
    }),

    // Jerarquía de permisos para verificación
    jerarquia: Object.freeze([
        { id: '1498520261228630016', nombre: 'DEV', puedeAceptar: ['Alta Cúpula', 'Resp.INT', 'ADM', 'AUX', 'LID', 'SUB', 'MIEMBRO', 'TESTER'] },
        { id: '1498534443206443047', nombre: 'Alta Cúpula', puedeAceptar: ['Alta Cúpula', 'Resp.INT', 'ADM', 'AUX', 'LID', 'SUB', 'MIEMBRO', 'TESTER'] },
        { id: '1498534444460671077', nombre: 'Resp.INT', puedeAceptar: ['ADM', 'AUX', 'LID', 'SUB', 'MIEMBRO', 'TESTER'] },
        { id: '1498534444179656885', nombre: 'ADM', puedeAceptar: ['AUX', 'LID', 'SUB', 'MIEMBRO', 'TESTER'] },
        { id: '1498534445060329504', nombre: 'AUX', puedeAceptar: ['LID', 'SUB', 'MIEMBRO', 'TESTER'] }
    ]),

    colors: Object.freeze({
        messageCreate: 0x00FF00, messageUpdate: 0xFFA500, messageDelete: 0xFF0000,
        memberJoin: 0x00CED1, memberLeave: 0x8B0000, memberKick: 0xDC143C,
        memberBan: 0x4B0082, memberUnban: 0x9370DB, roleAdd: 0x32CD32,
        roleRemove: 0xFF6347, serverUpdate: 0xFFD700, channelCreate: 0x00BFFF,
        channelDelete: 0xFF4500, channelUpdate: 0x1E90FF, voiceJoin: 0x7CFC00,
        voiceLeave: 0xCD853F, voiceMove: 0x20B2AA, timeout: 0xFF8C00,
        nickname: 0xDDA0DD, emojiCreate: 0x00CED1, emojiDelete: 0xFF6347,
        emojiUpdate: 0xFFA500, stickerCreate: 0x00CED1, stickerDelete: 0xFF6347,
        stickerUpdate: 0xFFA500, webhookCreate: 0x00BFFF, webhookDelete: 0xFF4500,
        webhookUpdate: 0x1E90FF, stageCreate: 0x9B59B6, stageDelete: 0xE74C3C,
        stageUpdate: 0x3498DB, threadCreate: 0x00BFFF, threadDelete: 0xFF4500,
        threadUpdate: 0x1E90FF, memberChunk: 0x9B59B6, integrationCreate: 0x00FF00,
        integrationDelete: 0xFF0000, integrationUpdate: 0xFFA500, commandExecute: 0x9B59B6,
        soundboard: 0x3498DB, verification: 0x00BFFF, success: 0x00FF00,
        error: 0xFF0000, warning: 0xFFA500
    }),

    // Canales manejados para logging
    managedChannels: Object.freeze([
        '1498534570495311902', '1498534571417796660', '1498534572684738582',
        '1498534574161002577', '1498534578015440937', '1498534578397253713',
        '1498534718214508635', '1498534563549417654'
    ])
});

// ============================================================
// MEMORY STORE (Estado en memoria)
// ============================================================

const memoryStore = Object.seal({
    messageCache: new Map(),
    editedMessages: new Map(),
    deletedMessages: new Map(),
    memberHistory: new Map(),
    roleChanges: new Map(),
    voiceStates: new Map(),
    solicitudes: new Map(),
    panelActivo: new Map(),
    confirmaciones: new Map(),
    pendingVerifications: new Map(),
    usuariosRegistrados: new Map(),
    usuariosPersonalizado: new Map(),
    stats: { messagesLogged: 0, editsLogged: 0, deletesLogged: 0, joinsLogged: 0,
             leavesLogged: 0, kicksLogged: 0, bansLogged: 0, roleChangesLogged: 0,
             serverUpdatesLogged: 0, voiceEventsLogged: 0, commandsLogged: 0,
             memberChunksLogged: 0, setsRecibidos: 0, setsAceptados: 0,
             setsRechazados: 0, setsErrores: 0, tiempoPromedioSets: 0 }
});

// ============================================================
// UTILIDADES (DRY - Funciones reutilizables)
// ============================================================

function ensureLogDir() {
    if (!fs.existsSync(CONFIG.logDir)) {
        fs.mkdirSync(CONFIG.logDir, { recursive: true });
    }
}

function logToFile(type, data) {
    try {
        ensureLogDir();
        const date = new Date().toISOString().split('T')[0];
        const logFile = path.join(CONFIG.logDir, `${date}.log`);
        const entry = `[${new Date().toISOString()}] [${type}] ${JSON.stringify(data)}\n`;
        fs.appendFileSync(logFile, entry, 'utf8');
    } catch (err) {
        console.error('[bot3] Error escribiendo log:', err.message);
    }
}

function logError(context, error) {
    const msg = `[${new Date().toISOString()}] [ERROR] [${context}] ${error.message}${error.stack ? '\n' + error.stack : ''}\n`;
    console.error(msg);
    try {
        ensureLogDir();
        const errFile = path.join(CONFIG.logDir, `errors_${new Date().toISOString().split('T')[0]}.log`);
        fs.appendFileSync(errFile, msg, 'utf8');
    } catch (_) { /* silent */ }
}

function formatDate(date) {
    return `<t:${Math.floor(new Date(date).getTime() / 1000)}:F>`;
}

function truncate(str, maxLen = 1024) {
    if (!str) return 'Sin contenido';
    return str.length > maxLen ? str.substring(0, maxLen - 3) + '...' : str;
}

// ============================================================
// FACTORY: Creador de Embeds (DRY)
// ============================================================

const EmbedFactory = {
    base(author, title, color, fields = []) {
        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({
                name: author.name,
                iconURL: author.iconURL
            })
            .setTitle(title)
            .setTimestamp();

        if (fields.length > 0) {
            embed.addFields(fields);
        }
        return embed;
    },

    simple(title, description, color) {
        return new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setTimestamp();
    },

    withThumbnail(author, title, color, thumbnailURL, fields = []) {
        return this.base(author, title, color, fields)
            .setThumbnail(thumbnailURL);
    },

    withFields(author, title, color, fields) {
        return this.base(author, title, color, fields);
    },

    logEntry(author, title, color, fields = []) {
        return this.base(author, title, color, fields)
            .setFooter({ text: 'Staff Fiestas - Log' });
    },

    verificationRequest(user, nombreIC, idIC, rangoNombre) {
        return new EmbedBuilder()
            .setTitle('📋 Nueva Solicitud')
            .setDescription(`**Solicitante:** ${user}`)
            .setColor(CONFIG.colors.verification)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 128 }))
            .addFields(
                { name: 'Nombre IC', value: nombreIC, inline: true },
                { name: 'ID', value: idIC, inline: true },
                { name: 'Rango', value: rangoNombre, inline: true }
            )
            .setFooter({ text: `ID: ${user.id}` })
            .setTimestamp();
    }
};

// ============================================================
// CACHE DE DATOS PRECARGADOS
// ============================================================

const cache = {
    guild: null,
    channels: {},
    roles: {},
    ready: false
};

// ============================================================
// CLIENTE DE DISCORD
// ============================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildModeration,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember, Partials.User]
});

// ============================================================
// PRECACHE DE DATOS AL INICIAR
// ============================================================

async function precacheData() {
    try {
        const guild = client.guilds.cache.get(CONFIG.serverId);
        if (!guild) return;

        cache.guild = guild;

        const [fetchedChannels, fetchedRoles, fetchedMembers] = await Promise.all([
            guild.channels.fetch(),
            guild.roles.fetch(),
            guild.members.fetch()
        ]);

        for (const [id, channel] of fetchedChannels) {
            if (channel.isTextBased()) {
                cache.channels[id] = channel;
            }
        }

        for (const [id, role] of fetchedRoles) {
            cache.roles[id] = role;
        }

        cache.ready = true;
        console.log('[bot3] ✅ Datos precargados - Canales:', Object.keys(cache.channels).length, '| Roles:', Object.keys(cache.roles).length);
    } catch (err) {
        logError('precacheData', err);
    }
}

// ============================================================
// ENVÍO DE LOGS (Optimizado con caché)
// ============================================================

async function sendLog(embed, targetChannel = 'main') {
    try {
        if (!cache.ready) return;
        const channelId = targetChannel === 'mod' ? CONFIG.modLogChannelId : CONFIG.logChannelId;
        const channel = cache.channels[channelId];
        if (!channel) return;
        await channel.send({ embeds: [embed] });
    } catch (err) {
        logError('sendLog', err);
    }
}

// ============================================================
// UTILIDADES DE AUDIT LOG (Optimizado con caché)
// ============================================================

let auditCache = new Map();
const AUDIT_CACHE_TTL = 2000;

function getCachedAuditLog(guild, eventType, targetId) {
    const key = `${eventType}-${targetId}`;
    const cached = auditCache.get(key);
    if (cached && Date.now() - cached.timestamp < AUDIT_CACHE_TTL) {
        return cached.entry;
    }
    return null;
}

function setCachedAuditLog(guild, eventType, targetId, entry) {
    const key = `${eventType}-${targetId}`;
    auditCache.set(key, { entry, timestamp: Date.now() });
}

async function fetchAuditLog(guild, eventType, targetId, timeWindow = 5000) {
    const cached = getCachedAuditLog(guild, eventType, targetId);
    if (cached) return cached;

    try {
        const fetchedLogs = await guild.fetchAuditLogs({ limit: 5, type: eventType });
        const entry = fetchedLogs.entries.find(
            e => e.target.id === targetId && Date.now() - e.createdTimestamp < timeWindow
        );
        if (entry) setCachedAuditLog(guild, eventType, targetId, entry);
        return entry || null;
    } catch (_) {
        return null;
    }
}

function getAuditExecutor(auditEntry) {
    return auditEntry?.executor || null;
}

// ============================================================
// HANDLERS DE INTERACCIÓN (Refactorizados)
// ============================================================

async function handleSlashCommand(interaction) {
    const { commandName } = interaction;
    const handlers = {
        panel: () => handlePanelCommand(interaction),
        dm: () => handleDMCommand(interaction)
    };

    if (handlers[commandName]) {
        await handlers[commandName]();
    }
}

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

async function handleDMCommand(interaction) {
    if (!tienePermisoVerificacion(interaction.member)) {
        await interaction.reply({ content: '❌ No tienes permiso.', flags: 64 });
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

async function handleButton(interaction) {
    const handlers = {
        'btn_verificar': () => handleVerificarButton(interaction),
        'btn_aceptar': () => handleAcceptReject(interaction, true),
        'btn_rechazar': () => handleAcceptReject(interaction, false)
    };

    const handler = handlers[interaction.customId];
    if (handler) await handler();
}

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

async function handleSelectMenu(interaction) {
    if (interaction.customId !== 'select_rango') return;

    try {
        await interaction.deferUpdate();

        const rangoId = interaction.values[0];
        const rangoNombre = CONFIG.rolesDisponibles[rangoId];
        const datos = memoryStore.pendingVerifications.get(interaction.user.id);

        if (!datos) {
            await interaction.editReply({ content: '❌ Tiempo expirado.', components: [] });
            return;
        }

        const { nombreIC, idIC, discordId, discordTag } = datos;
        // Guardar rango para cuando se acepte/rechace
        memoryStore.pendingVerifications.set(interaction.user.id, { ...datos, rango: rangoNombre });

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
            .setFooter({ text: `solicitud_${discordId}_${Date.now()}` })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_aceptar').setLabel('Aceptar').setStyle(ButtonStyle.Success).setEmoji('✅'),
            new ButtonBuilder().setCustomId('btn_rechazar').setLabel('Rechazar').setStyle(ButtonStyle.Danger).setEmoji('❌')
        );

        const guild = cache.guild;
        if (guild && CONFIG.channels.solicitudes) {
            try {
                const canal = cache.channels[CONFIG.channels.solicitudes];
                if (canal?.isTextBased()) {
                    await canal.send({ embeds: [embed], components: [row] });
                }
            } catch (err) {
                logError('handleSelectMenu', err);
            }
        }

        await interaction.editReply({ content: '🎖️ **SOLICITUD ENVIADA**\n⏳ Pendiente de revisión', components: [] });
    } catch (err) {
        logError('handleSelectMenu', err);
    }
}

async function handleModalSubmit(interaction) {
    const { customId } = interaction;
    const handlers = {
        'modal_verificar': () => handleVerificacionModal(interaction),
        'modal_dm': () => handleDModal(interaction)
    };

    const handler = handlers[customId];
    if (handler) await handler();
}

async function handleVerificacionModal(interaction) {
    try {
        await interaction.deferReply({ flags: 64 });

        const nombreIC = interaction.fields.getTextInputValue('input_nombre');
        const idIC = interaction.fields.getTextInputValue('input_id');

        // Guardar con user.id de Discord
        memoryStore.pendingVerifications.set(interaction.user.id, {
            nombreIC,
            idIC,
            discordId: interaction.user.id,
            discordTag: interaction.user.tag
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_rango')
            .setPlaceholder('Selecciona tu rango...');

        for (const [id, name] of Object.entries(CONFIG.rolesDisponibles)) {
            if (id && name) {
                selectMenu.addOptions(new StringSelectMenuOptionBuilder().setLabel(name).setValue(id));
            }
        }

        await interaction.editReply({
            content: `🎖️ **Datos registrados**\n📝 **Nombre IC:** \`${nombreIC}\`\n🎮 **ID:** \`${idIC}\`\n\n⭐ **Selecciona tu rango:**`,
            components: [new ActionRowBuilder().addComponents(selectMenu)]
        });
    } catch (err) {
        logError('handleVerificacionModal', err);
    }
}

async function handleDModal(interaction) {
    const mensaje = interaction.fields.getTextInputValue('input_mensaje');
    await interaction.deferReply({ flags: 64 });

    const guild = cache.guild;
    let enviados = 0, errores = 0;

    if (guild) {
        // Fetch en tiempo real (no usar caché)
        let members;
        try {
            members = await guild.members.fetch();
            console.log(`[DM] Miembros obtenidos en tiempo real: ${members.size}`);
        } catch (err) {
            console.error(`[DM] Error obteniendo miembros: ${err.message}`);
            await interaction.editReply({ content: '❌ Error al obtener miembros del servidor.' });
            return;
        }

        const sendPromises = [];

        for (const [, member] of members) {
            if (member.user.bot) continue;
            if (!tienePermisoVerificacion(member)) continue;

            sendPromises.push(
                member.send(`📨 **MENSAJE DEL STAFF**\n\n${mensaje}`)
                    .then(() => {
                        enviados++;
                        console.log(`[DM] Enviado a ${member.user.tag}`);
                    })
                    .catch((e) => {
                        errores++;
                        console.log(`[DM] Error enviando a ${member.user.tag}: ${e.message}`);
                    })
            );
        }

        await Promise.all(sendPromises);
        console.log(`[DM] Mensajes enviados: ${enviados}, errores: ${errores}`);
    } else {
        await interaction.editReply({ content: '❌ Servidor no disponible.' });
        return;
    }

    await interaction.editReply({ content: `✅ Enviados: ${enviados}\n❌ Errores: ${errores}` });
}

function tienePermisoVerificacion(member) {
    if (!member) return false;
    return member.roles.cache.some(rol => CONFIG.verificacionAutorizados.includes(rol.id));
}

async function handleAcceptReject(interaction, isAceptar) {
    const member = interaction.member;

    if (!member) {
        await interaction.reply({ content: '❌ Error', flags: 64 });
        return;
    }

    if (!tienePermisoVerificacion(member)) {
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
    const rangoSolicitado = fields.find(f => f.name === 'Rango')?.value || '';

    // Extraer discord ID del solicitante desde el campo "Discord"
    const discordField = fields.find(f => f.name === 'Discord');
    const discordIdMatch = discordField?.value?.match(/<@(\d+)>/);
    const solicitanteId = discordIdMatch ? discordIdMatch[1] : null;
    const discordTag = discordField?.value?.match(/\((\w+)#\d+\)/)?.[1] || 'Desconocido';

    // Obtener datos del solicitante
    const nombre = fields.find(f => f.name === 'Nombre IC')?.value || '';
    const idIC = fields.find(f => f.name === 'ID')?.value || '';

    // Enviar log al canal correspondiente (aceptados o rechazados)
    const guild = cache.guild;
    const canalDestino = isAceptar ? CONFIG.channels.aceptados : CONFIG.channels.rechazados;
    const color = isAceptar ? CONFIG.colors.success : CONFIG.colors.error;
    const emoji = isAceptar ? '✅' : '❌';

    if (guild && canalDestino) {
        try {
            const canal = cache.channels[canalDestino];
            if (canal?.isTextBased()) {
                const embedLog = new EmbedBuilder()
                    .setTitle(`${emoji} VERIFICACIÓN ${isAceptar ? 'APROBADA' : 'RECHAZADA'}`)
                    .setDescription(isAceptar
                        ? '✨ **¡Felicidades! La verificación ha sido aprobada.**'
                        : '❌ **La verificación ha sido rechazada.**')
                    .setColor(color)
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 128 }))
                    .addFields(
                        { name: '👤 Solicitante', value: `${isAceptar ? `**${rangoSolicitado}** | 🎉${nombre} | ${idIC}` : `${nombre} | ${idIC}`}\nDiscord: <@${solicitanteId}> (${solicitanteId})`, inline: false },
                        { name: '📝 Nombre IC', value: nombre, inline: true },
                        { name: '🎮 ID', value: idIC, inline: true },
                        { name: '⭐ Rango Solicitado', value: rangoSolicitado, inline: true },
                        { name: '👮 Autorizado por', value: `<@${interaction.user.id}> (${interaction.user.id})`, inline: true },
                        { name: '🕐 Hora', value: new Date().toLocaleString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }), inline: false }
                    )
                    .setFooter({ text: 'Staff FIESTAS - Sistema de Verificación' })
                    .setTimestamp();

                await canal.send({ embeds: [embedLog] });
            }
        } catch (err) {
            logError('handleAcceptReject', err);
        }
    }

    // También enviar al log general
    if (guild && CONFIG.logChannelId) {
        try {
            const canalLog = cache.channels[CONFIG.logChannelId];
            if (canalLog?.isTextBased()) {
                const embedLog = new EmbedBuilder()
                    .setTitle(isAceptar ? '✅ Solicitud Aprobada' : '❌ Solicitud Rechazada')
                    .setDescription(`**Autorizador:** ${interaction.user}`)
                    .setColor(color)
                    .addFields(
                        { name: 'Solicitante', value: `${nombre} (${idIC})`, inline: true },
                        { name: 'Rango', value: rangoSolicitado, inline: true }
                    )
                    .setFooter({ text: 'Staff Fiestas - Log' })
                    .setTimestamp();
                await canalLog.send({ embeds: [embedLog] });
            }
        } catch (_) { /* silent */ }
    }

    await interaction.followUp({ content: isAceptar ? '✅ Aceptado.' : '❌ Rechazado.', flags: 64 });

    // Procesar aceptación
    if (isAceptar && solicitanteId) {
        if (guild) {
            try {
                const miembro = await guild.members.fetch(solicitanteId);
                if (miembro) {
                    memoryStore.usuariosRegistrados.set(solicitanteId, { nombreIC: nombre, idIC: idIC });

                    // Asignar rol
                    const rolId = Object.entries(CONFIG.rolesDisponibles).find(([, name]) => name === rangoSolicitado)?.[0];
                    if (rolId) {
                        const nuevoRol = cache.roles[rolId];
                        if (nuevoRol) {
                            await miembro.roles.add(nuevoRol);
                        }
                    }

                    // Actualizar nickname con formato: RANGO.FT |🎉Nombre | ID
                    const nuevoNickname = `${rangoSolicitado}.FT |🎉${nombre} | ${idIC}`;
                    try {
                        await miembro.setNickname(nuevoNickname);
                    } catch (_) { /* silent */ }

                    // Enviar DM
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
                    } catch (_) { /* silent */ }
                }
            } catch (err) {
                logError('handleAcceptReject', err);
            }
        }
    }
}

// ============================================================
// EVENTOS DE DISCORD (Refactorizados con DRY)
// ============================================================

client.once('clientReady', async () => {
    console.log(`[bot3] 🚀 Bot iniciado: ${client.user.tag}`);
    console.log(`[bot3] 📊 Servidores: ${client.guilds.cache.size}`);

    await client.user.setPresence({
        activities: [{ name: '🛡️ Verificación Staff', type: 3 }],
        status: 'online'
    });

    await precacheData();

    const guild = cache.guild;
    if (guild) {
        try {
            await guild.commands.create({ name: 'panel', description: 'Solicitar verificación de staff' });
            await guild.commands.create({ name: 'dm', description: 'Enviar mensaje al staff' });
            console.log('[bot3] ✅ Comandos registrados');
        } catch (err) {
            logError('registrarComandos', err);
        }
    }

    logToFile('BOT_READY', { tag: client.user.tag, server: guild?.name });
});

// Message handlers optimizados
client.on('messageCreate', async (message) => {
    try {
        // Ignorar bots y DM
        if (message.author.bot || !message.guild || message.guild.id !== CONFIG.serverId) return;

        memoryStore.messageCache.set(message.id, {
            id: message.id, authorId: message.author.id, authorTag: message.author.tag,
            content: message.content, channelId: message.channel.id,
            channelName: message.channel.name,
            attachments: message.attachments.map(a => a.url),
            timestamp: message.createdTimestamp
        });

        // Limpiar caché si crece demasiado
        if (memoryStore.messageCache.size > 1000) {
            const firstKey = memoryStore.messageCache.keys().next().value;
            memoryStore.messageCache.delete(firstKey);
        }

        memoryStore.stats.messagesLogged++;

        const embed = new EmbedBuilder()
            .setColor(CONFIG.colors.messageCreate)
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true, size: 64 }) })
            .setTitle('💬 Mensaje Enviado')
            .addFields(
                { name: 'Canal', value: `<#${message.channel.id}> (${message.channel.name})`, inline: true },
                { name: 'Autor', value: `${message.author}`, inline: true },
                { name: 'Contenido', value: truncate(message.content || '*Sin texto*', 1800), inline: false }
            )
            .setTimestamp(message.createdAt);

        if (message.attachments.size > 0) {
            embed.addFields({
                name: 'Adjuntos',
                value: message.attachments.map(a => `[${a.name}](${a.url})`).join('\n'),
                inline: false
            });
        }

        await sendLog(embed);
        logToFile('MESSAGE_CREATE', { author: message.author.tag, channel: message.channel.name, content: truncate(message.content, 200) });
    } catch (err) {
        logError('messageCreate', err);
    }
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
    try {
        if (newMessage.author?.bot || !newMessage.guild || newMessage.guild.id !== CONFIG.serverId) return;

        const oldContent = oldMessage.content || memoryStore.messageCache.get(newMessage.id)?.content || '*No disponible*';
        const newContent = newMessage.content;
        if (oldContent === newContent) return;

        memoryStore.stats.editsLogged++;
        memoryStore.messageCache.set(newMessage.id, { ...memoryStore.messageCache.get(newMessage.id) || {}, content: newContent, editedTimestamp: newMessage.editedTimestamp });

        const embed = new EmbedBuilder()
            .setColor(CONFIG.colors.messageUpdate)
            .setAuthor({ name: newMessage.author?.tag || 'Desconocido', iconURL: newMessage.author?.displayAvatarURL({ dynamic: true, size: 64 }) })
            .setTitle('✏️ Mensaje Editado')
            .addFields(
                { name: 'Canal', value: `<#${newMessage.channel.id}>`, inline: true },
                { name: 'Autor', value: `${newMessage.author}`, inline: true },
                { name: 'Antes', value: truncate(oldContent, 512), inline: false },
                { name: 'Después', value: truncate(newContent || '*Sin contenido*', 512), inline: false }
            )
            .setTimestamp(newMessage.editedAt || new Date());

        if (newMessage.url) embed.setURL(newMessage.url);
        await sendLog(embed);
        logToFile('MESSAGE_UPDATE', { author: newMessage.author?.tag, channel: newMessage.channel.name, before: truncate(oldContent, 200), after: truncate(newContent, 200) });
    } catch (err) {
        logError('messageUpdate', err);
    }
});

client.on('messageDelete', async (message) => {
    try {
        if (!message.guild || message.guild.id !== CONFIG.serverId) return;

        const cached = memoryStore.messageCache.get(message.id);
        const author = message.author || (cached ? { tag: cached.authorTag, id: cached.authorId } : null);
        if (author?.bot) return;

        memoryStore.stats.deletesLogged++;

        const embed = new EmbedBuilder()
            .setColor(CONFIG.colors.messageDelete)
            .setAuthor({ name: author?.tag || 'Autor desconocido', iconURL: message.author?.displayAvatarURL({ dynamic: true, size: 64 }) })
            .setTitle('🗑️ Mensaje Eliminado')
            .addFields(
                { name: 'Canal', value: `<#${message.channel.id}>`, inline: true },
                { name: 'Autor', value: author ? `<@${author.id}>` : 'Desconocido', inline: true },
                { name: 'Contenido', value: truncate(message.content || cached?.content || '*No disponible*'), inline: false }
            )
            .setTimestamp();

        if (message.attachments?.size > 0) {
            embed.addFields({ name: 'Adjuntos eliminados', value: message.attachments.map(a => `[${a.name}](${a.url})`).join('\n'), inline: false });
        }

        // Obtener quién eliminó del audit log
        const auditEntry = await fetchAuditLog(message.guild, AuditLogEvent.MessageDelete, message.channel.id);
        if (auditEntry) {
            embed.addFields({ name: 'Eliminado por', value: `${auditEntry.executor} (${auditEntry.executor.tag})`, inline: true });
        }

        await sendLog(embed);
        logToFile('MESSAGE_DELETE', { author: author?.tag, channel: message.channel.name, content: truncate(message.content || cached?.content, 200) });
    } catch (err) {
        logError('messageDelete', err);
    }
});

// Member events optimizados
client.on('guildMemberAdd', async (member) => {
    try {
        if (member.guild.id !== CONFIG.serverId) return;
        memoryStore.stats.joinsLogged++;

        const embed = new EmbedBuilder()
            .setColor(CONFIG.colors.memberJoin)
            .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL({ dynamic: true, size: 64 }) })
            .setTitle('🟢 Miembro Nuevo')
            .addFields(
                { name: 'Usuario', value: `${member.user}`, inline: true },
                { name: 'ID', value: member.user.id, inline: true },
                { name: 'Cuenta creada', value: formatDate(member.user.createdAt), inline: false },
                { name: 'Miembros totales', value: `${member.guild.memberCount}`, inline: true }
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setTimestamp();

        await sendLog(embed);
        logToFile('MEMBER_ADD', { user: member.user.tag, id: member.user.id });
    } catch (err) {
        logError('guildMemberAdd', err);
    }
});

client.on('guildMemberRemove', async (member) => {
    try {
        if (member.guild.id !== CONFIG.serverId) return;
        memoryStore.stats.leavesLogged++;

        const auditEntry = await fetchAuditLog(member.guild, AuditLogEvent.MemberKick, member.user.id);
        const kickedBy = auditEntry?.executor;
        if (kickedBy) memoryStore.stats.kicksLogged++;

        const color = kickedBy ? CONFIG.colors.memberKick : CONFIG.colors.memberLeave;
        const title = kickedBy ? '👢 Miembro Expulsado' : '🔴 Miembro Abandonó';

        const roles = member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name).join(', ') || 'Sin roles';

        const embed = new EmbedBuilder()
            .setColor(color)
            .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL({ dynamic: true, size: 64 }) })
            .setTitle(title)
            .addFields(
                { name: 'Usuario', value: `${member.user}`, inline: true },
                { name: 'ID', value: member.user.id, inline: true },
                { name: 'Se unió el', value: formatDate(member.joinedAt), inline: false },
                { name: 'Roles previos', value: truncate(roles, 512), inline: false }
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
            .setTimestamp();

        if (kickedBy) {
            embed.addFields(
                { name: 'Expulsado por', value: `${kickedBy} (${kickedBy.tag})`, inline: true },
                { name: 'Razón', value: 'Ver logs de moderación', inline: true }
            );
        }

        await sendLog(embed);
        logToFile('MEMBER_REMOVE', { user: member.user.tag, kicked: !!kickedBy, kickedBy: kickedBy?.tag || null });
    } catch (err) {
        logError('guildMemberRemove', err);
    }
});

client.on('guildBanAdd', async (ban) => {
    try {
        if (ban.guild.id !== CONFIG.serverId) return;
        memoryStore.stats.bansLogged++;

        const auditEntry = await fetchAuditLog(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id, 10000);
        const moderator = auditEntry?.executor;
        const reason = auditEntry?.reason || 'Sin razón especificada';

        const embed = new EmbedBuilder()
            .setColor(CONFIG.colors.memberBan)
            .setAuthor({ name: ban.user.tag, iconURL: ban.user.displayAvatarURL({ dynamic: true, size: 64 }) })
            .setTitle('⛔ Miembro Baneado')
            .addFields(
                { name: 'Usuario', value: `${ban.user}`, inline: true },
                { name: 'ID', value: ban.user.id, inline: true },
                { name: 'Razón', value: truncate(reason), inline: false }
            )
            .setTimestamp();

        if (moderator) {
            embed.addFields({ name: 'Baneado por', value: `${moderator} (${moderator.tag})`, inline: true });
        }

        await sendLog(embed, 'mod');
        logToFile('MEMBER_BAN_ADD', { user: ban.user.tag, moderator: moderator?.tag, reason });
    } catch (err) {
        logError('guildBanAdd', err);
    }
});

client.on('guildBanRemove', async (ban) => {
    try {
        if (ban.guild.id !== CONFIG.serverId) return;

        const auditEntry = await fetchAuditLog(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id, 10000);
        const moderator = auditEntry?.executor;

        const embed = new EmbedBuilder()
            .setColor(CONFIG.colors.memberUnban)
            .setAuthor({ name: ban.user.tag, iconURL: ban.user.displayAvatarURL({ dynamic: true, size: 64 }) })
            .setTitle('✅ Miembro Desbaneado')
            .addFields(
                { name: 'Usuario', value: `${ban.user}`, inline: true },
                { name: 'ID', value: ban.user.id, inline: true }
            )
            .setTimestamp();

        if (moderator) {
            embed.addFields({ name: 'Desbaneado por', value: `${moderator} (${moderator.tag})`, inline: true });
        }

        await sendLog(embed, 'mod');
        logToFile('MEMBER_BAN_REMOVE', { user: ban.user.tag, moderator: moderator?.tag });
    } catch (err) {
        logError('guildBanRemove', err);
    }
});

// Role update handler
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    try {
        if (newMember.guild.id !== CONFIG.serverId) return;

        const oldRoles = oldMember.roles.cache;
        const newRoles = newMember.roles.cache;

        const addedRoles = newRoles.filter(r => !oldRoles.has(r.id));
        const removedRoles = oldRoles.filter(r => !newRoles.has(r.id));

        // Solo cambio de apodo
        if (addedRoles.size === 0 && removedRoles.size === 0) {
            if (oldMember.nickname !== newMember.nickname) {
                const embed = new EmbedBuilder()
                    .setColor(CONFIG.colors.nickname)
                    .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL({ dynamic: true, size: 64 }) })
                    .setTitle('📝 Cambio de Apodo')
                    .addFields(
                        { name: 'Usuario', value: `${newMember.user}`, inline: true },
                        { name: 'Apodo anterior', value: oldMember.nickname || '*Sin apodo*', inline: true },
                        { name: 'Apodo nuevo', value: newMember.nickname || '*Sin apodo*', inline: true }
                    )
                    .setTimestamp();

                await sendLog(embed);
                logToFile('NICKNAME_CHANGE', { user: newMember.user.tag, before: oldMember.nickname, after: newMember.nickname });
            }
            return;
        }

        memoryStore.stats.roleChangesLogged++;

        const auditEntry = await fetchAuditLog(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.user.id);
        const executor = auditEntry?.executor;

        const logPromises = [];

        for (const [, role] of addedRoles) {
            const embed = new EmbedBuilder()
                .setColor(CONFIG.colors.roleAdd)
                .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL({ dynamic: true, size: 64 }) })
                .setTitle('➕ Rol Añadido')
                .addFields(
                    { name: 'Usuario', value: `${newMember.user}`, inline: true },
                    { name: 'Rol', value: `${role} (\`${role.name}\`)`, inline: true }
                )
                .setTimestamp();

            if (executor) {
                embed.addFields({ name: 'Cambiado por', value: `${executor} (${executor.tag})`, inline: true });
            }

            logPromises.push(sendLog(embed));
            logPromises.push(logToFile('ROLE_ADD', { user: newMember.user.tag, role: role.name }));
        }

        for (const [, role] of removedRoles) {
            const embed = new EmbedBuilder()
                .setColor(CONFIG.colors.roleRemove)
                .setAuthor({ name: newMember.user.tag, iconURL: newMember.user.displayAvatarURL({ dynamic: true, size: 64 }) })
                .setTitle('➖ Rol Quitado')
                .addFields(
                    { name: 'Usuario', value: `${newMember.user}`, inline: true },
                    { name: 'Rol', value: `${role} (\`${role.name}\`)`, inline: true }
                )
                .setTimestamp();

            if (executor) {
                embed.addFields({ name: 'Cambiado por', value: `${executor} (${executor.tag})`, inline: true });
            }

            logPromises.push(sendLog(embed));
            logPromises.push(logToFile('ROLE_REMOVE', { user: newMember.user.tag, role: role.name }));
        }

        await Promise.all(logPromises);
    } catch (err) {
        logError('guildMemberUpdate', err);
    }
});

// Guild update handler
client.on('guildUpdate', async (oldGuild, newGuild) => {
    try {
        if (newGuild.id !== CONFIG.serverId) return;

        memoryStore.stats.serverUpdatesLogged++;
        const changes = [];

        const checks = [
            ['Nombre', oldGuild.name, newGuild.name],
            ['Descripción', oldGuild.description, newGuild.description],
            ['Nivel verificación', oldGuild.verificationLevel, newGuild.verificationLevel],
            ['Filtro contenido', oldGuild.explicitContentFilter, newGuild.explicitContentFilter],
            ['Notificaciones', oldGuild.defaultMessageNotifications, newGuild.defaultMessageNotifications],
            ['Canal sistema', oldGuild.systemChannelId, newGuild.systemChannelId],
            ['Canal reglas', oldGuild.rulesChannelId, newGuild.rulesChannelId],
            ['Canal AFK', oldGuild.afkChannelId, newGuild.afkChannelId],
            ['Timeout AFK', oldGuild.afkTimeout, newGuild.afkTimeout]
        ];

        for (const [name, oldVal, newVal] of checks) {
            if (oldVal !== newVal) {
                changes.push({ name, value: `${oldVal || 'Ninguno'} → ${newVal || 'Ninguno'}`, inline: name !== 'Descripción' });
            }
        }

        if (changes.length === 0) return;

        const auditEntry = await fetchAuditLog(newGuild, AuditLogEvent.GuildUpdate, newGuild.id);
        const moderator = auditEntry?.executor;

        const embed = new EmbedBuilder()
            .setColor(CONFIG.colors.serverUpdate)
            .setTitle('⚙️ Servidor Actualizado')
            .addFields(changes)
            .setTimestamp();

        if (moderator) {
            embed.addFields({ name: 'Actualizado por', value: `${moderator} (${moderator.tag})`, inline: true });
        }

        await sendLog(embed, 'mod');
        logToFile('GUILD_UPDATE', { changes: changes.map(c => `${c.name}: ${c.value}`) });
    } catch (err) {
        logError('guildUpdate', err);
    }
});

// Channel events optimizados
client.on('channelCreate', async (channel) => {
    try {
        if (!channel.guild || channel.guild.id !== CONFIG.serverId) return;

        const auditEntry = await fetchAuditLog(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
        const moderator = auditEntry?.executor;

        const typeNames = {
            [ChannelType.GuildText]: 'Texto', [ChannelType.GuildVoice]: 'Voz',
            [ChannelType.GuildCategory]: 'Categoría', [ChannelType.GuildAnnouncement]: 'Anuncios',
            [ChannelType.GuildForum]: 'Foro', [ChannelType.GuildMedia]: 'Media'
        };

        const embed = new EmbedBuilder()
            .setColor(CONFIG.colors.channelCreate)
            .setTitle('📁 Canal Creado')
            .addFields(
                { name: 'Nombre', value: `#${channel.name}`, inline: true },
                { name: 'Tipo', value: typeNames[channel.type] || `Tipo ${channel.type}`, inline: true },
                { name: 'Categoría', value: channel.parent?.name || 'Sin categoría', inline: true }
            )
            .setTimestamp();

        if (moderator) {
            embed.addFields({ name: 'Creado por', value: `${moderator} (${moderator.tag})`, inline: true });
        }

        await sendLog(embed);
        logToFile('CHANNEL_CREATE', { name: channel.name, type: channel.type, by: moderator?.tag });
    } catch (err) {
        logError('channelCreate', err);
    }
});

client.on('channelDelete', async (channel) => {
    try {
        if (!channel.guild || channel.guild.id !== CONFIG.serverId) return;

        const auditEntry = await fetchAuditLog(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
        const moderator = auditEntry?.executor;

        const embed = new EmbedBuilder()
            .setColor(CONFIG.colors.channelDelete)
            .setTitle('🗑️ Canal Eliminado')
            .addFields(
                { name: 'Nombre', value: `#${channel.name}`, inline: true },
                { name: 'Tipo', value: channel.type.toString(), inline: true }
            )
            .setTimestamp();

        if (moderator) {
            embed.addFields({ name: 'Eliminado por', value: `${moderator} (${moderator.tag})`, inline: true });
        }

        await sendLog(embed);
        logToFile('CHANNEL_DELETE', { name: channel.name, type: channel.type, by: moderator?.tag });
    } catch (err) {
        logError('channelDelete', err);
    }
});

client.on('channelUpdate', async (oldChannel, newChannel) => {
    try {
        if (!newChannel.guild || newChannel.guild.id !== CONFIG.serverId) return;

        const changes = [];
        if (oldChannel.name !== newChannel.name) {
            changes.push({ name: 'Nombre', value: `#${oldChannel.name} → #${newChannel.name}`, inline: true });
        }
        if (oldChannel.topic !== newChannel.topic) {
            changes.push({ name: 'Tema', value: truncate(newChannel.topic || 'Sin tema'), inline: false });
        }

        if (changes.length === 0) return;

        const auditEntry = await fetchAuditLog(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);
        const moderator = auditEntry?.executor;

        const embed = new EmbedBuilder()
            .setColor(CONFIG.colors.channelUpdate)
            .setTitle('✏️ Canal Actualizado')
            .addFields(changes)
            .setTimestamp();

        if (moderator) {
            embed.addFields({ name: 'Actualizado por', value: `${moderator} (${moderator.tag})`, inline: true });
        }

        await sendLog(embed);
        logToFile('CHANNEL_UPDATE', { name: newChannel.name, changes: changes.map(c => c.value), by: moderator?.tag });
    } catch (err) {
        logError('channelUpdate', err);
    }
});

// ============================================================
// INTERACTION HANDLERS (Centralizados)
// ============================================================

client.on('interactionCreate', async (interaction) => {
    try {
        // Loggear TODAS las interacciones (slash commands, botones, etc.)
        if (interaction.isChatInputCommand()) {
            memoryStore.stats.commandsLogged++;
            console.log(`[bot3] Slash command ejecutado: /${interaction.commandName} por ${interaction.user.tag}`);

            const embed = new EmbedBuilder()
                .setColor(CONFIG.colors.commandExecute)
                .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true, size: 64 }) })
                .setTitle('⌨️ Comando Slash Ejecutado')
                .addFields(
                    { name: 'Comando', value: `/${interaction.commandName}`, inline: true },
                    { name: 'Usuario', value: `${interaction.user}`, inline: true },
                    { name: 'Canal', value: interaction.channel?.name || 'DM', inline: true }
                )
                .setTimestamp();

            await sendLog(embed);
            logToFile('SLASH_COMMAND', { command: interaction.commandName, user: interaction.user.tag, channel: interaction.channel?.name });

            await handleSlashCommand(interaction);
        }
        else if (interaction.isButton()) {
            console.log(`[bot3] Botón presionado: ${interaction.customId} por ${interaction.user.tag}`);
            await handleButton(interaction);
        }
        else if (interaction.isStringSelectMenu()) {
            console.log(`[bot3] Select menu: ${interaction.customId} por ${interaction.user.tag}`);
            await handleSelectMenu(interaction);
        }
        else if (interaction.isModalSubmit()) {
            console.log(`[bot3] Modal submit: ${interaction.customId} por ${interaction.user.tag}`);
            await handleModalSubmit(interaction);
        }
    } catch (err) {
        console.error(`[bot3] Error en interactionCreate: ${err.message}`);
        logError('interactionCreate', err);
    }
});

// ============================================================
// INICIO DEL BOT
// ============================================================

console.log('[bot3] 🎮 Iniciando Bot de Auditoría...');
client.login(CONFIG.token);

process.on('unhandledRejection', (error) => {
    logError('unhandledRejection', error);
});
