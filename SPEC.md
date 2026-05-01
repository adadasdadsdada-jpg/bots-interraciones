# SPEC.md — Discord Staff Bot System v2.0

## 1. Concept & Vision

Sistema multi-bot de Discord para gestión de staff con verificación, auditoría y logging. El sistema permite a los miembros solicitar acceso al staff, ser verificados por administradores, y automatiza la asignación de roles y nicknames. Cada acción es auditada y loggeada para compliance.

**Personalidad:** Profesional pero amigable. Los embeds usan colores distintivos por tipo de evento. Los mensajes de error son claros y accionables.

---

## 2. Design Language

### Color Palette (Embeds por evento)
| Evento | Color HEX |
|--------|-----------|
| Message Create | `#00FF00` |
| Message Update | `#FFA500` |
| Message Delete | `#FF0000` |
| Member Join | `#00CED1` |
| Member Leave | `#8B0000` |
| Member Kick | `#DC143C` |
| Member Ban | `#4B0082` |
| Role Add | `#32CD32` |
| Role Remove | `#FF6347` |
| Verification Success | `#00BFFF` |
| Verification Error | `#FF0000` |
| Command Execute | `#9B59B6` |

### Typography
- Discord embeds: Markdown estándar
- Logs: JSON estructurado con timestamps ISO8601
- Console: Consolas con prefix `[NOMBRE_BOT]`

### Spatial System
- Componentes de Discord: Buttons, SelectMenus, Modals
- Espaciado de campos: inline true/false según relevancia
- Thumbnail: 128px para avatares de usuario, 256px para miembros

### Motion Philosophy
- Sin animaciones complejas (Discord API limitation)
- Debounce en ediciones rápidas del mismo mensaje (500ms)
- Rate limiting en envíos DM (10/segundo)

---

## 3. Layout & Structure

### Arquitectura de Archivos (Propuesta)
```
src/
├── shared/
│   ├── config/
│   │   ├── ConfigManager.js      # Carga y valida .env
│   │   └── RoleHierarchy.js      # Jerarquía de roles
│   ├── utils/
│   │   ├── Logger.js             # Logging estructurado
│   │   ├── EmbedFactory.js       # Factory de embeds
│   │   ├── CacheManager.js       # Caché con TTL
│   │   └── StringUtils.js        # Helpers de strings
│   ├── services/
│   │   ├── DiscordClient.js      # Wrapper con reconnect
│   │   ├── VerificationService.js # FSM de verificación
│   │   ├── AuditService.js       # Logging de auditoría
│   │   └── DashboardAPIClient.js # Cliente API robusto
│   └── events/
│       ├── MessageEvents.js
│       ├── MemberEvents.js
│       ├── ChannelEvents.js
│       └── InteractionEvents.js
├── bots/
│   ├── BotBase.js                # Clase base abstracta
│   ├── BotStaffEventos.js        # bot1
│   ├── BotStaffEntretenimiento.js # bot2
│   └── BotStaffFiestas.js        # bot3
├── index.js                      # Entry point
└── config.env.example
tests/
├── unit/
│   ├── Logger.test.js
│   ├── EmbedFactory.test.js
│   ├── CacheManager.test.js
│   └── VerificationService.test.js
└── integration/
    └── bot.test.js
```

---

## 4. Features & Interactions

### 4.1 Sistema de Verificación (FSM)
```
[DORMANT] --click--> [AWAITING_DATA] --submit--> [AWAITING_ROLE] --select--> [PENDING_REVIEW]
                                                                                    |
                                           [APPROVED] <--accept-- [PENDING_REVIEW] --reject--> [REJECTED]
                                           [REJECTED] --retry--> [DORMANT]
```

**Estados:**
- `DORMANT`: Usuario no ha interactuado
- `AWAITING_DATA`: Modal abierto, esperando nombre IC + ID
- `AWAITING_ROLE`: Datos recibidos, esperando selección de rango
- `PENDING_REVIEW`: Solicitud enviada al canal de revisión
- `APPROVED`: Verificación aceptada, rol asignado
- `REJECTED`: Verificación denegada

### 4.2 Comandos Slash
| Comando | Permiso | Descripción |
|---------|---------|-------------|
| `/panel` | @everyone | Muestra panel de verificación |
| `/dm` | Staff | Envía DM a todos los miembros con rol |
| `/clear_logs` | Admin | Borra mensajes del canal de logs |
| `/registrar` | Admin | Registra usuario manualmente |
| `/personalizar` | @everyone | Guarda preferencia de nickname personalizado |
| `/restaurar` | @everyone | Restaura nickname automático |

