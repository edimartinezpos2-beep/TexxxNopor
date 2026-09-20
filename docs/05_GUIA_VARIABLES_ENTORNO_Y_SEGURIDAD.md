# 🔐 Guía de Variables de Entorno, Credenciales y Seguridad

**Plataforma de Streaming TexxxNopor**  
*Versión:* `1.0.3` | *Manual de Configuración, Ciberseguridad y Operaciones*

---

## 1. Diccionario Completo de Variables de Entorno (`.env`)

A continuación se detalla cada una de las variables requeridas en el archivo `.env` del backend y en el panel de configuración de **Render**:

### A. Configuración del Servidor y Base de Datos
| Variable | Tipo / Formato | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `PORT` | Numérico | Puerto de escucha local del servidor Express | `4000` |
| `NODE_ENV` | String | Entorno de ejecución (`development` o `production`) | `production` |
| `DATABASE_URL` | URI PostgreSQL | Cadena de conexión segura a PostgreSQL con Prisma ORM | `postgresql://user:pass@host.render.com/db_texxxnopor?sslmode=require` |
| `JWT_SECRET` | String Secreto | Clave criptográfica para firmar y verificar tokens de sesión | `super-secret-texxxnopor-jwt-key-2026` |

### B. Bunny.net (Almacenamiento Edge y CDN de Video Adulto +18)
| Variable | Tipo / Formato | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `BUNNY_STORAGE_ZONE_NAME` | String | Nombre de la zona de almacenamiento en Bunny | `texxxnopor` |
| `BUNNY_ACCESS_KEY` | UUID / Clave API | Contraseña de acceso a la Storage Zone de Bunny | `fbcd62d0-a06e-4816-944217d8df7a-4a63-4601` |
| `BUNNY_STORAGE_HOSTNAME` | Hostname | Endpoint regional de subida de Bunny.net | `storage.bunnycdn.com` |
| `BUNNY_CDN_HOSTNAME` | Hostname / CDN | Dominio de entrega ultra rápida para streaming HLS | `texxxnopor.b-cdn.net` |

### C. Cloudinary Media Gateway (Miniaturas y Assets)
| Variable | Tipo / Formato | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `CLOUDINARY_CLOUD_NAME` | String | Nombre de cuenta en Cloudinary | `djw...` |
| `CLOUDINARY_API_KEY` | Numérico | Llave pública de API de Cloudinary | `49281928491` |
| `CLOUDINARY_API_SECRET` | String | Secreto de API para firma de subidas seguras | `AbCdEfGhIjKlMnOpQrStUvWxYz` |

### D. Pasarela de Pagos Wompi (Bancolombia)
| Variable | Tipo / Formato | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `WOMPI_API_URL` | URL | Endpoint de API (`sandbox` o `production`) | `https://sandbox.wompi.co/v1` |
| `WOMPI_PUBLIC_KEY` | String | Llave pública (`pub_test_...` o `pub_prod_...`) | `pub_test_Q5yDA9xoKdePzhSGeVe9KStXTIHsIOXD` |
| `WOMPI_PRIVATE_KEY` | String | Llave privada (`prv_test_...` o `prv_prod_...`) | `prv_test_5jMh8lV6U2wX7yZ0a1b2c3d4e5f6g7h8` |
| `WOMPI_INTEGRITY_SECRET` | String | Secreto para generación de firmas SHA-256 | `integrity_test_sample_secret` |
| `WOMPI_EVENTS_SECRET` | String | Secreto de validación de Webhooks en segundo plano | `events_test_sample_secret` |

### E. Control de Versiones, Caducidad y Enlace Permanente de APK
| Variable | Tipo / Formato | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `APP_LATEST_VERSION` | SemVer | Última versión lanzada de la app móvil | `1.0.3` |
| `APP_MIN_SUPPORTED_VERSION` | SemVer | Versión mínima permitida (bloquea anteriores con Force Update) | `1.0.3` |
| `APP_UPDATE_URL` | URL Permanente | Enlace permanente de descarga del APK en la nube | `https://github.com/edimartinezpos2-beep/TexxxNopor/releases/latest` |
| `WEB_URL` | URL | Dirección web oficial de la plataforma para redirección | `https://texxxnopor-web.onrender.com/` |

> [!IMPORTANT]
> **Importancia Crítica de `APP_UPDATE_URL`:**  
> Como Render utiliza almacenamiento en disco efímero, los archivos colocados en la carpeta `uploads/` se eliminan si el servidor se reinicia. Mantener `APP_UPDATE_URL` configurado en Render asegura que la descarga del APK nunca se interrumpa.

### F. Servidor de Correo para Códigos OTP de 4 Dígitos (Nodemailer)
| Variable | Tipo / Formato | Descripción | Ejemplo |
| :--- | :--- | :--- | :--- |
| `SMTP_HOST` | Hostname | Servidor SMTP de correo saliente | `smtp.gmail.com` |
| `SMTP_PORT` | Numérico | Puerto de conexión SMTP (587 para STARTTLS, 465 para SSL) | `587` |
| `SMTP_USER` | Correo | Correo remitente oficial de TexxxNopor | `soporte.texxxnopor@gmail.com` |
| `SMTP_PASS` | Contraseña App | Contraseña de aplicación generada en la cuenta de Google | `xxxx xxxx xxxx xxxx` |

