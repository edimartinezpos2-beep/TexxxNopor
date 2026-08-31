# 🏗️ Manual Técnico y Arquitectura del Sistema

**Plataforma de Streaming TexxxNopor**  
*Versión:* `1.0.2` | *Entorno:* Producción / Híbrido (Móvil & Web)

---

## 1. Visión General de la Arquitectura

La plataforma TexxxNopor está construida bajo una **arquitectura en capas moderna y desacoplada**, diseñada para ofrecer transmisión de video de alta definición (4K / Full HD) con baja latencia, autenticación robusta basada en roles (RBAC) y pagos en moneda local colombiana (COP).

```mermaid
graph TD
    subgraph Clientes ["Clientes Multiplataforma"]
        A1["📱 App Android (APK)"]
        A2["🌐 Plataforma Web (React Native Web)"]
    end

    subgraph CDN_Gateway ["Capa de Distribución y Red"]
        B1["Cloudflare / DNS Global"]
        B2["Bunny.net CDN (Streaming +18)"]
        B3["Cloudinary Media Gateway"]
    end

    subgraph Backend_Cloud ["Backend en Render (Node.js + Express)"]
        C1["API Gateway / Routers REST"]
        C2["Controlador RBAC y Autenticación JWT"]
        C3["Servicio Wompi Bancolombia"]
        C4["Gestor de Subidas & Transcodificación"]
        C5["Servicio de Versionamiento & Force Update"]
        C6["Servicio de Notificaciones"]
    end

    subgraph Storage_DB ["Capa de Datos y Almacenamiento"]
        D1[("PostgreSQL Database (Prisma ORM)")]
        D2["Bunny.net Edge Storage"]
        D3["Cloudinary Video Cloud"]
    end

    subgraph Pasarela_Pagos ["Servicios Externos de Pago"]
        E1["Wompi API / Redeban"]
        E2["PSE / Bancos Colombianos"]
        E3["Nequi / Daviplata"]
    end

    A1 -->|HTTPS REST| B1
    A2 -->|HTTPS REST| B1
    B1 --> C1

    A1 -->|HLS .m3u8 Streams| B2
    A2 -->|HLS .m3u8 Streams| B2

    C1 --> C2
    C1 --> C3
    C1 --> C4
    C1 --> C5
    C1 --> C6

    C1 --> D1
    C4 --> D2
    C4 --> D3
    C3 --> E1
    E1 --> E2
    E1 --> E3
```

---

## 2. Diagrama de Flujo: Ingesta, Publicación y Streaming HLS

```mermaid
sequenceDiagram
    autonumber
    participant Creador as 👤 Creador / Admin
    participant App as 📱 App Móvil / Web
    participant Backend as ⚙️ Backend API (Render)
    participant Cloudinary as ☁️ Cloudinary / Bunny.net
    participant DB as 🐘 PostgreSQL (Prisma)
    participant Espectador as 👥 Espectador

    Creador->>App: Selecciona video MP4/MOV y miniatura
    App->>Backend: POST /api/upload/video (FormData con token JWT)
    Backend->>Cloudinary: Ingesta directa segura (Stream upload)
    Cloudinary-->>Backend: Retorna secure_url, public_id y duración
    Backend->>DB: Crea registro Video (Status: READY)
    Backend-->>App: Notifica video publicado con éxito

    Espectador->>App: Selecciona video para reproducir
    App->>Backend: GET /api/videos/:id
    Backend->>DB: Consulta video y suma vista (+1)
    Backend-->>App: Retorna videoUrl, hlsMasterUrl y metadatos
    App->>Cloudinary: Reproduce video HLS adaptativo con buffer optimizado
    App->>Backend: POST /api/videos/:id/history (Registra segundo de reproducción)
```

---

## 3. Modelo de Base de Datos (Entity-Relationship Diagram)

La base de datos relacional opera sobre **PostgreSQL**, gestionada a través de **Prisma ORM**:

```mermaid
erDiagram
    USER ||--o| CREATOR_PROFILE : "posee perfil creador"
    USER ||--o| ACTOR : "vinculado a actriz/actor"
    USER ||--o{ PLAYLIST : "crea listas"
    USER ||--o{ FAVORITE : "guarda favoritos"
    USER ||--o{ PLAYBACK_HISTORY : "registra historial"
    USER ||--o{ VIDEO_LIKE : "da me gusta"
    USER ||--o{ COMMENT : "escribe comentarios"
    USER ||--o{ FOLLOW : "sigue a creadores"
    USER ||--o{ MODERATION_LOG : "audita como admin"

    ACTOR ||--o{ VIDEO : "participa en videos"
    ACTOR ||--o{ PLAYLIST : "organiza listas oficiales"
    ACTOR ||--o{ FOLLOW : "recibe seguidores"

    CREATOR_PROFILE ||--o{ VIDEO : "publica producciones"
    CREATOR_PROFILE ||--o{ PAYOUT_RECORD : "recibe pagos"

    VIDEO ||--o{ COMMENT : "tiene comentarios"
    VIDEO ||--o{ VIDEO_LIKE : "recibe likes"
    VIDEO ||--o{ FAVORITE : "es guardado"
    VIDEO ||--o{ PLAYBACK_HISTORY : "visto en historial"
    VIDEO ||--o{ PLAYLIST_ITEM : "pertenece a listas"
    VIDEO ||--o{ VIDEO_TAG : "etiquetado con"
    VIDEO }o--|| CATEGORY : "categorizado en"

    PLAYLIST ||--o{ PLAYLIST_ITEM : "contiene elementos"
    TAG ||--o{ VIDEO_TAG : "asociado a videos"

    USER {
        string id PK
        string email UK
        string username UK
        string passwordHash
        enum role "ADMIN, CREATOR, CONSUMER"
        int age
        boolean isVerified
        string avatarUrl
        string resetPasswordCode
        datetime createdAt
    }

    ACTOR {
        string id PK
        string name
        string stageName UK
        string bio
        string avatarUrl
        string bannerUrl
        string nationality
        boolean isVerified
        string userId FK
    }

    VIDEO {
        string id PK
        string title
        string description
        string duration
        int durationSeconds
        string videoUrl
        string hlsMasterUrl
        string thumbnailUrl
        enum status "READY, UPLOADING, FLAGGED, REJECTED"
        bigint viewsCount
        bigint likesCount
        string categoryId FK
        string actorId FK
        string creatorId FK
        boolean isFollowersOnly
        datetime createdAt
    }

    COMMENT {
        string id PK
        string videoId FK
        string userId FK
        string text
        int likesCount
        datetime createdAt
    }

    PLAYLIST {
        string id PK
        string title
        string description
        boolean isPrivate
        string actorId FK
        string userId FK
    }
```

