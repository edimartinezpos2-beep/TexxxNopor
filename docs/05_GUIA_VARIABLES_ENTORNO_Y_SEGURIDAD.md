# 🔐 Guía de Variables de Entorno, Credenciales y Seguridad

**Plataforma de Streaming TexxxNopor**  
*Versión:* `1.0.2` | *Manual de Configuración y Seguridad*

---

## 1. Diccionario Completo de Variables de Entorno (`.env`)

A continuación se detalla cada una de las variables requeridas en el archivo `.env` del backend y en el panel de configuración de **Render**:

### A. Configuración del Servidor y Base de Datos
| Variable | Tipo / Formato | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `PORT` | Numérico | Puerto de escucha del servidor Express | `4000` |
| `NODE_ENV` | String | Entorno de ejecución (`development` o `production`) | `production` |
| `DATABASE_URL` | URI PostgreSQL | Cadena de conexión segura con Prisma ORM | `postgresql://user:pass@ep-host.render.com/db_texxxnopor?sslmode=require` |
| `JWT_SECRET` | String secreto | Clave para firmar y verificar tokens de autenticación | `super-secret-texxxnopor-jwt-key-2026` |

### B. Bunny.net (Almacenamiento Edge y CDN de Video +18)
| Variable | Tipo / Formato | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `BUNNY_STORAGE_ZONE_NAME` | String | Nombre de la zona de almacenamiento en Bunny | `texxxnopor` |
| `BUNNY_ACCESS_KEY` | UUID / Clave API | Contraseña de acceso a la Storage Zone | `fbcd62d0-a06e-4816-944217d8df7a-4a63-4601` |
| `BUNNY_STORAGE_HOSTNAME` | Hostname | Endpoint de subida de Bunny.net | `storage.bunnycdn.com` |
| `BUNNY_CDN_HOSTNAME` | Hostname / CDN | Dominio de entrega rápida para streaming HLS | `texxxnopor.b-cdn.net` |

### C. Cloudinary Media Gateway (Subidas e Imágenes)
| Variable | Tipo / Formato | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `CLOUDINARY_CLOUD_NAME` | String | Nombre de cuenta en Cloudinary | `djw...` |
| `CLOUDINARY_API_KEY` | Numérico | Llave pública de API | `49281928491` |
| `CLOUDINARY_API_SECRET` | String | Secreto de API para firma de subidas | `AbCdEfGhIjKlMnOpQrStUvWxYz` |

### D. Pasarela de Pagos Wompi (Bancolombia)
| Variable | Tipo / Formato | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `WOMPI_API_URL` | URL | Endpoint de API (`sandbox` o `production`) | `https://sandbox.wompi.co/v1` |
| `WOMPI_PUBLIC_KEY` | String | Llave pública (`pub_test_...` o `pub_prod_...`) | `pub_test_Q5yDA9xoKdePzhSGeVe9KStXTIHsIOXD` |
| `WOMPI_PRIVATE_KEY` | String | Llave privada (`prv_test_...` o `prv_prod_...`) | `prv_test_5jMh8lV6U2wX7yZ0a1b2c3d4e5f6g7h8` |
| `WOMPI_INTEGRITY_SECRET` | String | Secreto para generación de firmas SHA-256 | `integrity_test_sample_secret` |
| `WOMPI_EVENTS_SECRET` | String | Secreto de validación de Webhooks | `events_test_sample_secret` |

### E. Control y Caducidad de Versiones (Force Update)
| Variable | Tipo / Formato | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `APP_LATEST_VERSION` | SemVer | Última versión lanzada de la app | `1.0.2` |
| `APP_MIN_SUPPORTED_VERSION` | SemVer | Versión mínima permitida (bloquea anteriores) | `1.0.2` |
| `APP_UPDATE_URL` | URL | Enlace de descarga del nuevo APK | `https://github.com/edimartinezpos2-beep/TexxxNopor/releases/latest` |

### F. Recuperación de Contraseñas y Correos (Nodemailer)
| Variable | Tipo / Formato | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `SMTP_HOST` | Hostname | Servidor SMTP de correo | `smtp.gmail.com` |
| `SMTP_PORT` | Numérico | Puerto de conexión SMTP (465 o 587) | `587` |
| `SMTP_USER` | Correo | Correo remitente oficial | `soporte.texxxnopor@gmail.com` |
| `SMTP_PASS` | Contraseña App | Contraseña de aplicación generada en Google | `abcd efgh ijkl mnop` |

---

## 2. Plantilla de Archivo `.env` Completa para el Backend

```env
# Servidor Express y Base de Datos
PORT=4000
NODE_ENV=production
DATABASE_URL="postgresql://usuario:password@host-render.com/texxxnopor_db?sslmode=require"
JWT_SECRET="super-secret-texxxnopor-production-jwt-key-2026"

# Almacenamiento Bunny.net (+18 Streaming CDN)
BUNNY_STORAGE_ZONE_NAME="texxxnopor"
BUNNY_ACCESS_KEY="fbcd62d0-a06e-4816-944217d8df7a-4a63-4601"
BUNNY_STORAGE_HOSTNAME="storage.bunnycdn.com"
BUNNY_CDN_HOSTNAME="texxxnopor.b-cdn.net"

# Cloudinary Media
CLOUDINARY_CLOUD_NAME="texxxnopor-cloud"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="abcdefghijklmnopqrstuvwxyz12345"

# Pasarela Wompi Bancolombia (Sandbox / Producción)
WOMPI_API_URL="https://sandbox.wompi.co/v1"
WOMPI_PUBLIC_KEY="pub_test_XXXXX"
WOMPI_PRIVATE_KEY="prv_test_XXXXX"
WOMPI_INTEGRITY_SECRET="integrity_test_XXXXX"
WOMPI_EVENTS_SECRET="events_test_XXXXX"

# Control de Versiones (Force Update)
APP_LATEST_VERSION="1.0.2"
APP_MIN_SUPPORTED_VERSION="1.0.2"
APP_UPDATE_URL="https://github.com/edimartinezpos2-beep/TexxxNopor/releases/latest"

# Servidor de Correo para Códigos de 6 Dígitos
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="texxxnopor.app@gmail.com"
SMTP_PASS="xxxx xxxx xxxx xxxx"
```

---

## 3. Políticas de Seguridad y Buenas Prácticas

1. **Protección del Archivo `.env`:**
   - El archivo `.env` está incluido en `.gitignore` y **nunca debe subirse al repositorio público de GitHub**.
   - En Render, las variables se configuran exclusivamente en la pestaña **Environment**.

2. **Rotación de Claves Secretas:**
   - Se recomienda cambiar el `JWT_SECRET` periódicamente si se detecta actividad sospechosa (esto invalidará sesiones antiguas de forma segura).

3. **Copias de Seguridad (Backups) de PostgreSQL:**
   - En Render o Neon, las bases de datos PostgreSQL cuentan con respaldos automáticos diarios.
   - Para generar un respaldo manual local:
     ```bash
     pg_dump "TU_DATABASE_URL" > backup_texxxnopor.sql
     ```
