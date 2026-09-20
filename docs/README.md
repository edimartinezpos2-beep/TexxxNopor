# 📚 Centro de Documentación y Manuales Oficiales — TexxxNopor

Bienvenido al repositorio central de documentación técnica, funcional, operativa y de despliegue de **TexxxNopor Streaming Platform**.

---

## 🧭 Índice General de Manuales

Esta suite de documentación contiene todos los diagramas de arquitectura, especificaciones técnicas de APIs, manuales de usuario, pasarelas de pago y guías de operaciones para desarrolladores presentes y futuros:

```
docs/
├── README.md                              # Portal central, índice general y resumen de arquitectura
├── 01_MANUAL_TECNICO_Y_ARQUITECTURA.md    # Arquitectura Universal, Base de Datos, APIs, Shorts, Live y OTP Deck
├── 02_MANUAL_FUNCIONAL_Y_USUARIO.md       # Roles RBAC, Shorts Feed, Estudio Live 92/8, Baraja OTP y Guía de Pantallas
├── 03_MANUAL_PASARELA_PAGOS_WOMPI.md      # Pasarela Wompi Bancolombia, Planes VIP en COP y Recarga de Monedas Live
├── 04_MANUAL_DESPLIEGUE_HOSTING_Y_APK.md  # Frontend Universal, Despliegue Web, APK EAS, Force Update y Gestión de APK
└── 05_GUIA_VARIABLES_ENTORNO_Y_SEGURIDAD.md # Variables de entorno (.env), Render, Credenciales, Bunny.net y Seguridad
```

---

## 📑 Resumen Rápido por Documento