---

## 4. Catálogo Completo de Endpoints REST de la API

La API expone los siguientes controladores principales bajo el prefijo `/api`:

### A. Autenticación y Cuentas (`/api/auth`)
| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/auth/bootstrap-status` | Público | Indica si existe un Administrador en el sistema. |
| `POST` | `/api/auth/register` | Público | Registra usuario (valida +18 años). El primer usuario registrado es `ADMIN`. |
| `POST` | `/api/auth/login` | Público | Inicia sesión y genera token JWT (duración 7 días). |
| `POST` | `/api/auth/social` | Público | Autenticación con Google y Facebook. |
| `POST` | `/api/auth/forgot-password` | Público | Genera código de 6 dígitos para recuperación. |
| `POST` | `/api/auth/verify-reset-code` | Público | Valida la vigencia del código de 6 dígitos. |
| `POST` | `/api/auth/reset-password` | Público | Actualiza la contraseña con el código validado. |
| `GET` | `/api/auth/me` | JWT | Retorna el perfil completo del usuario autenticado. |

### B. Videos y Streaming (`/api/videos`)
| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/videos` | Público | Obtiene el feed de videos con filtros (`category`, `q`, `tag`). |
| `GET` | `/api/videos/:id` | Público | Obtiene detalle del video y suma contador de vistas. |
| `POST` | `/api/videos/:id/like` | JWT | Alterna estado de "Me Gusta" (Like/Unlike). |
| `POST` | `/api/videos/:id/favorite` | JWT | Guarda/Elimina de "Ver Más Tarde". |
| `POST` | `/api/videos/:id/history` | JWT | Guarda progreso de reproducción en segundos. |
| `GET` | `/api/videos/:id/comments` | Público | Lista los comentarios de un video. |
| `POST` | `/api/videos/:id/comments` | JWT | Publica un nuevo comentario. |

### C. Pasarela de Pagos Wompi (`/api/wompi`)
| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/wompi/banks` | Público | Lista de bancos colombianos PSE con códigos ACH. |
| `POST` | `/api/wompi/create-transaction` | JWT | Crea transacción en Wompi (PSE, Nequi, Tarjetas). |
| `GET` | `/api/wompi/status/:transactionId`| JWT | Consulta estado en tiempo real de una transacción. |
| `POST` | `/api/wompi/webhook` | Wompi IP | Webhook automático para activación de VIP. |

### D. Control de Versiones y Caducidad (`/api/app`)
| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/app/version-check` | Público | Verifica si la versión instalada ha caducado (`isOutdated: true`). |

### E. Actores y Creadores (`/api/actors` & `/api/admin/actors`)
| Método | Endpoint | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/actors` | Público | Lista todos los actores/actrices con conteo de videos. |
| `GET` | `/api/actors/:id` | Público | Perfil completo del actor con videos, playlists y seguidores. |
| `POST` | `/api/admin/actors` | ADMIN | Registra un nuevo actor con foto y biografía. |
| `PUT` | `/api/admin/actors/:id` | ADMIN / Creador | Actualiza datos del perfil del actor. |
| `DELETE`| `/api/admin/actors/:id` | ADMIN | Elimina un actor y reasigna videos a independiente. |

---

## 5. Protocolos de Seguridad y Cifrado

1. **Tokens de Acceso JWT (JSON Web Tokens):**
   - Firmados con algoritmo `HS256` utilizando la clave `JWT_SECRET`.
   - Contienen `userId`, `email` y `role`.
   - Expiración estándar de 7 días.

2. **Cifrado de Contraseñas:**
   - Implementado con **bcrypt** con factor de costo 10 (salt rounds).
   - Las contraseñas en texto plano nunca se almacenan ni se transmiten en logs.

3. **Cifrado de Firmas de Transacción Wompi:**
   - Firma criptográfica **SHA-256** calculada en el backend antes del envío:
     $$\text{Signature} = \text{SHA256}(\text{reference} + \text{amountInCents} + \text{currency} + \text{integritySecret})$$

4. **Filtro de Edad (+18 Gate):**
   - Validación forzosa tanto en el cliente como en el backend. Registros con edad $< 18$ o confirmación falsa son rechazados con código HTTP 400.