### 4.3 Logging de Auditoría
- **Message Events**: Create, Edit, Delete
- **Member Events**: Join, Leave, Kick, Ban, Unban, Nickname change
- **Role Events**: Add, Remove
- **Channel Events**: Create, Delete, Update
- **Guild Events**: Update (name, verification level, etc.)
- **Command Events**: Slash command execution

### 4.4 Rate Limiting
- DM envío: 10/segundo máximo
- API calls: 5 requests/segundo con exponential backoff
- Command cooldown: 3 segundos entre ejecuciones del mismo usuario

---

## 5. Component Inventory

### 5.1 Verification Panel Embed
- **Título**: `🛡️ Sistema de Verificación | [NOMBRE_STAFF]`
- **Descripción**: Instrucciones de uso
- **Campos**: Cómo funciona, Datos requeridos, Nota (si aplica)
- **Botón**: "Verificarse" (Primary, emoji 🛡️)
- **Footer**: Versión del sistema

### 5.2 Solicitude Embed (en canal de revisión)
- **Thumbnail**: Avatar del solicitante (128px)
- **Fields**: Discord mention, Nombre IC, ID, Rango
- **Buttons**: Aceptar (Success), Rechazar (Danger)
- **Footer**: `solicitud_[userId]_[timestamp]`

### 5.3 Approval/Rejection Log Embed
- **Color**: Success (verde) o Error (rojo)
- **Fields**: Solicitante, Nombre IC, ID, Rango, Autorizado por, Hora
- **Footer**: `Staff [NOMBRE] - Sistema de Verificación`

### 5.4 DM Approval Message
- **Título**: `🎪 SISTEMA DE VERIFICACIÓN — APROBADO`
- **Descripción**: Mensaje de bienvenida personalizado
- **Fields**: Nombre IC, ID, Rango
- **Nota**: Sobre el nickname actualizado
- **Footer**: Tagline del staff

---

## 6. Technical Approach

### Stack
- **Runtime**: Node.js 18+
- **Discord.js**: v14.14.0
- **Database**: SQLite (better-sqlite3) para persistencia local
- **Testing**: Jest
- **Logging**: Winston o logging estructurado JSON

### API Cliente (DashboardAPIClient)
- Retry con exponential backoff (3 intentos)
- Circuit breaker (5 fallos = 30s open)
- Timeout configurable (default 5000ms)
- Buffer de requests cuando está offline

### Data Model
```javascript
// usuariosRegistrados (Persistido en SQLite)
{
  userId: string,       // Discord user ID
  nombreIC: string,     // In-character name
  idIC: string,         // In-character ID
  rango: string,        // Rango actual
  registeredAt: Date,
  updatedAt: Date
}

// verificationRequests (En memoria + SQLite)
{
  userId: string,
  state: 'DORMANT' | 'AWAITING_DATA' | 'AWAITING_ROLE' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED',
  nombreIC?: string,
  idIC?: string,
  rango?: string,
  requestedAt?: Date,
  reviewedAt?: Date,
  reviewedBy?: string
}
```

### Security
- Tokens en `.env` (nunca hardcoded)
- Rate limiting en todos los endpoints públicos
- Input validation en todos los campos de usuario
- Sanitization en contenido de mensajes para logs

---

## 7. Anti-Patrones a Corregir

| Anti-Patrón | Solución |
|-------------|----------|
| God Classes (+900 líneas) | Extraer a módulos de ≤100 líneas |
| Magic Strings (IDs hardcodeadas) | ConfigManager con validación |
|try-catch silent (`catch (_) {}`) | Logger.warn() con contexto |
| Duplicación DRY | shared/services con inyección |
| Memory leaks (Map sin cleanup) | TTL + maxSize en CacheManager |
| Sin tests | Jest con mocks de Discord.js |
| Sin tipos | JSDoc + TypeScript gradual |

---

## 8. Quality Gates

| Métrica | Target | Acceptable |
|---------|--------|------------|
| Cobertura tests | ≥80% | ≥70% |
| Complejidad ciclomática | ≤8 | ≤10 |
| Líneas por función | ≤30 | ≤50 |
| DRY violations | 0 | 0 |
| console.log statements | 0 | ≤5 (debug) |
| try-catch vacíos | 0 | 0 |