---

## 2. Plantilla de Archivo `.env` Completa para el Backend

```env
# ================================================================
# SERVIDOR EXPRESS Y BASE DE DATOS
# ================================================================
PORT=4000
NODE_ENV=production
DATABASE_URL="postgresql://usuario:password@host-render.com/texxxnopor_db?sslmode=require"
JWT_SECRET="super-secret-texxxnopor-production-jwt-key-2026"

# ================================================================
# ALMACENAMIENTO BUNNY.NET (+18 STREAMING CDN)
# ================================================================
BUNNY_STORAGE_ZONE_NAME="texxxnopor"
BUNNY_ACCESS_KEY="fbcd62d0-a06e-4816-944217d8df7a-4a63-4601"
BUNNY_STORAGE_HOSTNAME="storage.bunnycdn.com"
BUNNY_CDN_HOSTNAME="texxxnopor.b-cdn.net"

# ================================================================
# CLOUDINARY MEDIA GATEWAY (IMÁGENES Y ASSETS)
# ================================================================
CLOUDINARY_CLOUD_NAME="texxxnopor-cloud"
CLOUDINARY_API_KEY="123456789012345"
CLOUDINARY_API_SECRET="abcdefghijklmnopqrstuvwxyz12345"

# ================================================================
# PASARELA WOMPI BANCOLOMBIA (SANDBOX / PRODUCCIÓN)
# ================================================================
WOMPI_API_URL="https://sandbox.wompi.co/v1"
WOMPI_PUBLIC_KEY="pub_test_XXXXX"
WOMPI_PRIVATE_KEY="prv_test_XXXXX"
WOMPI_INTEGRITY_SECRET="integrity_test_XXXXX"
WOMPI_EVENTS_SECRET="events_test_XXXXX"

# ================================================================
# CONTROL DE VERSIONES Y DISTRIBUCIÓN DE APK
# ================================================================
APP_LATEST_VERSION="1.0.3"
APP_MIN_SUPPORTED_VERSION="1.0.3"
APP_UPDATE_URL="https://github.com/edimartinezpos2-beep/TexxxNopor/releases/latest"
WEB_URL="https://texxxnopor-web.onrender.com/"

# ================================================================
# SERVICIO DE CORREO (CÓDIGOS OTP 4 DÍGITOS TIKTOK DECK)
# ================================================================
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="soporte.texxxnopor@gmail.com"
SMTP_PASS="xxxx xxxx xxxx xxxx"
```

---

## 3. Variables de Entorno para el Frontend Universal (`mobile/`)

En el proyecto unificado `mobile/`, las variables públicas que se compilan tanto para el APK nativo como para la web de Render utilizan el prefijo `EXPO_PUBLIC_`:

```env
# URL base del Backend en Render
EXPO_PUBLIC_API_URL="https://texxxnopor-backend.onrender.com"

# Enlace directo de Checkout oficial de Wompi
EXPO_PUBLIC_WOMPI_URL="https://checkout.wompi.co/l/VPOS_4BlRq7"

# URL pública de la web oficial
EXPO_PUBLIC_WEB_URL="https://texxxnopor-web.onrender.com/"
```

---

## 4. Políticas de Ciberseguridad y Buenas Prácticas

1. **Protección Estricta de Secretos:**
   - Los archivos `.env` están listados en el archivo `.gitignore` y **jamás deben comitearse al repositorio público**.
   - En Render, todos los valores se configuran de forma segura y cifrada en la sección **Environment**.

2. **Cifrado de Contraseñas y Datos Sensibles:**
   - Las contraseñas de los usuarios se procesan mediante **bcrypt** con 10 rondas de salt antes de registrarse en la base de datos PostgreSQL.
   - Las contraseñas en texto plano nunca se registran en consolas ni archivos de log.

3. **Resiliencia en el Envío de Códigos OTP:**
   - En [backend/src/services/emailService.ts](file:///c:/Users/Usuario/Desktop/TexxxNopor/backend/src/services/emailService.ts), las peticiones SMTP cuentan con un tiempo límite de carrera (*Promise.race*) de **3.5 segundos**, garantizando que si el proveedor de correos demora o está en reposo, el usuario no quede bloqueado en un estado de carga indefinido.

4. **Validación Obligatoria de Mayoría de Edad (+18 Gate):**
   - Se ejecuta una verificación dual (en cliente y en backend): cualquier intento de registro con edad inferior a 18 años o sin el consentimiento afirmativo es rechazado inmediatamente con código HTTP 400.

5. **Copias de Seguridad (Backups) de PostgreSQL:**
   - En Render o Neon, la base de datos cuenta con respaldos automáticos diarios gestionados.
   - Para realizar un volcado manual de seguridad:
     ```bash
     pg_dump "TU_DATABASE_URL" > backup_texxxnopor_$(date +%F).sql
     ```