### 1. [Manual Técnico y Arquitectura del Sistema](./01_MANUAL_TECNICO_Y_ARQUITECTURA.md)
- **Audiencia:** Desarrolladores Fullstack, Arquitectos de Software y Administradores de Infraestructura.
- **Contenido Clave:**
  - **Frontend Universal Único (`mobile/`):** Una sola base de código en React Native Web y Expo que compila tanto el APK nativo de Android como la plataforma web de producción ([https://texxxnopor-web.onrender.com/](https://texxxnopor-web.onrender.com/)). Eliminación de carpetas duplicadas legadas (`web/`).
  - **Módulo de Shorts:** Sistema de feed vertical con gestos nativos (`PanResponder`), pausa táctil, animaciones de corazones y contadores dinámicos.
  - **Módulo de Streaming en Vivo (Live Studio):** Selección de cámara frontal y trasera vía `getUserMedia`, WebRTC / HLS y economía de regalos virtuales.
  - **Diseño OTP «Hand of Cards»:** Baraja de 4 naipes animados con física de resortes (`Animated.stagger`, elevación, pop táctil y onda de celebración) sincronizados con backend en 4 dígitos.
  - **Diagrama de Componentes y ERD Completo:** PostgreSQL con Prisma ORM, Bunny.net CDN (+18), Cloudinary y Wompi.
  - **Catálogo Exhaustivo de APIs REST:** Autenticación, Videos, Shorts, Transmisiones Live, Regalos, Billetera y Descargas.

### 2. [Manual Funcional y Guía de Usuario](./02_MANUAL_FUNCIONAL_Y_USUARIO.md)
- **Audiencia:** Usuarios finales, Creadores de Contenido, Modelos/Actores y Moderadores.
- **Contenido Clave:**
  - **Matriz de Roles RBAC:** Espectador (`CONSUMER`), Creador (`CREATOR`) y Administrador (`ADMIN`). Asignación automática de Administrador al primer registro (*Bootstrap Admin*).
  - **Experiencia de Shorts:** Navegación por deslizamiento vertical, pestaña única "Para ti", contadores limpios desde cero e interacciones fluidas.
  - **Estudio de Transmisión en Vivo:** Modo exclusivo "LIVE", intercambio entre cámara frontal y trasera, recepción de regalos y panel de ganancias.
  - **Economía de Regalos (92% / 8%):** 92% de las monedas van directo al actor/actriz como ingreso neto; 8% queda como comisión de plataforma.
  - **Recuperación de Contraseña:** Flujo visual paso a paso de la baraja de 4 cartas estilo TikTok, código de 4 dígitos y actualización segura de clave.
  - **Membresía VIP RED:** Beneficios en calidad 4K, descargas offline y planes desde $10.000 COP/mes.

### 3. [Manual de Pasarela de Pagos Wompi (Bancolombia)](./03_MANUAL_PASARELA_PAGOS_WOMPI.md)
- **Audiencia:** Administradores de Negocio, Finanzas y Desarrolladores de Pagos.
- **Contenido Clave:**
  - **Integración Oficial Wompi en Colombia:** PSE (todos los bancos), Nequi, Daviplata, Tarjetas Débito/Crédito y Efecty.
  - **Link Directo de Checkout:** `https://checkout.wompi.co/l/VPOS_4BlRq7`.
  - **Planes de Suscripción en COP:** $10.000 COP (1 mes), $25.000 COP (3 meses), $45.000 COP (6 meses), $80.000 COP (12 meses).
  - **Paquetes de Monedas para Transmisiones en Vivo:** Paquetes estructurados (70 a 7.000 monedas) para obsequiar a los actores durante los en vivos.
  - **Webhooks Asíncronos:** Firma criptográfica SHA-256 y activación instantánea de cuentas y saldos.

### 4. [Manual de Despliegue, Hosting y Generación de APK](./04_MANUAL_DESPLIEGUE_HOSTING_Y_APK.md)
- **Audiencia:** Operaciones (DevOps), Administradores de Dominio y Publicadores de Apps.
- **Contenido Clave:**
  - **Compilación de APK Android:** Uso de Expo Application Services (`eas build --platform android --profile preview`).
  - **Despliegue Web en Render:** Compilación universal (`npx expo export -p web`) hacia `texxxnopor-web.onrender.com`.
  - **Reglas del Botón «Descargar»:** Oculto en celulares que ya tienen la app instalada; visible en la barra superior en la versión web.
  - **Sistema de Actualización Forzosa (Force Update Gate):** Bloqueo de versiones obsoletas y redirección guiada a la web oficial.
  - **Estrategia Híbrida de Descarga de APK:** Explicación técnica de por qué **NO** se debe eliminar `APP_UPDATE_URL` en Render ante la naturaleza efímera del almacenamiento en la nube.
  - **Monitoreo 24/7:** Configuración de UptimeRobot para evitar que el backend entre en reposo.

### 5. [Guía de Variables de Entorno y Seguridad](./05_GUIA_VARIABLES_ENTORNO_Y_SEGURIDAD.md)
- **Audiencia:** Administradores de Sistemas y Encargados de Ciberseguridad.
- **Contenido Clave:**
  - **Diccionario Exhaustivo `.env`:** Variables de Render, Base de Datos, JWT, Bunny.net, Cloudinary, Wompi y Nodemailer.
  - **Resiliencia de Correo:** Configuración con timeout de 3.5 segundos para evitar pantallas de carga bloqueadas.
  - **Políticas de Seguridad:** Cifrado bcrypt (factor 10), tokens JWT con rol, validación estricta de mayoría de edad (+18) y rotación de secretos.

---

## 🛠️ Ficha Técnica Consolidada del Ecosistema

| Parámetro | Especificación Técnica | Ubicación en el Código |
| :--- | :--- | :--- |
| **Nombre del Proyecto** | TexxxNopor Streaming Platform | Raíz |
| **Versión de Producción**| `v1.0.3` (Build 3) | `mobile/app.json`, `package.json` |
| **Frontend Universal** | React Native + Expo + React Native Web | `mobile/` |
| **Backend API** | Node.js + Express + TypeScript | `backend/src/app.ts` |
| **Base de Datos** | PostgreSQL en la Nube con Prisma ORM | `backend/prisma/schema.prisma` |
| **CDN de Video Adulto** | Bunny.net (+18 Edge Storage & Streaming) | `backend/src/services/bunny.service.ts` |
| **Gestión Multimedia** | Cloudinary Media API | `backend/src/services/cloudinary.service.ts` |
| **Pasarela de Pagos** | Wompi Bancolombia (PSE, Nequi, Tarjetas) | `backend/src/services/wompi.service.ts` |
| **URL Web Oficial** | `https://texxxnopor-web.onrender.com/` | Render Static Site |
| **URL Backend API** | `https://texxxnopor-backend.onrender.com` | Render Web Service |
| **Moneda de Cobro** | Pesos Colombianos (COP) | Base: $10.000 COP / mes |
| **Economía Live** | 92% Actor / 8% TexxxNopor | `backend/src/app.ts` |

---

*Documento central actualizado para la versión oficial TexxxNopor 2026.*
