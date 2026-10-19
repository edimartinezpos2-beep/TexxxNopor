# 🚀 Manual de Despliegue, Hosting, Dominio y Gestión de APK

**Plataforma de Streaming TexxxNopor**  
*Versión:* `1.0.3` | *Guía de Operaciones, DevOps y Distribución*

---

## 1. Generación de la Aplicación Android (APK) con EAS Build

Para compilar el instalable `.apk` para celulares Android utilizando los servidores en la nube de Expo Application Services (EAS):

### Paso 1: Requisitos Previos
Instalar el CLI de EAS e iniciar sesión con tu cuenta de Expo:
```bash
npm install -g eas-cli
eas login
```

### Paso 2: Ejecutar la Compilación del APK
Desde la carpeta unificada [mobile/](file:///c:/Users/Usuario/Desktop/TexxxNopor/mobile) ejecuta:
```bash
cd mobile
eas build --platform android --profile preview
```

### Paso 3: Obtención del Archivo APK
- EAS generará un enlace de descarga en la nube y un código QR.
- Al abrir el enlace, se descargará el archivo `TexxxNopor.apk` listo para su distribución.

---

## 2. Despliegue de la Plataforma Web Universal en Render

La plataforma web oficial ([https://texxxnopor-web.onrender.com/](https://texxxnopor-web.onrender.com/)) se compila directamente desde el proyecto unificado `mobile/` mediante **React Native Web**.

> [!IMPORTANT]
> **Eliminación de la carpeta legada `web/`:**  
> Anteriormente existía una carpeta `web/` con un proyecto en Vite desactualizado. Esa carpeta fue **eliminada** para evitar código duplicado. Todo el frontend web y móvil se administra exclusivamente desde `mobile/`.

### Configuración del "Static Site" en Render:
1. Inicia sesión en **[dashboard.render.com](https://dashboard.render.com)**.
2. Haz clic en el botón superior azul **"New +"** $\rightarrow$ selecciona **"Static Site"**.
3. Conecta tu repositorio de GitHub: `edimartinezpos2-beep/TexxxNopor`.
4. Configura los parámetros exactos:

| Parámetro | Valor Exacto |
| :--- | :--- |
| **Name** | `texxxnopor-web` |
| **Branch** | `main` |
| **Root Directory** | `mobile` |
| **Build Command** | `npm install && npx expo export -p web` |
| **Publish Directory** | `dist` |

5. En **Environment Variables**, agrega:
   - `NODE_VERSION` = `20`
   - `EXPO_PUBLIC_API_URL` = `https://texxxnopor-backend.onrender.com`
   - `EXPO_PUBLIC_WOMPI_URL` = `https://checkout.wompi.co/l/VPOS_4BlRq7`
6. Haz clic en **"Create Static Site"**. En 1 a 2 minutos tu web estará disponible en `https://texxxnopor-web.onrender.com/`.

---

## 3. Estrategia de Descarga de APK: ¿Render o Enlace en la Nube?

### ¿Debes eliminar la variable `APP_UPDATE_URL` en Render si guardas la APK en `uploads/`?
> [!WARNING]
> **NO elimines el enlace `APP_UPDATE_URL` de Render.**  
> En Render (planes gratuitos e instancias estándar), el almacenamiento en disco es **efímero** (*ephemeral storage*). Cada vez que el servidor se reinicia, se duerme o se hace un nuevo despliegue, **cualquier archivo subido manualmente a la carpeta `uploads/` se eliminará**.

### Solución Híbrida Inteligente Implementada en el Backend:
En [backend/src/app.ts](file:///c:/Users/Usuario/Desktop/TexxxNopor/backend/src/app.ts), los endpoints `/download` y `/api/app/download-apk` operan bajo una lógica de doble vía:

```mermaid
graph TD
    User["👤 Usuario solicita descarga (/download)"] --> Check{"¿Existe uploads/TexxxNopor.apk en el disco local?"}
    
    Check -->|Sí| ServeLocal["📥 Entrega directa del archivo local (res.download)"]
    Check -->|No (Tras reinicio de Render)| RedirectCloud["☁️ Redirección 302 automática al enlace APP_UPDATE_URL"]
    
    RedirectCloud --> CloudStorage["📦 Google Drive / GitHub Releases / S3 / Dropbox"]
```

**Recomendación de Producción:**
Sube tu archivo `TexxxNopor.apk` a un almacenamiento permanente en la nube (como *GitHub Releases, Google Drive con enlace directo, Dropbox o AWS S3*) y coloca ese enlace en la variable `APP_UPDATE_URL` de Render. De esta forma, el botón de descarga funcionará siempre las 24 horas del día.

---

## 4. Persistencia de Videos en Render: ¿Por qué desaparecen y cómo solucionarlo?

### El Problema del "Disco Efímero" (*Ephemeral Storage*)
En Render (especialmente en los planes estándar y gratuitos), cada vez que realizas una actualización (git push, redeploy o reinicio del servicio):
1. Render **destruye el contenedor anterior** y crea uno nuevo desde el código fuente.
2. Cualquier archivo guardado en el disco local (`/uploads/videos/` o `/uploads/images/`) **se borra por completo**.
3. La base de datos PostgreSQL sigue teniendo el registro del video con la URL antigua (`.../uploads/videos/...`), pero el archivo físico ya no existe en el disco.
4. **¿Por qué se reproducía un video que no tenía nada que ver?**
   El código tenía previamente un fallback que, al detectar que el archivo no existía en disco, intentaba cargar videos de muestra públicos como `oceans.mp4` (un video de peces del océano) o `BigBuckBunny.mp4` (un conejo animado). **Hemos eliminado completamente estos fallbacks del código**. Ahora el sistema muestra un mensaje de error limpio y preserva la URL original.

### La Solución Definitiva (Para que NUNCA vuelva a suceder)

Tienes **dos métodos 100% garantizados** para que los videos no se borren jamás en Render:

#### Método 1: Configurar Bunny.net en Render (Recomendada y ya programada)
El backend de TexxxNopor ya tiene programada la subida automática a **Bunny.net Storage & CDN**. Para activarla, solo debes entrar a tu panel de Render:
1. Ve a **[dashboard.render.com](https://dashboard.render.com)** $\rightarrow$ Servicio `texxxnopor-backend` $\rightarrow$ Pestaña **Environment**.
2. Agrega las siguientes 4 variables de entorno:
   ```env
   BUNNY_STORAGE_ZONE_NAME="texxxnopor"
   BUNNY_ACCESS_KEY="fbcd62d0-a06e-4816-944217d8df7a-4a63-4601"
   BUNNY_STORAGE_HOSTNAME="storage.bunnycdn.com"
   BUNNY_CDN_HOSTNAME="texxxnopor.b-cdn.net"
   ```
3. Guarda los cambios. A partir de ese momento, cada video que subas viajará a los servidores de Bunny.net. **Incluso si Render se actualiza o se reinicia mil veces, los videos en Bunny.net quedan intactos y con streaming 4K permanente.**

#### Método 2: Agregar un Disco Persistente en Render (*Render Persistent Disk*)
Si prefieres que los videos se guarden en el servidor de Render sin usar servicios externos:
1. En **[dashboard.render.com](https://dashboard.render.com)** $\rightarrow$ Servicio `texxxnopor-backend` $\rightarrow$ **Disks $\rightarrow$ Add Disk**.
2. Configura:
   - **Name:** `texxxnopor-uploads`
   - **Mount Path:** `/opt/render/project/src/backend/uploads`
   - **Size:** 10 GB o superior.
3. Guarda. Render mantendrá este disco intacto a través de todas las actualizaciones y reinicios.

---

## 5. Reglas de Visibilidad del Botón «Descargar» y Ventana de Actualización

Para ofrecer una experiencia de usuario limpia y sin elementos innecesarios, se definieron las siguientes reglas:

```mermaid
graph TD
    AppStart["🚀 Apertura de TexxxNopor"] --> PlatformCheck{"¿En qué plataforma está el usuario?"}
    
    PlatformCheck -->|Móvil Nativo (Android APK)| NativeRules["📱 Celular con APK Instalada"]
    PlatformCheck -->|Navegador Web (PC o Móvil)| WebRules["🌐 Navegando en texxxnopor-web.onrender.com"]
    
    NativeRules --> HideHeaderBtn["❌ Botón 'Descargar' oculto en la barra superior (Redundante)"]
    WebRules --> ShowHeaderBtn["✅ Botón 'Descargar' visible en el header superior"]
    
    NativeRules --> VersionCheck{"¿Versión instalada es inferior a APP_MIN_SUPPORTED_VERSION?"}
    VersionCheck -->|No (Al día)| AppNormal["✅ Usa la app normalmente"]
    VersionCheck -->|Sí (Caducada)| ForceGate["🛑 Se activa la ventana de actualización forzosa"]
    
    ForceGate --> Redirection["Botón 'Descargar en la Web Oficial' redirige a https://texxxnopor-web.onrender.com/"]
```

### A. Oculto en Celulares ([mobile/src/screens/HomeScreen.tsx](file:///c:/Users/Usuario/Desktop/TexxxNopor/mobile/src/screens/HomeScreen.tsx))
- El botón de descarga en el encabezado está envuelto bajo la condición:
  ```tsx
  {Platform.OS === 'web' && (
    <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadApk}>
      <Download size={18} color="#FFFFFF" />
      <Text style={styles.downloadButtonText}>Descargar</Text>
    </TouchableOpacity>
  )}
  ```
- Quienes ya utilizan la aplicación en su celular no ven el botón en la barra superior.

### B. Visible en la Web ([https://texxxnopor-web.onrender.com/](https://texxxnopor-web.onrender.com/))
- Cualquier visitante que ingrese desde el navegador de su computadora o celular verá el botón rojo «Descargar» en la esquina superior derecha, permitiéndole obtener el APK de inmediato.

### C. Ventana de Actualización Forzosa ([mobile/src/components/ForceUpdateGate.tsx](file:///c:/Users/Usuario/Desktop/TexxxNopor/mobile/src/components/ForceUpdateGate.tsx))
- Si el backend reporta que la versión del usuario es obsoleta (`isOutdated: true`), la aplicación bloquea la pantalla y muestra la ventana modal de actualización obligatoria.
- Al presionar el botón **"Descargar en la Web Oficial"**, la app abre directamente [https://texxxnopor-web.onrender.com/](https://texxxnopor-web.onrender.com/) para que el usuario baje la versión más reciente.

---

## 6. Configuración de Dominio Personalizado (ej. `texxxnopor.com`)

Para vincular tu propio dominio comprado en *GoDaddy, Namecheap, Hostinger o Porkbun*:

1. En tu panel de **Render** $\rightarrow$ `texxxnopor-web` $\rightarrow$ **Settings $\rightarrow$ Custom Domains**.
2. Agrega: `texxxnopor.com` y `www.texxxnopor.com`.
3. Configura los registros en el panel DNS de tu proveedor:
   - **Registro A:** Host `@` $\rightarrow$ IP proporcionada por Render (ej. `216.24.57.1`).
   - **Registro CNAME:** Host `www` $\rightarrow$ `texxxnopor-web.onrender.com`.
4. Render emitirá automáticamente el **Certificado SSL HTTPS gratis** y tu sitio responderá de forma segura.

---

## 7. Solución al Modo Reposo de Render (UptimeRobot 24/7 Gratis)

Para evitar que el backend gratuito de Render se suspenda tras 15 minutos de inactividad:

1. Ingresa a **[uptimerobot.com](https://uptimerobot.com)** y crea un monitor gratuito:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `TexxxNopor Backend 24/7`
   - **URL:** `https://texxxnopor-backend.onrender.com/api/auth/bootstrap-status`
   - **Intervalo:** Cada 5 minutos.
2. Esto mantendrá activo el servidor en memoria, logrando tiempos de respuesta de menos de 1 segundo para todos los usuarios.
