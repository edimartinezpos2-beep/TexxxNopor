# 📚 Centro de Documentación y Manuales Oficiales — TexxxNopor

Bienvenido al repositorio central de documentación técnica, funcional, operativa y de despliegue de **TexxxNopor Streaming Platform**.

---

## 🧭 Índice General de Manuales

Esta suite de documentación contiene todos los diagramas, especificaciones técnicas, manuales de usuario y guías de operaciones necesarias para la administración y evolución del ecosistema:

```
docs/
├── README.md                              # Portal central e índice general
├── 01_MANUAL_TECNICO_Y_ARQUITECTURA.md    # Arquitectura, Diagramas, Base de Datos, APIs y Modelos
├── 02_MANUAL_FUNCIONAL_Y_USUARIO.md       # Roles RBAC, Pantallas, Flujos y Manual de Usuario
├── 03_MANUAL_PASARELA_PAGOS_WOMPI.md      # Pasarela Wompi Bancolombia, PSE, Nequi, Webhooks y Planes COP
├── 04_MANUAL_DESPLIEGUE_HOSTING_Y_APK.md  # Compilación APK (EAS), Despliegue Web, Render, Dominio y Force Update
└── 05_GUIA_VARIABLES_ENTORNO_Y_SEGURIDAD.md # Variables de entorno (.env), Credenciales, Bunny.net y Seguridad
```

---

## 📑 Resumen Rápido por Documento

### 1. [Manual Técnico y Arquitectura del Sistema](./01_MANUAL_TECNICO_Y_ARQUITECTURA.md)
- **Audiencia:** Desarrolladores, Arquitectos de Software y Administradores de Infraestructura.
- **Contenido:**
  - Arquitectura de microservicios híbrida (Frontend Universal + Backend API + PostgreSQL + Cloudinary + Bunny.net CDN).
  - Diagramas de componentes, flujo de ingesta/streaming HLS y ciclo de vida de peticiones.
  - Modelo Entidad-Relación (ERD) completo de base de datos con Prisma ORM.
  - Catálogo exhaustivo de endpoints REST (Auth, Videos, Actores, Playlists, Wompi, Versionamiento).
  - Protocolos de seguridad (JWT, RBAC, Cifrado SSL/TLS 256-bit, SHA-256).

### 2. [Manual Funcional y Guía de Usuario](./02_MANUAL_FUNCIONAL_Y_USUARIO.md)
- **Audiencia:** Usuarios finales, Creadores de Contenido, Moderadores y Administradores.
- **Contenido:**
  - Matriz de Roles y Permisos (`ADMIN`, `CREATOR`, `CONSUMER`).
  - Flujo de registro obligatorio para mayores de 18 años y asignación del primer usuario como Administrador.
  - Guía visual de pantallas: Feed 4K Ultra HD, Explorador por categorías, Perfiles de Actores, Estudio de Publicación y Panel Administrativo.
  - Manual de interacción: Likes, comentarios, listas de reproducción, historial y descargas.
  - Beneficios de la membresía VIP RED ($10.000 COP/mes).

### 3. [Manual de Pasarela de Pagos Wompi (Bancolombia)](./03_MANUAL_PASARELA_PAGOS_WOMPI.md)
- **Audiencia:** Administradores de Negocio, Finanzas y Desarrolladores de Pagos.
- **Contenido:**
  - Integración de Wompi oficial en Pesos Colombianos (COP).
  - Métodos soportados: **PSE** (todos los bancos de Colombia), **Nequi**, **Daviplata**, **Tarjetas Débito/Crédito** y **Efecty**.
  - Link de checkout directo: `https://checkout.wompi.co/l/VPOS_4BlRq7`.
  - Matriz de precios en COP ($10.000, $25.000, $45.000, $80.000 COP).
  - Configuración de Webhooks automáticos para activación inmediata de cuentas VIP.
  - Transición de Sandbox (Pruebas) a Producción.

### 4. [Manual de Despliegue, Hosting y Generación de APK](./04_MANUAL_DESPLIEGUE_HOSTING_Y_APK.md)
- **Audiencia:** Operaciones (DevOps), Administradores de Dominio y Publicadores de Apps.
- **Contenido:**
  - Generación de APK Android mediante Expo Application Services (`eas build`).
  - Compilación y Despliegue Web (`npx expo export -p web`) en **Render Static Site**, **Cloudflare Pages** o **Vercel**.
  - Mantenimiento del Backend en Render y sincronización de base de datos PostgreSQL.
  - Configuración de Dominio Personalizado (`texxxnopor.com` o `.co`) con SSL HTTPS automático.
  - Solución al modo reposo de Render con monitoreo 24/7 mediante **UptimeRobot**.
  - Sistema de Caducidad y Bloqueo de Versiones Anteriores (**Force Update Gate**).

### 5. [Guía de Variables de Entorno y Seguridad](./05_GUIA_VARIABLES_ENTORNO_Y_SEGURIDAD.md)
- **Audiencia:** Administradores de Sistemas y Encargados de Ciberseguridad.
- **Contenido:**
  - Diccionario completo de variables de entorno `.env` para Backend y Frontend.
  - Credenciales de Bunny.net (Storage & CDN), Cloudinary, Wompi y PostgreSQL.
  - Políticas de privacidad, protección de datos y restricción de contenido adulto (+18).
  - Buenas prácticas para respaldo de bases de datos y rotación de claves secretas.

---

## 🛠️ Ficha Técnica del Proyecto

| Parámetro | Especificación |
| :--- | :--- |
| **Nombre del Proyecto** | TexxxNopor Streaming Platform |
| **Versión Actual** | `v1.0.2` (Build 2) |
| **Moneda Oficial** | Pesos Colombianos (COP) — Plan Base: **$10.000 COP / mes** |
| **Frontend Móvil** | React Native + Expo (Android APK / iOS) |
| **Frontend Web** | React Native Web / Single Page Application (SPA) |
| **Backend API** | Node.js + Express + TypeScript |
| **Base de Datos** | PostgreSQL (Alojada en Render / Neon) con Prisma ORM |
| **Almacenamiento y CDN** | Bunny.net (Storage Zone + Pull Zone) & Cloudinary |
| **Pasarela de Pagos** | Wompi (Bancolombia) — Checkout Link & API Directa |
| **Hosting Backend** | Render Web Service (`https://texxxnopor-backend.onrender.com`) |

---

*Documentación generada y verificada para la versión de producción 2026.*
