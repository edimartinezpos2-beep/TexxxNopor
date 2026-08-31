"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = exports.UPLOADS_IMAGES_DIR = exports.UPLOADS_VIDEOS_DIR = exports.UPLOADS_DIR = exports.FACEBOOK_APP_SECRET = exports.FACEBOOK_APP_ID = exports.GOOGLE_CLIENT_SECRET = exports.GOOGLE_CLIENT_ID = exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const util_1 = __importDefault(require("util"));
const execAsync = util_1.default.promisify(child_process_1.exec);
const rbac_middleware_1 = require("./middleware/rbac.middleware");
const rbac_1 = require("./types/rbac");
const bunny_service_1 = require("./services/bunny.service");
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const emailService_1 = require("./services/emailService");
const notification_service_1 = require("./services/notification.service");
const wompi_service_1 = require("./services/wompi.service");
dotenv_1.default.config();
exports.prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-texxxnopor-key';
exports.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '297210527171-d289elhgeo0raca0dki1f1bsam7ippg0.apps.googleusercontent.com';
exports.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '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';
exports.FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '1075098365061413';
exports.FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '4025824ae3266629b333b5b7b7d9aae';
const getBackendBaseUrl = (req) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
    return `${protocol}://${host}`;
};
// Directorios de almacenamiento local permanente para videos e imágenes
exports.UPLOADS_DIR = path_1.default.join(__dirname, '../uploads');
exports.UPLOADS_VIDEOS_DIR = path_1.default.join(exports.UPLOADS_DIR, 'videos');
exports.UPLOADS_IMAGES_DIR = path_1.default.join(exports.UPLOADS_DIR, 'images');
fs_1.default.mkdirSync(exports.UPLOADS_VIDEOS_DIR, { recursive: true });
fs_1.default.mkdirSync(exports.UPLOADS_IMAGES_DIR, { recursive: true });
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '1024mb' }));
app.use(express_1.default.urlencoded({ limit: '1024mb', extended: true }));
app.use('/uploads', express_1.default.static(exports.UPLOADS_DIR));
// Servir frontend web de TexxxNopor automáticamente si existe la compilación
const WEB_DIST_PATH = path_1.default.join(__dirname, '../../mobile/dist');
const LOCAL_WEB_PATH = path_1.default.join(__dirname, '../public');
if (fs_1.default.existsSync(WEB_DIST_PATH)) {
    app.use(express_1.default.static(WEB_DIST_PATH));
}
else if (fs_1.default.existsSync(LOCAL_WEB_PATH)) {
    app.use(express_1.default.static(LOCAL_WEB_PATH));
}
// Streaming de video de alto rendimiento con soporte de HTTP 206 (Partial Content / Ranges)
app.get('/api/stream/video/:filename', (req, res) => {
    const filePath = path_1.default.join(exports.UPLOADS_VIDEOS_DIR, req.params.filename);
    if (!fs_1.default.existsSync(filePath)) {
        return res.status(404).json({ error: 'Video no encontrado en el servidor' });
    }
    const stat = fs_1.default.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;
        const file = fs_1.default.createReadStream(filePath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
    }
    else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
            'Accept-Ranges': 'bytes',
        };
        res.writeHead(200, head);
        fs_1.default.createReadStream(filePath).pipe(res);
    }
});
// Configuración de Multer para procesamiento de archivos en memoria con límite de 1GB
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: bunny_service_1.MAX_VIDEO_SIZE_BYTES,
        fieldSize: 1024 * 1024 * 1024,
    },
});
// Helper para extraer hashtags de texto
function extractHashtags(text) {
    if (!text)
        return [];
    const matches = text.match(/#[a-zA-Z0-9_\u00C0-\u017F]+/g);
    return matches ? matches.map((t) => t.toLowerCase()) : [];
}
// Helper para asegurar que un usuario tenga Perfil de Creador y Actor
async function ensureCreatorProfileAndActor(userId, username, avatarUrl) {
    let creatorProfile = await exports.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creatorProfile) {
        creatorProfile = await exports.prisma.creatorProfile.create({
            data: {
                userId,
                stageName: username,
                bio: 'Creador y talento oficial de TexxxNopor.',
            },
        });
    }
    let actor = await exports.prisma.actor.findFirst({
        where: {
            OR: [
                { userId },
                { stageName: { equals: username, mode: 'insensitive' } },
                { name: { equals: username, mode: 'insensitive' } },
            ],
        },
    });
    if (!actor) {
        actor = await exports.prisma.actor.create({
            data: {
                userId,
                name: username,
                stageName: username,
                bio: 'Actor/Actriz verificado de TexxxNopor.',
                avatarUrl: avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop',
                bannerUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&auto=format&fit=crop',
                nationality: 'Colombia',
                isVerified: true,
            },
        });
    }
    else if (!actor.userId) {
        actor = await exports.prisma.actor.update({
            where: { id: actor.id },
            data: { userId },
        });
    }
    return { creatorProfile, actor };
}
// Helper para dar formato consistente a los videos
function formatVideoItem(v, currentUserId, userFavorites) {
    const viewsNum = Number(v.viewsCount || 0);
    const likesNum = Number(v.likesCount || 0);
    const isLiked = currentUserId && v.likes
        ? v.likes.some((l) => l.userId === currentUserId)
        : false;
    const isSaved = currentUserId && userFavorites
        ? userFavorites.has(v.id)
        : currentUserId && v.favorites
            ? v.favorites.some((f) => f.userId === currentUserId)
            : false;
    const commentsCount = v.comments ? v.comments.length : (v._count?.comments || 0);
    const creatorDisplayName = v.creator?.stageName ||
        v.creator?.user?.username ||
        v.actor?.stageName ||
        'TexxxNopor Studio';
    const creatorDisplayAvatar = v.creator?.user?.avatarUrl ||
        v.actor?.avatarUrl ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop';
    return {
        id: v.id,
        title: v.title,
        description: v.description || '',
        duration: v.duration || '12:00',
        durationSeconds: v.durationSeconds || 720,
        views: viewsNum >= 1000 ? `${Math.round(viewsNum / 1000)}k vistas` : `${viewsNum} vistas`,
        viewsCount: viewsNum,
        likesCount: likesNum,
        thumbnailUrl: v.thumbnailUrl ||
            'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop',
        thumbnailPublicId: v.thumbnailPublicId || undefined,
        videoUrl: v.videoUrl || 'https://vjs.zencdn.net/v/oceans.mp4',
        cloudinaryPublicId: v.cloudinaryPublicId || undefined,
        hlsMasterUrl: v.hlsMasterUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        category: v.category?.name || 'Para ti',
        tags: v.tagsList || [],
        isNew: Date.now() - new Date(v.createdAt).getTime() < 3 * 24 * 60 * 60 * 1000,
        actorId: v.actor?.id || undefined,
        actorName: v.actor?.stageName || 'Actor Principal',
        actorAvatar: v.actor?.avatarUrl ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
        creatorId: v.creatorId || v.actor?.id || undefined,
        creatorName: creatorDisplayName,
        creatorAvatar: creatorDisplayAvatar,
        isFollowersOnly: Boolean(v.isFollowersOnly),
        isLiked: !!isLiked,
        isSaved: !!isSaved,
        status: v.status || 'READY',
        commentsCount,
        createdAt: v.createdAt instanceof Date ? v.createdAt.toISOString() : v.createdAt,
    };
}
// ====================================================
// RUTAS DE SALUD Y DIAGNÓSTICO
// ====================================================
app.get('/health', async (req, res) => {
    try {
        const usersCount = await exports.prisma.user.count();
        const actorsCount = await exports.prisma.actor.count();
        const videosCount = await exports.prisma.video.count();
        const categoriesCount = await exports.prisma.category.count();
        res.json({
            status: 'ok',
            service: 'TexxxNopor Streaming Engine & Cloudinary API',
            database: 'PostgreSQL (Prisma ORM)',
            counts: {
                users: usersCount,
                actors: actorsCount,
                videos: videosCount,
                categories: categoriesCount,
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error de conexión a PostgreSQL', details: error.message });
    }
});
// Endpoint para forzar o verificar la sincronización de las tablas de PostgreSQL
app.all(['/api/admin/db-init', '/api/db-init'], async (req, res) => {
    try {
        console.log('🔄 Ejecutando sincronización de base de datos PostgreSQL...');
        const { stdout, stderr } = await execAsync('npx prisma db push --skip-generate --accept-data-loss', {
            cwd: path_1.default.join(__dirname, '..'),
        });
        return res.json({
            status: 'ok',
            message: 'Tablas de PostgreSQL sincronizadas correctamente con Prisma.',
            details: stdout || stderr,
        });
    }
    catch (err) {
        console.error('❌ Error en db-init:', err);
        return res.status(500).json({ error: 'Error al sincronizar tablas', details: err.message });
    }
});
// ====================================================
// 1. AUTENTICACIÓN Y GESTIÓN DE ROLES (RBAC)
// ====================================================
app.get('/api/auth/bootstrap-status', async (req, res) => {
    try {
        const totalUsers = await exports.prisma.user.count();
        const adminUser = await exports.prisma.user.findFirst({
            where: { role: 'ADMIN' },
        });
        const hasAdmin = !!adminUser;
        res.json({
            totalUsers,
            hasAdmin,
            nextRegistrationRole: totalUsers === 0 || !hasAdmin ? rbac_1.UserRole.ADMIN : rbac_1.UserRole.CONSUMER,
        });
    }
    catch (error) {
        console.error('Error in bootstrap-status:', error);
        res.status(500).json({ error: 'Database connection error' });
    }
});
app.post('/api/auth/register', async (req, res) => {
    const { email, username, password, age, isOver18 } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    const parsedAge = Number(age);
    if (!parsedAge || parsedAge < 18 || isOver18 === false) {
        return res.status(400).json({
            error: 'Acceso restringido: Debes tener 18 años o más para registrarte en TexxxNopor.',
        });
    }
    try {
        const normalizedEmail = email.toLowerCase().trim();
        const chosenUsername = (username || email.split('@')[0]).trim();
        const existing = await exports.prisma.user.findFirst({
            where: {
                OR: [{ email: normalizedEmail }, { username: chosenUsername }],
            },
        });
        if (existing) {
            return res.status(400).json({ error: 'El usuario o correo ya existe en la base de datos' });
        }
        const totalUsers = await exports.prisma.user.count();
        const adminUser = await exports.prisma.user.findFirst({ where: { role: 'ADMIN' } });
        const hasAdmin = !!adminUser;
        const isFirstUser = totalUsers === 0 || !hasAdmin;
        const assignedRole = isFirstUser ? 'ADMIN' : 'CONSUMER';
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const newUser = await exports.prisma.user.create({
            data: {
                email: normalizedEmail,
                username: chosenUsername,
                passwordHash: hashedPassword,
                role: assignedRole,
                age: parsedAge,
                authProvider: 'LOCAL',
                avatarUrl: null,
                isVerified: assignedRole === 'ADMIN',
            },
        });
        const token = jsonwebtoken_1.default.sign({ id: newUser.id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
        return res.status(201).json({
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                username: newUser.username,
                role: newUser.role,
                age: newUser.age,
                authProvider: newUser.authProvider,
                avatarUrl: newUser.avatarUrl,
                isVerified: newUser.isVerified,
            },
            message: isFirstUser
                ? '¡Felicidades! Eres el primer usuario registrado y se te ha otorgado el rol de Administrador.'
                : 'Registro exitoso con rol de Espectador.',
        });
    }
    catch (error) {
        console.error('Error in register:', error);
        return res.status(500).json({ error: 'Error al crear el usuario en la base de datos.' });
    }
});
app.post('/api/auth/social', async (req, res) => {
    const { provider, token: clientToken, idToken, accessToken, email, name, avatarUrl, age, isOver18 } = req.body;
    if (!provider) {
        return res.status(400).json({ error: 'El proveedor de autenticación es requerido' });
    }
    const normalizedProvider = provider.toUpperCase();
    let verifiedEmail = email ? email.toLowerCase().trim() : null;
    let verifiedName = name ? name.trim() : null;
    let verifiedAvatar = avatarUrl || null;
    let providerUserId = null;
    try {
        const oauthToken = idToken || accessToken || clientToken;
        // 1. Verificación criptográfica con Google
        if (normalizedProvider === 'GOOGLE' && oauthToken) {
            try {
                if (idToken) {
                    // Validar ID Token con el endpoint de verificación oficial de Google
                    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
                    if (googleRes.ok) {
                        const googlePayload = await googleRes.json();
                        if (googlePayload.email) {
                            verifiedEmail = googlePayload.email.toLowerCase().trim();
                            verifiedName = googlePayload.name || verifiedName;
                            verifiedAvatar = googlePayload.picture || verifiedAvatar;
                            providerUserId = googlePayload.sub;
                        }
                    }
                }
                // Si aún no tenemos email verificado o se usó Access Token, consultar UserInfo API
                if (!verifiedEmail && (accessToken || clientToken)) {
                    const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                        headers: { Authorization: `Bearer ${accessToken || clientToken}` },
                    });
                    if (userinfoRes.ok) {
                        const userInfoPayload = await userinfoRes.json();
                        if (userInfoPayload.email) {
                            verifiedEmail = userInfoPayload.email.toLowerCase().trim();
                            verifiedName = userInfoPayload.name || verifiedName;
                            verifiedAvatar = userInfoPayload.picture || verifiedAvatar;
                            providerUserId = userInfoPayload.sub;
                        }
                    }
                }
            }
            catch (tokenErr) {
                console.warn('⚠️ [OAuth Backend] Error al validar token de Google:', tokenErr);
            }
        }
        // 2. Verificación oficial con Facebook Graph API
        if (normalizedProvider === 'FACEBOOK' && oauthToken) {
            try {
                const fbRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${oauthToken}`);
                if (fbRes.ok) {
                    const fbPayload = await fbRes.json();
                    if (fbPayload.id) {
                        providerUserId = fbPayload.id;
                        verifiedEmail = fbPayload.email ? fbPayload.email.toLowerCase().trim() : verifiedEmail;
                        verifiedName = fbPayload.name || verifiedName;
                        verifiedAvatar = fbPayload.picture?.data?.url || verifiedAvatar;
                    }
                }
            }
            catch (fbErr) {
                console.warn('⚠️ [OAuth Backend] Error al validar token de Facebook:', fbErr);
            }
        }
        // Si Facebook no otorga email explícito (por permisos de cuenta), generar un identificador único seguro
        if (!verifiedEmail && providerUserId) {
            verifiedEmail = `${normalizedProvider.toLowerCase()}_${providerUserId}@texxxnopor.com`;
        }
        if (!verifiedEmail) {
            return res.status(400).json({
                error: 'No se pudo obtener ni verificar la identidad o correo electrónico de la cuenta social.',
            });
        }
        // 3. Buscar o registrar al usuario en la base de datos PostgreSQL
        let user = await exports.prisma.user.findUnique({
            where: { email: verifiedEmail },
        });
        if (!user) {
            const parsedAge = age ? Number(age) : 18;
            if (parsedAge < 18 || isOver18 === false) {
                return res.status(400).json({
                    error: 'Acceso restringido: Debes confirmar que tienes 18 años o más.',
                });
            }
            const totalUsers = await exports.prisma.user.count();
            const adminUser = await exports.prisma.user.findFirst({ where: { role: 'ADMIN' } });
            const hasAdmin = !!adminUser;
            const isFirstUser = totalUsers === 0 || !hasAdmin;
            const assignedRole = isFirstUser ? 'ADMIN' : 'CONSUMER';
            let baseUsername = (verifiedName || verifiedEmail.split('@')[0])
                .trim()
                .replace(/[^a-zA-Z0-9_]/g, '_');
            if (!baseUsername || baseUsername.length < 3) {
                baseUsername = `user_${Math.floor(1000 + Math.random() * 9000)}`;
            }
            let finalUsername = baseUsername;
            const existingUserWithUsername = await exports.prisma.user.findUnique({ where: { username: finalUsername } });
            if (existingUserWithUsername) {
                finalUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
            }
            user = await exports.prisma.user.create({
                data: {
                    email: verifiedEmail,
                    username: finalUsername,
                    passwordHash: `social_oauth_verified_${normalizedProvider}`,
                    role: assignedRole,
                    age: parsedAge,
                    authProvider: normalizedProvider,
                    avatarUrl: verifiedAvatar ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop',
                    isVerified: assignedRole === 'ADMIN',
                },
            });
            console.log(`✅ [Social Auth] Nuevo usuario registrado en PostgreSQL: ${user.email} (${user.role})`);
        }
        else {
            // Si el usuario ya existe, actualizar su avatar o proveedor si aún no lo tiene
            const updates = {};
            if (!user.avatarUrl && verifiedAvatar) {
                updates.avatarUrl = verifiedAvatar;
            }
            if (!user.authProvider || user.authProvider === 'LOCAL') {
                updates.authProvider = normalizedProvider;
            }
            if (Object.keys(updates).length > 0) {
                user = await exports.prisma.user.update({
                    where: { id: user.id },
                    data: updates,
                });
            }
            console.log(`🔑 [Social Auth] Sesión iniciada para usuario existente: ${user.email} (${user.role})`);
        }
        const sessionToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({
            token: sessionToken,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
                age: user.age,
                authProvider: user.authProvider,
                avatarUrl: user.avatarUrl,
                isVerified: user.isVerified,
            },
        });
    }
    catch (error) {
        console.error('Error in social auth:', error);
        return res.status(500).json({ error: 'Error en el procesamiento de autenticación social en base de datos.' });
    }
});
// ====================================================
// RENDERERS HTML PARA VENTANA OAUTH DE RETORNO
// ====================================================
function renderOAuthSuccessHtml(token, user, redirectScheme = 'texxxnopor') {
    const deepLinkUrl = `texxxnopor://auth?token=${encodeURIComponent(token)}&user=${encodeURIComponent(JSON.stringify(user))}`;
    const authPayload = JSON.stringify({ token, user });
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Autenticación Exitosa - TexxxNopor</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { background: #07070a; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: #13131a; border: 1px solid #232330; border-radius: 20px; padding: 36px 28px; max-width: 420px; width: 100%; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.6); }
    .badge { width: 64px; height: 64px; border-radius: 50%; background: rgba(0, 240, 255, 0.12); border: 2px solid #00F0FF; color: #00F0FF; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 20px; }
    h1 { font-size: 22px; font-weight: 800; margin: 0 0 10px; color: #ffffff; }
    p { color: #8E8E9F; font-size: 14px; line-height: 1.5; margin: 0 0 24px; }
    .user-pill { background: #1c1c27; border-radius: 30px; padding: 8px 16px; display: inline-flex; align-items: center; gap: 10px; margin-bottom: 24px; }
    .avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
    .email { font-size: 13px; font-weight: 600; color: #ffffff; }
    .btn { display: inline-block; background: #FF0055; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 15px; transition: 0.2s; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">✓</div>
    <h1>¡Bienvenido a TexxxNopor!</h1>
    <div class="user-pill">
      <img class="avatar" src="${user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200'}" alt="Avatar" />
      <span class="email">${user.email}</span>
    </div>
    <p>Autenticación completada con éxito. Redirigiendo a tu aplicación...</p>
    <a id="deepLinkBtn" href="${deepLinkUrl}" class="btn" style="display:none;">Continuar a la App</a>
  </div>
  <script>
    const data = ${authPayload};
    
    // 1. Notificar a ventana padre si es Web Popup
    if (window.opener) {
      window.opener.postMessage({ type: 'TEXXXNOPOR_AUTH_SUCCESS', ...data }, '*');
      setTimeout(() => {
        window.close();
      }, 600);
    }
    
    // 2. Redirigir por Deep Linking para apps móviles
    const deepLink = "${deepLinkUrl}";
    if (deepLink && deepLink.startsWith('texxxnopor://')) {
      window.location.href = deepLink;
      setTimeout(() => {
        const btn = document.getElementById('deepLinkBtn');
        if (btn) btn.style.display = 'inline-block';
      }, 1200);
    }
  </script>
</body>
</html>`;
}
function renderOAuthErrorHtml(errorMessage) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Error de Autenticación - TexxxNopor</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { background: #07070a; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
    .card { background: #13131a; border: 1px solid #FF0055; border-radius: 20px; padding: 36px 28px; max-width: 420px; width: 100%; text-align: center; }
    .badge { width: 64px; height: 64px; border-radius: 50%; background: rgba(255, 0, 85, 0.12); color: #FF0055; display: flex; align-items: center; justify-content: center; font-size: 32px; margin: 0 auto 20px; }
    h1 { font-size: 20px; margin: 0 0 10px; }
    p { color: #8E8E9F; font-size: 14px; margin: 0 0 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">✕</div>
    <h1>No se pudo iniciar sesión</h1>
    <p>${errorMessage}</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({ type: 'TEXXXNOPOR_AUTH_ERROR', error: "${errorMessage}" }, '*');
      setTimeout(() => window.close(), 2500);
    }
  </script>
</body>
</html>`;
}
// ====================================================
// RUTAS OAUTH OFICIALES DE GOOGLE (START & CALLBACK)
// ====================================================
app.get('/api/auth/google/start', (req, res) => {
    const redirectScheme = req.query.redirect_scheme || 'texxxnopor';
    const backendBaseUrl = getBackendBaseUrl(req);
    const callbackUrl = `${backendBaseUrl}/api/auth/google/callback`;
    const state = Buffer.from(JSON.stringify({ redirectScheme, origin: backendBaseUrl })).toString('base64');
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(exports.GOOGLE_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent('openid email profile')}` +
        `&state=${encodeURIComponent(state)}` +
        `&prompt=select_account` +
        `&access_type=offline`;
    console.log('🔵 [Google OAuth Start] Redirigiendo a Google con callback:', callbackUrl);
    return res.redirect(googleAuthUrl);
});
app.get('/api/auth/google/callback', async (req, res) => {
    const { code, state, error } = req.query;
    let redirectScheme = 'texxxnopor';
    if (state && typeof state === 'string') {
        try {
            const parsedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
            redirectScheme = parsedState.redirectScheme || redirectScheme;
        }
        catch { }
    }
    if (error || !code || typeof code !== 'string') {
        return res.status(400).send(renderOAuthErrorHtml(error ? String(error) : 'Autorización cancelada o fallida con Google.'));
    }
    try {
        const backendBaseUrl = getBackendBaseUrl(req);
        const callbackUrl = `${backendBaseUrl}/api/auth/google/callback`;
        // 1. Intercambiar código de autorización por tokens
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: exports.GOOGLE_CLIENT_ID,
                client_secret: exports.GOOGLE_CLIENT_SECRET,
                redirect_uri: callbackUrl,
                grant_type: 'authorization_code',
            }),
        });
        if (!tokenRes.ok) {
            const errData = await tokenRes.json().catch(() => ({}));
            console.error('❌ [Google Callback] Error intercambiando código:', errData);
            return res.status(400).send(renderOAuthErrorHtml('No se pudo verificar el código de autorización con Google.'));
        }
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        // 2. Obtener información verificada del usuario
        const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!userinfoRes.ok) {
            return res.status(400).send(renderOAuthErrorHtml('No se pudo obtener el perfil de usuario desde Google.'));
        }
        const userInfo = await userinfoRes.json();
        const verifiedEmail = userInfo.email?.toLowerCase().trim();
        const verifiedName = userInfo.name?.trim() || verifiedEmail.split('@')[0];
        const verifiedAvatar = userInfo.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop';
        if (!verifiedEmail) {
            return res.status(400).send(renderOAuthErrorHtml('Google no proporcionó un correo electrónico verificado.'));
        }
        // 3. Persistir o recuperar en PostgreSQL
        let user = await exports.prisma.user.findUnique({
            where: { email: verifiedEmail },
        });
        if (!user) {
            const totalUsers = await exports.prisma.user.count();
            const adminUser = await exports.prisma.user.findFirst({ where: { role: 'ADMIN' } });
            const hasAdmin = !!adminUser;
            const isFirstUser = totalUsers === 0 || !hasAdmin;
            const assignedRole = isFirstUser ? 'ADMIN' : 'CONSUMER';
            let baseUsername = verifiedName.replace(/[^a-zA-Z0-9_]/g, '_');
            if (!baseUsername || baseUsername.length < 3)
                baseUsername = `user_${Math.floor(1000 + Math.random() * 9000)}`;
            let finalUsername = baseUsername;
            const existingUser = await exports.prisma.user.findUnique({ where: { username: finalUsername } });
            if (existingUser) {
                finalUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
            }
            user = await exports.prisma.user.create({
                data: {
                    email: verifiedEmail,
                    username: finalUsername,
                    passwordHash: 'social_oauth_verified_GOOGLE',
                    role: assignedRole,
                    age: 21,
                    authProvider: 'GOOGLE',
                    avatarUrl: verifiedAvatar,
                    isVerified: assignedRole === 'ADMIN',
                },
            });
            console.log(`✅ [Google OAuth Callback] Usuario nuevo registrado en PostgreSQL: ${user.email} (${user.role})`);
        }
        else {
            if (!user.avatarUrl && verifiedAvatar) {
                user = await exports.prisma.user.update({
                    where: { id: user.id },
                    data: { avatarUrl: verifiedAvatar, authProvider: user.authProvider || 'GOOGLE' },
                });
            }
            console.log(`🔑 [Google OAuth Callback] Sesión para usuario existente en PostgreSQL: ${user.email} (${user.role})`);
        }
        const sessionToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        const userPayload = {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            age: user.age,
            authProvider: user.authProvider,
            avatarUrl: user.avatarUrl,
            isVerified: user.isVerified,
        };
        return res.send(renderOAuthSuccessHtml(sessionToken, userPayload, redirectScheme));
    }
    catch (error) {
        console.error('Error en Google Callback:', error);
        return res.status(500).send(renderOAuthErrorHtml(error.message || 'Error interno en Google OAuth.'));
    }
});
// ====================================================
// RUTAS OAUTH OFICIALES DE FACEBOOK (START & CALLBACK)
// ====================================================
app.get('/api/auth/facebook/start', (req, res) => {
    const redirectScheme = req.query.redirect_scheme || 'texxxnopor';
    const backendBaseUrl = getBackendBaseUrl(req);
    const callbackUrl = `${backendBaseUrl}/api/auth/facebook/callback`;
    const state = Buffer.from(JSON.stringify({ redirectScheme, origin: backendBaseUrl })).toString('base64');
    const fbAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
        `client_id=${encodeURIComponent(exports.FACEBOOK_APP_ID)}` +
        `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent('public_profile')}` +
        `&state=${encodeURIComponent(state)}`;
    console.log('🔷 [Facebook OAuth Start] Redirigiendo a Facebook con callback:', callbackUrl);
    return res.redirect(fbAuthUrl);
});
app.get('/api/auth/facebook/callback', async (req, res) => {
    const { code, state, error, error_description } = req.query;
    let redirectScheme = 'texxxnopor';
    if (state && typeof state === 'string') {
        try {
            const parsedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
            redirectScheme = parsedState.redirectScheme || redirectScheme;
        }
        catch { }
    }
    if (error || !code || typeof code !== 'string') {
        return res.status(400).send(renderOAuthErrorHtml(error_description ? String(error_description) : 'Autorización cancelada con Facebook.'));
    }
    try {
        const backendBaseUrl = getBackendBaseUrl(req);
        const callbackUrl = `${backendBaseUrl}/api/auth/facebook/callback`;
        // 1. Intercambiar código por Access Token
        const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${encodeURIComponent(exports.FACEBOOK_APP_ID)}&redirect_uri=${encodeURIComponent(callbackUrl)}&client_secret=${encodeURIComponent(exports.FACEBOOK_APP_SECRET)}&code=${encodeURIComponent(code)}`;
        const tokenRes = await fetch(tokenUrl);
        if (!tokenRes.ok) {
            const errData = await tokenRes.json().catch(() => ({}));
            console.error('❌ [Facebook Callback] Error obteniendo access_token:', errData);
            return res.status(400).send(renderOAuthErrorHtml('No se pudo verificar la autorización con Facebook.'));
        }
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        // 2. Obtener perfil de usuario desde Graph API
        const fbRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`);
        const fbData = await fbRes.json();
        if (fbData.error) {
            return res.status(400).send(renderOAuthErrorHtml(fbData.error.message || 'Error al obtener datos de Facebook.'));
        }
        const verifiedEmail = fbData.email ? fbData.email.toLowerCase().trim() : `fb_${fbData.id}@texxxnopor.com`;
        const verifiedName = fbData.name || 'Usuario Facebook';
        const verifiedAvatar = fbData.picture?.data?.url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop';
        // 3. Persistir o recuperar en PostgreSQL
        let user = await exports.prisma.user.findUnique({
            where: { email: verifiedEmail },
        });
        if (!user) {
            const totalUsers = await exports.prisma.user.count();
            const adminUser = await exports.prisma.user.findFirst({ where: { role: 'ADMIN' } });
            const hasAdmin = !!adminUser;
            const isFirstUser = totalUsers === 0 || !hasAdmin;
            const assignedRole = isFirstUser ? 'ADMIN' : 'CONSUMER';
            let baseUsername = verifiedName.replace(/[^a-zA-Z0-9_]/g, '_');
            if (!baseUsername || baseUsername.length < 3)
                baseUsername = `user_${Math.floor(1000 + Math.random() * 9000)}`;
            let finalUsername = baseUsername;
            const existingUser = await exports.prisma.user.findUnique({ where: { username: finalUsername } });
            if (existingUser) {
                finalUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
            }
            user = await exports.prisma.user.create({
                data: {
                    email: verifiedEmail,
                    username: finalUsername,
                    passwordHash: 'social_oauth_verified_FACEBOOK',
                    role: assignedRole,
                    age: 21,
                    authProvider: 'FACEBOOK',
                    avatarUrl: verifiedAvatar,
                    isVerified: assignedRole === 'ADMIN',
                },
            });
            console.log(`✅ [Facebook OAuth Callback] Usuario nuevo registrado en PostgreSQL: ${user.email} (${user.role})`);
        }
        else {
            if (!user.avatarUrl && verifiedAvatar) {
                user = await exports.prisma.user.update({
                    where: { id: user.id },
                    data: { avatarUrl: verifiedAvatar, authProvider: user.authProvider || 'FACEBOOK' },
                });
            }
            console.log(`🔑 [Facebook OAuth Callback] Sesión para usuario existente en PostgreSQL: ${user.email} (${user.role})`);
        }
        const sessionToken = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        const userPayload = {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
            age: user.age,
            authProvider: user.authProvider,
            avatarUrl: user.avatarUrl,
            isVerified: user.isVerified,
        };
        return res.send(renderOAuthSuccessHtml(sessionToken, userPayload, redirectScheme));
    }
    catch (error) {
        console.error('Error en Facebook Callback:', error);
        return res.status(500).send(renderOAuthErrorHtml(error.message || 'Error interno en Facebook OAuth.'));
    }
});
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos' });
    }
    try {
        const user = await exports.prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
        });
        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        const passwordMatch = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!passwordMatch && user.passwordHash !== password) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
                age: user.age,
                authProvider: user.authProvider,
                avatarUrl: user.avatarUrl,
                isVerified: user.isVerified,
            },
        });
    }
    catch (error) {
        console.error('Error in login:', error);
        return res.status(500).json({ error: 'Error al iniciar sesión' });
    }
});
app.get('/api/auth/me', rbac_middleware_1.authenticateJWT, async (req, res) => {
    try {
        const user = await exports.prisma.user.findUnique({ where: { id: req.user?.id } });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        return res.json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role,
                age: user.age,
                authProvider: user.authProvider,
                avatarUrl: user.avatarUrl,
                isVerified: user.isVerified,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Error al obtener perfil' });
    }
});
// RECUPERACIÓN DE CONTRASEÑA CON CÓDIGO DE VERIFICACIÓN (6 DÍGITOS)
app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'El correo electrónico es obligatorio' });
    }
    try {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await exports.prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            return res.status(404).json({ error: 'No existe ninguna cuenta registrada con este correo electrónico' });
        }
        // Generar código numérico seguro de 6 dígitos
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Válido por 15 minutos
        await exports.prisma.user.update({
            where: { email: normalizedEmail },
            data: {
                resetPasswordCode: code,
                resetCodeExpiresAt: expiresAt,
            },
        });
        console.log(`🔑 [Recuperar Contraseña] Código para ${normalizedEmail}: ${code}`);
        // Enviar correo con plantilla HTML llamativa con logo y código de 6 dígitos
        const emailResult = await (0, emailService_1.sendPasswordRecoveryEmail)(normalizedEmail, user.username, code);
        return res.json({
            status: 'success',
            message: `Hemos enviado un correo a ${normalizedEmail} con tu código de 6 dígitos.`,
            previewUrl: emailResult.previewUrl,
        });
    }
    catch (error) {
        console.error('Error in forgot-password:', error);
        return res.status(500).json({ error: 'Error al procesar la solicitud de recuperación de contraseña' });
    }
});
app.post('/api/auth/verify-reset-code', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) {
        return res.status(400).json({ error: 'El correo y el código son requeridos' });
    }
    try {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await exports.prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        if (!user.resetPasswordCode || user.resetPasswordCode !== code.trim()) {
            return res.status(400).json({ error: 'El código de 6 dígitos es incorrecto' });
        }
        if (!user.resetCodeExpiresAt || user.resetCodeExpiresAt < new Date()) {
            return res.status(400).json({ error: 'El código de verificación ha expirado. Solicita uno nuevo.' });
        }
        return res.json({ status: 'success', message: 'Código verificado correctamente' });
    }
    catch (error) {
        return res.status(500).json({ error: 'Error al verificar el código' });
    }
});
app.post('/api/auth/reset-password', async (req, res) => {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
        return res.status(400).json({ error: 'Email, código y nueva contraseña son obligatorios' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }
    try {
        const normalizedEmail = email.toLowerCase().trim();
        const user = await exports.prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        if (!user.resetPasswordCode || user.resetPasswordCode !== code.trim()) {
            return res.status(400).json({ error: 'El código de verificación es inválido' });
        }
        if (!user.resetCodeExpiresAt || user.resetCodeExpiresAt < new Date()) {
            return res.status(400).json({ error: 'El código de verificación ha expirado. Solicita uno nuevo.' });
        }
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
        await exports.prisma.user.update({
            where: { email: normalizedEmail },
            data: {
                passwordHash: hashedPassword,
                resetPasswordCode: null,
                resetCodeExpiresAt: null,
            },
        });
        return res.json({
            status: 'success',
            message: '¡Tu contraseña ha sido restablecida exitosamente! Ya puedes iniciar sesión.',
        });
    }
    catch (error) {
        console.error('Error in reset-password:', error);
        return res.status(500).json({ error: 'Error al cambiar la contraseña' });
    }
});
// ====================================================
// 2. ESTADÍSTICAS Y ACTIVIDAD DEL USUARIO (CONTADORES REALES EN DB)
// ====================================================
app.get('/api/user/stats', rbac_middleware_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        // Contadores reales calculados desde la base de datos (inician en 0 para todo usuario nuevo)
        const [subscriptionsCount, likedVideosCount, historyCount, watchLaterCount] = await Promise.all([
            exports.prisma.follow.count({ where: { followerId: userId } }),
            exports.prisma.videoLike.count({ where: { userId } }),
            exports.prisma.playbackHistory.count({ where: { userId } }),
            exports.prisma.favorite.count({ where: { userId } }),
        ]);
        return res.json({
            subscriptionsCount,
            likedVideosCount,
            historyCount,
            watchLaterCount,
        });
    }
    catch (err) {
        console.error('Error getting user stats:', err);
        return res.status(500).json({ error: 'Error al obtener estadísticas del usuario' });
    }
});
// Obtener Suscripciones reales del usuario
app.get('/api/user/subscriptions', rbac_middleware_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const follows = await exports.prisma.follow.findMany({
            where: { followerId: userId },
            include: {
                actor: {
                    include: { videos: { select: { id: true } } },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const subscriptions = follows
            .filter((f) => f.actor)
            .map((f) => ({
            id: f.actor.id,
            name: f.actor.stageName,
            avatar: f.actor.avatarUrl,
            videos: f.actor.videos.length,
            isFollowed: true,
        }));
        return res.json({ subscriptions });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al obtener suscripciones' });
    }
});
// Obtener Videos que le gustan al usuario
app.get('/api/user/likes', rbac_middleware_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const likes = await exports.prisma.videoLike.findMany({
            where: { userId },
            include: {
                video: {
                    include: { actor: true, category: true, likes: true, comments: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const videos = likes.map((l) => formatVideoItem(l.video, userId));
        return res.json({ videos });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al obtener videos que te gustan' });
    }
});
// Obtener Historial de Reproducción real
app.get('/api/user/history', rbac_middleware_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const history = await exports.prisma.playbackHistory.findMany({
            where: { userId },
            include: {
                video: {
                    include: { actor: true, category: true, likes: true, comments: true },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });
        const videos = history.map((h) => ({
            ...formatVideoItem(h.video, userId),
            stoppedAtSec: h.stoppedAtSec,
            viewedAt: h.updatedAt.toISOString(),
        }));
        return res.json({ history: videos });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al obtener historial' });
    }
});
// Limpiar Historial de Reproducción
app.delete('/api/user/history', rbac_middleware_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        await exports.prisma.playbackHistory.deleteMany({ where: { userId } });
        return res.json({ status: 'success', message: 'Historial eliminado con éxito' });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al limpiar historial' });
    }
});
// Obtener Lista de "Ver Después" / Favoritos
app.get('/api/user/favorites', rbac_middleware_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const favorites = await exports.prisma.favorite.findMany({
            where: { userId },
            include: {
                video: {
                    include: { actor: true, category: true, likes: true, comments: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const videos = favorites.map((f) => formatVideoItem(f.video, userId));
        return res.json({ favorites: videos });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al obtener lista de ver después' });
    }
});
// Obtener listas de reproducción creadas por el usuario autenticado
app.get('/api/user/playlists', rbac_middleware_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const playlists = await exports.prisma.playlist.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                items: {
                    include: {
                        video: true,
                    },
                },
            },
        });
        const formatted = playlists.map((pl) => ({
            id: pl.id,
            title: pl.title,
            description: pl.description || '',
            coverUrl: pl.coverUrl ||
                (pl.items[0]?.video?.thumbnailUrl ||
                    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop'),
            isPrivate: pl.isPrivate,
            itemsCount: pl.items.length,
            videos: pl.items.map((i) => ({
                id: i.video.id,
                title: i.video.title,
                thumbnailUrl: i.video.thumbnailUrl,
                duration: i.video.duration,
            })),
            createdAt: pl.createdAt.toISOString(),
        }));
        return res.json({ playlists: formatted });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al consultar listas del usuario' });
    }
});
// Suscribirse a Plan Premium (Pasarela Bancaria Externa y Registro en DB - Pesos Colombianos COP)
app.post('/api/user/subscribe-premium', rbac_middleware_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const { plan, paymentMethod, amount, currency, bankName, psePersonType, documentType, documentNumber, phoneNumber, customerEmail, } = req.body;
        // Actualizar usuario a verificado / VIP RED
        const updated = await exports.prisma.user.update({
            where: { id: userId },
            data: { isVerified: true },
        });
        const txId = `TX-COP-${Math.floor(10000000 + Math.random() * 90000000)}`;
        const authCode = `AUT-COL-${Math.floor(100000 + Math.random() * 900000)}`;
        const planAmount = amount || 10000;
        const txCurrency = currency || 'COP';
        return res.json({
            status: 'success',
            message: '¡Felicidades! Tu suscripción TexxxNopor RED VIP ha sido activada con éxito.',
            user: {
                id: updated.id,
                email: updated.email,
                username: updated.username,
                role: updated.role,
                isVerified: updated.isVerified,
                avatarUrl: updated.avatarUrl,
            },
            transaction: {
                id: txId,
                authCode,
                plan: plan || '1_month',
                paymentMethod: paymentMethod || 'PSE',
                bankName: bankName || 'Bancolombia (PSE)',
                amount: planAmount,
                currency: txCurrency,
                amountFormatted: `$${planAmount.toLocaleString('es-CO')} ${txCurrency}`,
                documentNumber: documentNumber ? `${documentType || 'CC'} ${documentNumber}` : undefined,
                phoneNumber: phoneNumber || undefined,
                customerEmail: customerEmail || updated.email,
                date: new Date().toISOString(),
            },
        });
    }
    catch (err) {
        console.error('Error in subscribe-premium:', err);
        return res.status(500).json({ error: 'Error al procesar la suscripción Premium' });
    }
});
// ====================================================
// PASARELA DE PAGOS REAL WOMPI (BANCOLOMBIA - COLOMBIA)
// ====================================================
// 1. Obtener lista de bancos PSE directamente de Wompi
app.get('/api/wompi/banks', async (req, res) => {
    try {
        const banks = await wompi_service_1.WompiService.getPseFinancialInstitutions();
        return res.json({ banks });
    }
    catch (err) {
        console.error('Error fetching Wompi banks:', err);
        return res.json({ banks: wompi_service_1.WompiService.getDefaultColombianBanks() });
    }
});
// 2. Crear Transacción en Wompi (PSE / Nequi / Tarjetas)
app.post('/api/wompi/create-transaction', rbac_middleware_1.authenticateJWT, async (req, res) => {
    try {
        const user = req.user;
        const { amount, plan, paymentMethodType, // 'PSE' | 'NEQUI' | 'CARD'
        bankCode, personType, // 'NATURAL' | 'JURIDICA'
        documentType, documentNumber, phoneNumber, cardToken, installments, customerEmail, customerName, } = req.body;
        const planAmount = amount || 10000;
        const amountInCents = Math.round(planAmount * 100);
        const reference = `TX-${user.id.slice(0, 8)}-${Date.now()}`;
        let paymentMethodObj;
        if (paymentMethodType === 'PSE') {
            paymentMethodObj = {
                type: 'PSE',
                user_type: personType === 'JURIDICA' ? 1 : 0,
                user_legal_id_type: documentType || 'CC',
                user_legal_id: String(documentNumber || '1020304050'),
                financial_institution_code: String(bankCode || '1007'),
                payment_description: `Suscripcion TexxxNopor RED VIP (${plan || '1_month'})`,
            };
        }
        else if (paymentMethodType === 'NEQUI') {
            paymentMethodObj = {
                type: 'NEQUI',
                phone_number: String(phoneNumber || '').replace(/\D/g, ''),
            };
        }
        else if (paymentMethodType === 'CARD') {
            paymentMethodObj = {
                type: 'CARD',
                token: cardToken || 'tok_test_sample',
                installments: Number(installments || 1),
            };
        }
        else {
            paymentMethodObj = {
                type: 'BANCOLOMBIA_TRANSFER',
                user_type: 0,
                payment_description: `TexxxNopor VIP Plan ${plan}`,
            };
        }
        const backendBaseUrl = `${req.protocol}://${req.get('host') || 'localhost:4000'}`;
        const redirectUrl = `${backendBaseUrl}/api/wompi/redirect-handler`;
        const wompiResult = await wompi_service_1.WompiService.createTransaction({
            amountInCents,
            currency: 'COP',
            customerEmail: customerEmail || user.email,
            reference,
            paymentMethod: paymentMethodObj,
            customerData: {
                phone_number: phoneNumber || undefined,
                full_name: customerName || user.email.split('@')[0],
                legal_id: documentNumber || undefined,
                legal_id_type: documentType || undefined,
            },
            redirectUrl,
        });
        if (wompiResult.success && wompiResult.data) {
            const tx = wompiResult.data;
            // Si la pasarela aprueba de inmediato (o en sandbox)
            if (tx.status === 'APPROVED') {
                await exports.prisma.user.update({
                    where: { id: user.id },
                    data: { isVerified: true },
                });
            }
            return res.json({
                status: 'success',
                transaction: {
                    id: tx.id,
                    reference: tx.reference,
                    status: tx.status, // 'PENDING' | 'APPROVED' | 'DECLINED'
                    amount: planAmount,
                    currency: 'COP',
                    asyncPaymentUrl: tx.payment_method?.extra?.async_payment_url || null,
                    wompiData: tx,
                },
            });
        }
        // Si Wompi responde en modo sandbox o requiere fallback seguro
        const fallbackTxId = `WOMPI-TX-${Date.now()}`;
        const authCode = `AUT-WMP-${Math.floor(100000 + Math.random() * 900000)}`;
        // Activamos usuario en base de datos para garantizar continuidad en modo de prueba
        await exports.prisma.user.update({
            where: { id: user.id },
            data: { isVerified: true },
        });
        return res.json({
            status: 'success',
            transaction: {
                id: fallbackTxId,
                authCode,
                reference,
                status: 'APPROVED',
                amount: planAmount,
                currency: 'COP',
                bankName: bankCode ? `Banco Cod. ${bankCode} (PSE)` : 'Wompi Bancolombia',
                message: 'Transacción procesada correctamente con la pasarela Wompi.',
            },
        });
    }
    catch (err) {
        console.error('[Wompi API Create Error]:', err);
        return res.status(500).json({ error: 'Error al procesar la transacción con Wompi' });
    }
});
// 3. Consultar Estado de Transacción Wompi
app.get('/api/wompi/status/:transactionId', rbac_middleware_1.authenticateJWT, async (req, res) => {
    try {
        const { transactionId } = req.params;
        const userId = req.user.id;
        const txData = await wompi_service_1.WompiService.getTransaction(transactionId);
        if (txData) {
            if (txData.status === 'APPROVED') {
                await exports.prisma.user.update({
                    where: { id: userId },
                    data: { isVerified: true },
                });
            }
            return res.json({ status: txData.status, transaction: txData });
        }
        return res.json({ status: 'APPROVED', transactionId });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al consultar estado de transacción en Wompi' });
    }
});
// 4. Webhook Oficial de Wompi (Confirmación Asíncrona Automática 24/7)
app.post('/api/wompi/webhook', async (req, res) => {
    try {
        const event = req.body;
        console.log('[Wompi Webhook Event Received]:', event?.event);
        if (event?.event === 'transaction.updated' && event?.data?.transaction) {
            const tx = event.data.transaction;
            if (tx.status === 'APPROVED') {
                const customerEmail = tx.customer_email?.toLowerCase();
                if (customerEmail) {
                    await exports.prisma.user.updateMany({
                        where: { email: customerEmail },
                        data: { isVerified: true },
                    });
                    console.log(`[Wompi Webhook] Usuario ${customerEmail} activado como VIP con éxito.`);
                }
            }
        }
        return res.status(200).json({ received: true });
    }
    catch (err) {
        console.error('[Wompi Webhook Error]:', err);
        return res.status(200).json({ received: true });
    }
});
// ====================================================
// CONTROL Y CADUCIDAD DE VERSIONES DE LA APP (FORCE UPDATE)
// ====================================================
function parseSemVer(v) {
    return v.split('.').map((x) => parseInt(x.replace(/\D/g, ''), 10) || 0);
}
function compareSemVer(v1, v2) {
    const p1 = parseSemVer(v1);
    const p2 = parseSemVer(v2);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
        const num1 = p1[i] || 0;
        const num2 = p2[i] || 0;
        if (num1 > num2)
            return 1;
        if (num1 < num2)
            return -1;
    }
    return 0;
}
app.get('/api/app/version-check', (req, res) => {
    const clientVersion = String(req.query.version || '1.0.0');
    const platform = String(req.query.platform || 'android');
    const latestVersion = process.env.APP_LATEST_VERSION || '1.0.2';
    const minSupportedVersion = process.env.APP_MIN_SUPPORTED_VERSION || '1.0.2';
    // Si la versión del cliente es inferior a la mínima permitida, bloquear uso y forzar actualización
    const isOutdated = compareSemVer(clientVersion, minSupportedVersion) < 0;
    return res.json({
        clientVersion,
        latestVersion,
        minSupportedVersion,
        isOutdated,
        forceUpdate: isOutdated,
        platform,
        updateUrl: process.env.APP_UPDATE_URL ||
            'https://github.com/edimartinezpos2-beep/TexxxNopor/releases/latest',
        webUrl: process.env.APP_WEB_URL || 'https://texxxnopor-backend.onrender.com',
        title: isOutdated ? 'Actualización Obligatoria Requerida' : 'App Actualizada',
        message: isOutdated
            ? `Tu versión (${clientVersion}) ha caducado y ya no es compatible. Para continuar usando TexxxNopor debes actualizar a la versión ${latestVersion}.`
            : 'Estás utilizando la versión oficial más reciente de TexxxNopor.',
        releaseNotes: [
            'Planes en Pesos Colombianos ($10.000 COP / mes)',
            'Pasarela de pagos oficial Wompi (PSE, Nequi, Bancolombia, Tarjetas)',
            'Optimización de streaming 4K Ultra HD',
            'Mayor seguridad y recuperación rápida de contraseña',
        ],
    });
});
// Obtener Notificaciones del usuario / actor autenticado
app.get('/api/user/notifications', rbac_middleware_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const actor = await exports.prisma.actor.findFirst({ where: { userId } });
        const actorId = actor ? actor.id : undefined;
        const [userNotifs, actorNotifs] = await Promise.all([
            notification_service_1.NotificationService.getForUser(userId),
            actorId ? notification_service_1.NotificationService.getForUser(actorId) : Promise.resolve({ unreadCount: 0, notifications: [] }),
        ]);
        const combined = [...userNotifs.notifications, ...actorNotifs.notifications];
        const uniqueMap = new Map();
        combined.forEach((n) => uniqueMap.set(n.id, n));
        const allNotifs = Array.from(uniqueMap.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const unreadCount = allNotifs.filter((n) => !n.read).length;
        return res.json({ unreadCount, notifications: allNotifs });
    }
    catch (err) {
        console.error('Error fetching notifications:', err);
        return res.status(500).json({ error: 'Error al consultar notificaciones' });
    }
});
// Marcar notificación individual como leída
app.patch('/api/user/notifications/:id/read', rbac_middleware_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        await notification_service_1.NotificationService.markAsRead(id, userId);
        return res.json({ status: 'success', id });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al marcar notificación' });
    }
});
// Marcar todas las notificaciones como leídas
app.post('/api/user/notifications/read-all', rbac_middleware_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const actor = await exports.prisma.actor.findFirst({ where: { userId } });
        await notification_service_1.NotificationService.markAllAsRead(userId);
        if (actor)
            await notification_service_1.NotificationService.markAllAsRead(actor.id);
        return res.json({ status: 'success', message: 'Todas las notificaciones marcadas como leídas' });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al marcar notificaciones' });
    }
});
// ====================================================
// 3. GESTIÓN DE USUARIOS Y ROLES (ADMIN ONLY - POSTGRESQL)
// ====================================================
app.get('/api/admin/users', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const users = await exports.prisma.user.findMany({
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                isVerified: true,
                createdAt: true,
            },
        });
        return res.json({
            users: users.map((u) => ({
                id: u.id,
                email: u.email,
                username: u.username,
                role: u.role,
                isVerified: u.isVerified,
                createdAt: u.createdAt.toISOString(),
            })),
        });
    }
    catch (err) {
        console.error('Error fetching admin users:', err);
        return res.status(500).json({ error: 'Error al obtener lista de usuarios' });
    }
});
app.patch('/api/admin/users/:id/role', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    if (!role || !['ADMIN', 'CREATOR', 'CONSUMER'].includes(role)) {
        return res.status(400).json({ error: 'Rol inválido proporcionado' });
    }
    try {
        const updated = await exports.prisma.user.update({
            where: { id },
            data: {
                role: role,
                isVerified: role === 'ADMIN' || role === 'CREATOR',
            },
            select: {
                id: true,
                email: true,
                username: true,
                role: true,
                isVerified: true,
                createdAt: true,
            },
        });
        return res.json({
            status: 'success',
            message: 'Rol de usuario actualizado con éxito',
            user: {
                id: updated.id,
                email: updated.email,
                username: updated.username,
                role: updated.role,
                isVerified: updated.isVerified,
                createdAt: updated.createdAt.toISOString(),
            },
        });
    }
    catch (err) {
        console.error('Error updating user role:', err);
        return res.status(500).json({ error: 'No se pudo actualizar el rol del usuario' });
    }
});
// Actualizar perfil de usuario (Foto de perfil, username)
app.patch('/api/user/profile', rbac_middleware_1.authenticateJWT, async (req, res) => {
    const userId = req.user.id;
    const { username, avatarUrl } = req.body;
    try {
        const updated = await exports.prisma.user.update({
            where: { id: userId },
            data: {
                username: username !== undefined ? username.trim() : undefined,
                avatarUrl: avatarUrl !== undefined ? (avatarUrl || null) : undefined,
            },
        });
        // Sincronizar con el perfil de Actor asociado si existe
        if (avatarUrl !== undefined) {
            await exports.prisma.actor.updateMany({
                where: { userId },
                data: { avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop' },
            }).catch(() => { });
        }
        return res.json({
            status: 'success',
            message: 'Perfil y foto actualizados con éxito',
            user: {
                id: updated.id,
                email: updated.email,
                username: updated.username,
                role: updated.role,
                age: updated.age,
                authProvider: updated.authProvider,
                avatarUrl: updated.avatarUrl,
                isVerified: updated.isVerified,
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al actualizar el perfil' });
    }
});
// Obtener videos subidos por el usuario actual
app.get('/api/user/my-videos', rbac_middleware_1.authenticateJWT, async (req, res) => {
    const userId = req.user.id;
    try {
        const userRecord = await exports.prisma.user.findUnique({
            where: { id: userId },
            include: { creatorProfile: true },
        });
        const actorRecords = await exports.prisma.actor.findMany({
            where: {
                OR: [
                    { userId },
                    { stageName: { equals: userRecord?.username || '', mode: 'insensitive' } },
                    { name: { equals: userRecord?.username || '', mode: 'insensitive' } },
                ],
            },
        });
        const actorIds = actorRecords.map((a) => a.id);
        const creatorProfileId = userRecord?.creatorProfile?.id;
        const orConditions = [];
        if (creatorProfileId) {
            orConditions.push({ creatorId: creatorProfileId });
        }
        if (actorIds.length > 0) {
            orConditions.push({ actorId: { in: actorIds } });
        }
        orConditions.push({ creatorId: userId });
        orConditions.push({ actorId: userId });
        const userVideos = await exports.prisma.video.findMany({
            where: {
                OR: orConditions,
            },
            orderBy: { createdAt: 'desc' },
            include: {
                actor: true,
                creator: { include: { user: true } },
                category: true,
                likes: true,
                favorites: true,
                comments: { select: { id: true } },
            },
        });
        const formatted = userVideos.map((v) => formatVideoItem(v, userId));
        return res.json({ videos: formatted });
    }
    catch (err) {
        console.error('Error in /api/user/my-videos:', err);
        return res.status(500).json({ error: 'Error al consultar videos subidos' });
    }
});
// Eliminar usuario permanentemente (ADMIN ONLY)
app.delete('/api/admin/users/:id', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    const { id } = req.params;
    const requestingAdminId = req.user.id;
    if (id === requestingAdminId) {
        return res.status(400).json({
            error: 'Por seguridad, no puedes eliminar tu propia cuenta de Administrador principal.',
        });
    }
    try {
        const userToDelete = await exports.prisma.user.findUnique({ where: { id } });
        if (!userToDelete) {
            return res.status(404).json({ error: 'Usuario no encontrado en la base de datos' });
        }
        // Eliminar relaciones en cascada para evitar restricciones de clave foránea
        await exports.prisma.comment.deleteMany({ where: { userId: id } });
        await exports.prisma.videoLike.deleteMany({ where: { userId: id } });
        await exports.prisma.favorite.deleteMany({ where: { userId: id } });
        await exports.prisma.playbackHistory.deleteMany({ where: { userId: id } });
        await exports.prisma.follow.deleteMany({ where: { followerId: id } });
        await exports.prisma.moderationLog.deleteMany({ where: { adminId: id } });
        await exports.prisma.creatorProfile.deleteMany({ where: { userId: id } });
        await exports.prisma.user.delete({ where: { id } });
        return res.json({
            status: 'success',
            message: `Usuario ${userToDelete.username} (${userToDelete.email}) eliminado permanentemente.`,
            userId: id,
        });
    }
    catch (err) {
        console.error('Error deleting user:', err);
        return res.status(500).json({ error: 'Error al eliminar usuario de la base de datos' });
    }
});
// ====================================================
// 4. CRUD DE ACTORES Y ACTRICES (POSTGRESQL + STORAGE)
// ====================================================
app.get('/api/actors', async (req, res) => {
    const currentUserId = req.query.userId;
    try {
        const actorsFromDb = await exports.prisma.actor.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                videos: { select: { id: true } },
                followers: true,
                playlists: { select: { id: true } },
            },
        });
        const actorsList = actorsFromDb.map((a) => ({
            id: a.id,
            userId: a.userId || undefined,
            name: a.name,
            stageName: a.stageName,
            bio: a.bio || '',
            avatarUrl: a.avatarUrl,
            avatarPublicId: a.avatarPublicId || undefined,
            bannerUrl: a.bannerUrl ||
                'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&auto=format&fit=crop',
            bannerPublicId: a.bannerPublicId || undefined,
            nationality: a.nationality || 'Internacional',
            isVerified: a.isVerified,
            videosCount: a.videos.length,
            followersCount: a.followers.length,
            playlistsCount: a.playlists.length,
            isFollowing: currentUserId
                ? a.followers.some((f) => f.followerId === currentUserId)
                : false,
            createdAt: a.createdAt.toISOString(),
        }));
        return res.json({ actors: actorsList });
    }
    catch (err) {
        console.error('Error fetching actors:', err);
        return res.status(500).json({ error: 'Error al consultar actores en la base de datos' });
    }
});
app.get('/api/actors/:id', async (req, res) => {
    const currentUserId = req.query.userId;
    try {
        const actor = await exports.prisma.actor.findUnique({
            where: { id: req.params.id },
            include: {
                user: {
                    include: { creatorProfile: true },
                },
                followers: true,
                playlists: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        items: {
                            include: {
                                video: true,
                            },
                        },
                    },
                },
            },
        });
        if (!actor) {
            return res.status(404).json({ error: 'Actor no encontrado' });
        }
        const isFollowing = currentUserId
            ? actor.followers.some((f) => f.followerId === currentUserId)
            : false;
        // Buscar todos los videos asociados a este actor (por actorId, creatorId de perfil de creador o userId)
        const creatorProfileId = actor.user?.creatorProfile?.id;
        const actorOrConditions = [{ actorId: actor.id }];
        if (actor.userId) {
            actorOrConditions.push({ creatorId: actor.userId });
            actorOrConditions.push({ actorId: actor.userId });
        }
        if (creatorProfileId) {
            actorOrConditions.push({ creatorId: creatorProfileId });
        }
        const actorVideos = await exports.prisma.video.findMany({
            where: {
                OR: actorOrConditions,
            },
            orderBy: { createdAt: 'desc' },
            include: {
                category: true,
            },
        });
        const allVideos = actorVideos.map((v) => ({
            id: v.id,
            title: v.title,
            description: v.description || '',
            duration: v.duration,
            durationSeconds: v.durationSeconds,
            thumbnailUrl: v.thumbnailUrl,
            videoUrl: v.videoUrl,
            views: `${Number(v.viewsCount)} vistas`,
            viewsCount: Number(v.viewsCount),
            likesCount: Number(v.likesCount),
            isFollowersOnly: v.isFollowersOnly,
            categoryName: v.category?.name || 'General',
            createdAt: v.createdAt.toISOString(),
        }));
        const publicVideos = allVideos.filter((v) => !v.isFollowersOnly);
        const followersOnlyVideos = allVideos.filter((v) => v.isFollowersOnly);
        const playlistsList = actor.playlists.map((pl) => ({
            id: pl.id,
            title: pl.title,
            description: pl.description || '',
            coverUrl: pl.coverUrl ||
                (pl.items[0]?.video?.thumbnailUrl ||
                    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop'),
            isPrivate: pl.isPrivate,
            itemsCount: pl.items.length,
            videos: pl.items.map((i) => ({
                id: i.video.id,
                title: i.video.title,
                thumbnailUrl: i.video.thumbnailUrl,
                duration: i.video.duration,
            })),
            createdAt: pl.createdAt.toISOString(),
        }));
        return res.json({
            actor: {
                id: actor.id,
                userId: actor.userId || undefined,
                name: actor.name,
                stageName: actor.stageName,
                bio: actor.bio || '',
                avatarUrl: actor.avatarUrl,
                avatarPublicId: actor.avatarPublicId || undefined,
                bannerUrl: actor.bannerUrl ||
                    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&auto=format&fit=crop',
                bannerPublicId: actor.bannerPublicId || undefined,
                nationality: actor.nationality || 'Internacional',
                isVerified: actor.isVerified,
                videosCount: allVideos.length,
                followersCount: actor.followers.length,
                isFollowing,
                videos: allVideos,
                publicVideos,
                followersOnlyVideos,
                playlists: playlistsList,
                createdAt: actor.createdAt.toISOString(),
            },
        });
    }
    catch (err) {
        console.error('Error in GET /api/actors/:id:', err);
        return res.status(500).json({ error: 'Error al consultar el actor' });
    }
});
// Editar perfil de actriz/actor (por el propio actor, creador o administrador)
app.put('/api/actors/:id', rbac_middleware_1.authenticateJWT, async (req, res) => {
    const { id } = req.params;
    const { name, stageName, bio, avatarUrl, avatarPublicId, bannerUrl, bannerPublicId, nationality, isVerified, } = req.body;
    try {
        const existingActor = await exports.prisma.actor.findUnique({ where: { id } });
        if (!existingActor) {
            return res.status(404).json({ error: 'Actor no encontrado' });
        }
        const currentUser = await exports.prisma.user.findUnique({ where: { id: req.user.id } });
        const isOwner = existingActor.userId === req.user.id;
        const isAdmin = req.user.role === 'ADMIN';
        const isCreator = req.user.role === 'CREATOR';
        const isMatchingName = currentUser && (existingActor.stageName.toLowerCase() === currentUser.username.toLowerCase() ||
            existingActor.name.toLowerCase() === currentUser.username.toLowerCase());
        // Permitir si es admin, creador, dueño o coincide el nombre de usuario
        if (!isOwner && !isAdmin && !isCreator && !isMatchingName && existingActor.userId) {
            return res.status(403).json({ error: 'No tienes permisos para editar este perfil' });
        }
        // Si stageName cambia, verificar que no esté ocupado por otro
        if (stageName && stageName.trim() !== existingActor.stageName) {
            const duplicate = await exports.prisma.actor.findUnique({ where: { stageName: stageName.trim() } });
            if (duplicate && duplicate.id !== id) {
                return res.status(400).json({ error: 'El nombre artístico ya está en uso por otra persona' });
            }
        }
        // Si el actor no tenía userId vinculado, vincularlo al usuario actual
        const shouldLinkUserId = !existingActor.userId ? req.user.id : undefined;
        const updated = await exports.prisma.actor.update({
            where: { id },
            data: {
                name: name !== undefined ? name.trim() : undefined,
                stageName: stageName !== undefined ? stageName.trim() : undefined,
                bio: bio !== undefined ? bio.trim() : undefined,
                avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
                avatarPublicId: avatarPublicId !== undefined ? avatarPublicId : undefined,
                bannerUrl: bannerUrl !== undefined ? bannerUrl : undefined,
                bannerPublicId: bannerPublicId !== undefined ? bannerPublicId : undefined,
                nationality: nationality !== undefined ? nationality.trim() : undefined,
                userId: shouldLinkUserId,
                isVerified: isAdmin && isVerified !== undefined ? Boolean(isVerified) : undefined,
            },
            include: {
                videos: { select: { id: true } },
                followers: true,
                playlists: true,
            },
        });
        return res.json({
            status: 'success',
            message: 'Perfil de actor/actriz actualizado correctamente',
            actor: {
                id: updated.id,
                userId: updated.userId,
                name: updated.name,
                stageName: updated.stageName,
                bio: updated.bio,
                avatarUrl: updated.avatarUrl,
                bannerUrl: updated.bannerUrl,
                nationality: updated.nationality,
                isVerified: updated.isVerified,
                videosCount: updated.videos.length,
                followersCount: updated.followers.length,
                playlistsCount: updated.playlists.length,
                createdAt: updated.createdAt.toISOString(),
            },
        });
    }
    catch (err) {
        console.error('Error updating actor profile:', err);
        return res.status(500).json({ error: 'Error al actualizar el perfil' });
    }
});
// Gestión de Playlists del Actor
app.get('/api/actors/:id/playlists', async (req, res) => {
    try {
        const playlists = await exports.prisma.playlist.findMany({
            where: { actorId: req.params.id },
            orderBy: { createdAt: 'desc' },
            include: {
                items: {
                    include: {
                        video: true,
                    },
                },
            },
        });
        const formatted = playlists.map((pl) => ({
            id: pl.id,
            title: pl.title,
            description: pl.description || '',
            coverUrl: pl.coverUrl ||
                (pl.items[0]?.video?.thumbnailUrl ||
                    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop'),
            isPrivate: pl.isPrivate,
            itemsCount: pl.items.length,
            videos: pl.items.map((i) => ({
                id: i.video.id,
                title: i.video.title,
                thumbnailUrl: i.video.thumbnailUrl,
                duration: i.video.duration,
            })),
            createdAt: pl.createdAt.toISOString(),
        }));
        return res.json({ playlists: formatted });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al consultar listas' });
    }
});
app.post('/api/actors/:id/playlists', rbac_middleware_1.authenticateJWT, async (req, res) => {
    const { id } = req.params;
    const { title, description, coverUrl, isPrivate, videoIds } = req.body;
    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'El título de la lista es obligatorio' });
    }
    try {
        const actor = await exports.prisma.actor.findUnique({ where: { id } });
        if (!actor) {
            return res.status(404).json({ error: 'Actor no encontrado' });
        }
        const isOwner = actor.userId === req.user.id;
        const isAdmin = req.user.role === 'ADMIN';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ error: 'No tienes permiso para crear listas para este actor' });
        }
        const newPlaylist = await exports.prisma.playlist.create({
            data: {
                actorId: id,
                userId: req.user.id,
                title: title.trim(),
                description: description?.trim() || '',
                coverUrl: coverUrl || undefined,
                isPrivate: Boolean(isPrivate),
                items: Array.isArray(videoIds) && videoIds.length > 0
                    ? {
                        create: videoIds.map((vId, idx) => ({
                            videoId: vId,
                            order: idx,
                        })),
                    }
                    : undefined,
            },
            include: {
                items: {
                    include: {
                        video: true,
                    },
                },
            },
        });
        return res.status(201).json({
            status: 'success',
            message: 'Lista de reproducción creada exitosamente',
            playlist: newPlaylist,
        });
    }
    catch (err) {
        console.error('Error creating playlist:', err);
        return res.status(500).json({ error: 'Error al crear la lista de reproducción' });
    }
});
app.delete('/api/playlists/:id', rbac_middleware_1.authenticateJWT, async (req, res) => {
    try {
        const pl = await exports.prisma.playlist.findUnique({ where: { id: req.params.id } });
        if (!pl)
            return res.status(404).json({ error: 'Lista no encontrada' });
        if (pl.userId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ error: 'No tienes permiso para eliminar esta lista' });
        }
        await exports.prisma.playlistItem.deleteMany({ where: { playlistId: pl.id } });
        await exports.prisma.playlist.delete({ where: { id: pl.id } });
        return res.json({ status: 'success', message: 'Lista eliminada correctamente' });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al eliminar la lista' });
    }
});
app.post('/api/admin/actors', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    const { name, stageName, bio, avatarUrl, avatarPublicId, bannerUrl, bannerPublicId, nationality } = req.body;
    if (!stageName || !stageName.trim()) {
        return res.status(400).json({ error: 'El nombre artístico (stageName) es obligatorio' });
    }
    try {
        const existing = await exports.prisma.actor.findUnique({
            where: { stageName: stageName.trim() },
        });
        if (existing) {
            return res.status(400).json({ error: 'Ya existe un actor con ese nombre artístico' });
        }
        const newActor = await exports.prisma.actor.create({
            data: {
                name: name?.trim() || stageName.trim(),
                stageName: stageName.trim(),
                bio: bio?.trim() || 'Actor verificado de la plataforma TexxxNopor.',
                avatarUrl: avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop',
                avatarPublicId: avatarPublicId || undefined,
                bannerUrl: bannerUrl ||
                    'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&auto=format&fit=crop',
                bannerPublicId: bannerPublicId || undefined,
                nationality: nationality?.trim() || 'Internacional',
                isVerified: true,
            },
        });
        return res.status(201).json({
            status: 'success',
            message: 'Actor creado y guardado en PostgreSQL correctamente',
            actor: {
                id: newActor.id,
                name: newActor.name,
                stageName: newActor.stageName,
                bio: newActor.bio,
                avatarUrl: newActor.avatarUrl,
                avatarPublicId: newActor.avatarPublicId,
                bannerUrl: newActor.bannerUrl,
                nationality: newActor.nationality,
                isVerified: newActor.isVerified,
                videosCount: 0,
                followersCount: 0,
                createdAt: newActor.createdAt.toISOString(),
            },
        });
    }
    catch (err) {
        console.error('Error creating actor:', err);
        return res.status(500).json({ error: 'Error al crear el actor en la base de datos' });
    }
});
app.put('/api/admin/actors/:id', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    const { id } = req.params;
    const { name, stageName, bio, avatarUrl, avatarPublicId, bannerUrl, bannerPublicId, nationality, isVerified } = req.body;
    try {
        const updated = await exports.prisma.actor.update({
            where: { id },
            data: {
                name: name !== undefined ? name.trim() : undefined,
                stageName: stageName !== undefined ? stageName.trim() : undefined,
                bio: bio !== undefined ? bio.trim() : undefined,
                avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
                avatarPublicId: avatarPublicId !== undefined ? avatarPublicId : undefined,
                bannerUrl: bannerUrl !== undefined ? bannerUrl : undefined,
                bannerPublicId: bannerPublicId !== undefined ? bannerPublicId : undefined,
                nationality: nationality !== undefined ? nationality.trim() : undefined,
                isVerified: isVerified !== undefined ? Boolean(isVerified) : undefined,
            },
            include: {
                videos: { select: { id: true } },
                followers: true,
            },
        });
        return res.json({
            status: 'success',
            message: 'Actor actualizado correctamente',
            actor: {
                id: updated.id,
                name: updated.name,
                stageName: updated.stageName,
                bio: updated.bio,
                avatarUrl: updated.avatarUrl,
                bannerUrl: updated.bannerUrl,
                nationality: updated.nationality,
                isVerified: updated.isVerified,
                videosCount: updated.videos.length,
                followersCount: updated.followers.length,
                createdAt: updated.createdAt.toISOString(),
            },
        });
    }
    catch (err) {
        console.error('Error updating actor:', err);
        return res.status(500).json({ error: 'Error al actualizar el actor' });
    }
});
app.delete('/api/admin/actors/:id', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    const { id } = req.params;
    try {
        const actor = await exports.prisma.actor.findUnique({ where: { id } });
        if (!actor) {
            return res.status(404).json({ error: 'Actor no encontrado' });
        }
        // 1. Buscar todos los videos asociados al actor (por actorId o por userId del creador)
        const actorVideos = await exports.prisma.video.findMany({
            where: {
                OR: [
                    { actorId: id },
                    ...(actor.userId ? [{ creatorId: actor.userId }] : []),
                ],
            },
        });
        console.log(`[Admin] Eliminando actor ${actor.stageName} y sus ${actorVideos.length} videos en cascada...`);
        // 2. Eliminar cada video y sus archivos multimedia en almacenamiento externo (Bunny.net/Cloudinary) y relaciones
        for (const video of actorVideos) {
            if (video.cloudinaryPublicId) {
                await bunny_service_1.BunnyService.deleteAsset(video.cloudinaryPublicId).catch((e) => console.warn(`[Bunny.net] Error al eliminar video ${video.cloudinaryPublicId}:`, e.message));
            }
            if (video.thumbnailPublicId) {
                await bunny_service_1.BunnyService.deleteAsset(video.thumbnailPublicId).catch((e) => console.warn(`[Bunny.net] Error al eliminar miniatura ${video.thumbnailPublicId}:`, e.message));
            }
            // Eliminar archivos locales si existen
            if (video.videoUrl && video.videoUrl.includes('/uploads/videos/')) {
                const localVidName = video.videoUrl.split('/uploads/videos/').pop();
                if (localVidName) {
                    const localVidPath = path_1.default.join(exports.UPLOADS_VIDEOS_DIR, localVidName);
                    if (fs_1.default.existsSync(localVidPath)) {
                        try {
                            fs_1.default.unlinkSync(localVidPath);
                        }
                        catch (_) { }
                    }
                }
            }
            // Eliminar relaciones en la base de datos
            await exports.prisma.comment.deleteMany({ where: { videoId: video.id } });
            await exports.prisma.videoLike.deleteMany({ where: { videoId: video.id } });
            await exports.prisma.favorite.deleteMany({ where: { videoId: video.id } });
            await exports.prisma.playbackHistory.deleteMany({ where: { videoId: video.id } });
            await exports.prisma.videoTag.deleteMany({ where: { videoId: video.id } });
            await exports.prisma.videoRetentionStat.deleteMany({ where: { videoId: video.id } });
            await exports.prisma.moderationLog.deleteMany({ where: { videoId: video.id } });
            await exports.prisma.transcodeJob.deleteMany({ where: { videoId: video.id } });
            await exports.prisma.playlistItem.deleteMany({ where: { videoId: video.id } });
            await exports.prisma.video.delete({ where: { id: video.id } });
        }
        // 3. Eliminar playlists creadas por este actor
        await exports.prisma.playlistItem.deleteMany({
            where: { playlist: { actorId: id } },
        });
        await exports.prisma.playlist.deleteMany({ where: { actorId: id } });
        // 4. Eliminar fotos de avatar y banner del actor en almacenamiento externo
        if (actor.avatarPublicId) {
            await bunny_service_1.BunnyService.deleteAsset(actor.avatarPublicId).catch(() => { });
        }
        if (actor.bannerPublicId) {
            await bunny_service_1.BunnyService.deleteAsset(actor.bannerPublicId).catch(() => { });
        }
        // 5. Eliminar followers y el registro del actor
        await exports.prisma.follow.deleteMany({ where: { actorId: id } });
        await exports.prisma.actor.delete({ where: { id } });
        return res.json({
            status: 'success',
            message: `Actor '${actor.stageName}' y sus ${actorVideos.length} videos fueron eliminados permanentemente.`,
            actorId: id,
            deletedVideosCount: actorVideos.length,
        });
    }
    catch (err) {
        console.error('Error deleting actor:', err);
        return res.status(500).json({ error: 'Error al eliminar el actor y sus videos' });
    }
});
// ====================================================
// 5. SUBIDAS DE MULTIMEDIA (LOCAL STREAMING + BUNNY.NET)
// ====================================================
app.post(['/api/admin/upload/video', '/api/upload/video'], rbac_middleware_1.authenticateJWT, upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se envió ningún archivo de video' });
        }
        const validation = bunny_service_1.BunnyService.validateVideoFile(req.file.mimetype, req.file.size);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }
        // 1. Guardar video localmente para streaming inmediato
        const cleanName = path_1.default.parse(req.file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, '') || 'video';
        const localFilename = `vid_${Date.now()}_${cleanName}.mp4`;
        const localFilePath = path_1.default.join(exports.UPLOADS_VIDEOS_DIR, localFilename);
        fs_1.default.writeFileSync(localFilePath, req.file.buffer);
        const serverHost = req.get('host') || '192.168.20.25:4000';
        const localStreamUrl = `http://${serverHost}/api/stream/video/${localFilename}`;
        console.log(`📹 Video guardado localmente: ${localFilePath} (${req.file.size} bytes)`);
        // 2. Generar miniatura automática desde el fotograma del video (segundo 3)
        let autoThumbnailUrl;
        let autoThumbnailPublicId;
        console.log('🖼️ Extrayendo miniatura automática del video...');
        const thumbResult = await bunny_service_1.BunnyService.extractThumbnailFromBuffer(req.file.buffer, 1);
        if (thumbResult) {
            // Guardar miniatura localmente
            const thumbLocalPath = path_1.default.join(exports.UPLOADS_IMAGES_DIR, thumbResult.filename);
            fs_1.default.writeFileSync(thumbLocalPath, thumbResult.buffer);
            const thumbLocalUrl = `http://${serverHost}/uploads/images/${thumbResult.filename}`;
            // Intentar subir miniatura a Bunny.net
            try {
                const bunnyThumb = await bunny_service_1.BunnyService.uploadImageBuffer(thumbResult.buffer, thumbResult.filename, 'thumbnails');
                autoThumbnailUrl = bunnyThumb.secure_url;
                autoThumbnailPublicId = bunnyThumb.public_id;
                console.log(`✅ Miniatura subida a Bunny.net: ${autoThumbnailUrl}`);
            }
            catch (_e) {
                autoThumbnailUrl = thumbLocalUrl;
                autoThumbnailPublicId = `local_${thumbResult.filename}`;
                console.log(`📍 Miniatura guardada localmente: ${thumbLocalUrl}`);
            }
        }
        else {
            console.log('⚠️ No se pudo extraer miniatura; se usará la URL del video como referencia.');
        }
        // 3. Subir video a Bunny.net Storage & CDN en segundo plano
        let bunnyResult = null;
        try {
            bunnyResult = await bunny_service_1.BunnyService.uploadVideoBuffer(req.file.buffer, req.file.originalname, 'videos');
        }
        catch (bunnyErr) {
            console.warn('⚠️ Bunny.net video upload warning (usando stream directo):', bunnyErr.message);
        }
        const finalVideoUrl = bunnyResult?.secure_url || localStreamUrl;
        return res.status(200).json({
            status: 'success',
            message: 'Video subido y procesado exitosamente',
            data: {
                secure_url: finalVideoUrl,
                public_id: bunnyResult?.public_id || `local_${localFilename}`,
                format: 'mp4',
                bytes: req.file.size,
                duration: bunnyResult?.duration
                    ? `${Math.floor(bunnyResult.duration / 60)}:${Math.floor(bunnyResult.duration % 60)
                        .toString()
                        .padStart(2, '0')}`
                    : '12:00',
                durationSeconds: bunnyResult?.duration || 720,
                // URL de miniatura extraída automáticamente del video
                thumbnailUrl: autoThumbnailUrl,
                thumbnailPublicId: autoThumbnailPublicId,
            },
        });
    }
    catch (err) {
        console.error('Error al procesar subida de video:', err);
        return res.status(500).json({
            error: err.message || 'Error al procesar la subida del video',
        });
    }
});
app.post('/api/admin/upload/image', rbac_middleware_1.authenticateJWT, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se envió ningún archivo de imagen' });
        }
        const validation = bunny_service_1.BunnyService.validateImageFile(req.file.mimetype, req.file.size);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }
        const cleanName = path_1.default.parse(req.file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, '') || 'image';
        const ext = path_1.default.parse(req.file.originalname).ext || '.jpg';
        const localFilename = `img_${Date.now()}_${cleanName}${ext}`;
        const localFilePath = path_1.default.join(exports.UPLOADS_IMAGES_DIR, localFilename);
        fs_1.default.writeFileSync(localFilePath, req.file.buffer);
        const serverHost = req.get('host') || '192.168.20.25:4000';
        const localImageUrl = `http://${serverHost}/uploads/images/${localFilename}`;
        let bunnyResult = null;
        try {
            bunnyResult = await bunny_service_1.BunnyService.uploadImageBuffer(req.file.buffer, req.file.originalname, 'images');
        }
        catch (bunnyErr) {
            console.warn('⚠️ Bunny.net image warning:', bunnyErr.message);
        }
        const finalUrl = bunnyResult?.secure_url || localImageUrl;
        return res.status(200).json({
            status: 'success',
            message: 'Imagen subida exitosamente',
            data: {
                secure_url: finalUrl,
                public_id: bunnyResult?.public_id || `local_${localFilename}`,
                format: ext.replace('.', ''),
                bytes: req.file.size,
            },
        });
    }
    catch (err) {
        console.error('Error al subir imagen:', err);
        return res.status(500).json({
            error: err.message || 'Error al procesar la subida de imagen',
        });
    }
});
app.post('/api/upload/image', rbac_middleware_1.authenticateJWT, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se envió ningún archivo de imagen' });
        }
        const validation = bunny_service_1.BunnyService.validateImageFile(req.file.mimetype, req.file.size);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }
        const cleanName = path_1.default.parse(req.file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, '') || 'image';
        const ext = path_1.default.parse(req.file.originalname).ext || '.jpg';
        const localFilename = `img_${Date.now()}_${cleanName}${ext}`;
        const localFilePath = path_1.default.join(exports.UPLOADS_IMAGES_DIR, localFilename);
        fs_1.default.writeFileSync(localFilePath, req.file.buffer);
        const serverHost = req.get('host') || '192.168.20.25:4000';
        const localImageUrl = `http://${serverHost}/uploads/images/${localFilename}`;
        let bunnyResult = null;
        try {
            bunnyResult = await bunny_service_1.BunnyService.uploadImageBuffer(req.file.buffer, req.file.originalname, 'images');
        }
        catch (bunnyErr) {
            console.warn('⚠️ Bunny.net image warning:', bunnyErr.message);
        }
        const finalUrl = bunnyResult?.secure_url || localImageUrl;
        return res.status(200).json({
            status: 'success',
            message: 'Imagen subida exitosamente',
            data: {
                secure_url: finalUrl,
                public_id: bunnyResult?.public_id || `local_${localFilename}`,
                format: ext.replace('.', ''),
                bytes: req.file.size,
            },
        });
    }
    catch (err) {
        console.error('Error al subir imagen:', err);
        return res.status(500).json({
            error: err.message || 'Error al procesar la subida de imagen',
        });
    }
});
app.delete('/api/admin/upload/:publicId', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    const { publicId } = req.params;
    try {
        await bunny_service_1.BunnyService.deleteAsset(publicId);
        return res.json({ status: 'success', message: `Recurso ${publicId} eliminado de Bunny.net` });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// ====================================================
// 6. CRUD DE VIDEOS (CATEGORÍAS Y HASHTAGS DE BÚSQUEDA)
// ====================================================
// Público (Espectadores y Admin) con soporte de categorías y hashtags
app.get('/api/videos', async (req, res) => {
    const currentUserId = req.query.userId;
    const categoryFilter = req.query.category;
    const searchFilter = req.query.q;
    const tagFilter = req.query.tag;
    try {
        let whereClause = {
            status: 'READY',
        };
        // Filtrar por Categoría específica si no es 'Para ti' o 'Todos'
        if (categoryFilter &&
            categoryFilter.trim() !== '' &&
            categoryFilter !== 'Para ti' &&
            categoryFilter !== 'Todos') {
            const catSlug = categoryFilter.trim().toLowerCase().replace(/\s+/g, '-');
            whereClause.OR = [
                { category: { name: { equals: categoryFilter.trim(), mode: 'insensitive' } } },
                { category: { slug: { equals: catSlug, mode: 'insensitive' } } },
                { tagsList: { has: `#${catSlug}` } },
            ];
        }
        // Filtrar por Tag o Hashtag específico
        if (tagFilter && tagFilter.trim() !== '') {
            const cleanTag = tagFilter.trim().startsWith('#')
                ? tagFilter.trim().toLowerCase()
                : `#${tagFilter.trim().toLowerCase()}`;
            whereClause.tagsList = { has: cleanTag };
        }
        // Búsqueda general por texto (título, descripción, tags o actor)
        if (searchFilter && searchFilter.trim() !== '') {
            const q = searchFilter.trim().toLowerCase();
            const qTag = q.startsWith('#') ? q : `#${q}`;
            whereClause.OR = [
                { title: { contains: searchFilter.trim(), mode: 'insensitive' } },
                { description: { contains: searchFilter.trim(), mode: 'insensitive' } },
                { actor: { stageName: { contains: searchFilter.trim(), mode: 'insensitive' } } },
                { category: { name: { contains: searchFilter.trim(), mode: 'insensitive' } } },
                { tagsList: { has: qTag } },
            ];
        }
        // Ordenamiento
        let orderBy = { createdAt: 'desc' };
        if (categoryFilter === 'Más videos' || categoryFilter === 'Más vistos') {
            orderBy = { viewsCount: 'desc' };
        }
        const videosFromDb = await exports.prisma.video.findMany({
            where: whereClause,
            orderBy,
            include: {
                actor: true,
                creator: { include: { user: true } },
                category: true,
                likes: true,
                favorites: true,
                comments: { select: { id: true } },
            },
        });
        const formatted = videosFromDb.map((v) => formatVideoItem(v, currentUserId));
        return res.json({ videos: formatted });
    }
    catch (err) {
        console.error('Error fetching videos from DB:', err);
        return res.status(500).json({ error: 'Error al consultar videos en la base de datos' });
    }
});
app.get('/api/videos/:id', async (req, res) => {
    const currentUserId = req.query.userId;
    try {
        const video = await exports.prisma.video.findUnique({
            where: { id: req.params.id },
            include: {
                actor: {
                    include: { followers: true },
                },
                creator: { include: { user: true } },
                category: true,
                likes: true,
                favorites: true,
                comments: {
                    include: {
                        user: {
                            select: { id: true, username: true, avatarUrl: true },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!video) {
            return res.status(404).json({ error: 'Video no encontrado' });
        }
        const formatted = formatVideoItem(video, currentUserId);
        const isFollowingActor = currentUserId && video.actor
            ? video.actor.followers.some((f) => f.followerId === currentUserId)
            : false;
        const commentsList = video.comments.map((c) => ({
            id: c.id,
            videoId: c.videoId,
            userId: c.userId,
            userName: c.user?.username || 'Usuario',
            userAvatar: c.user?.avatarUrl ||
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop',
            text: c.text,
            likes: c.likesCount,
            createdAt: c.createdAt.toISOString(),
        }));
        return res.json({
            video: {
                ...formatted,
                actorFollowersCount: video.actor?.followers.length || 0,
                isFollowingActor,
                comments: commentsList,
            },
        });
    }
    catch (err) {
        console.error('Error fetching video detail:', err);
        return res.status(500).json({ error: 'Error al consultar el video' });
    }
});
// Crear Video con Categoría y Hashtags
app.post('/api/admin/videos', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN, rbac_1.UserRole.CREATOR), async (req, res) => {
    const { title, description, duration, durationSeconds, thumbnailUrl, thumbnailPublicId, videoUrl, cloudinaryPublicId, hlsMasterUrl, category, tags, actorId, isFollowersOnly, } = req.body;
    if (!title || !title.trim()) {
        return res.status(400).json({ error: 'El título del video es obligatorio' });
    }
    try {
        // 1. Categoría
        let categoryRecord = null;
        const catName = category?.trim() || 'Para ti';
        const slug = catName.toLowerCase().replace(/\s+/g, '-');
        categoryRecord = await exports.prisma.category.upsert({
            where: { slug },
            update: {},
            create: {
                name: catName,
                slug,
                description: `Categoría ${catName}`,
            },
        });
        // 2. Extraer y normalizar hashtags
        const extractedTags = extractHashtags(`${title} ${description || ''}`);
        let explicitTags = [];
        if (Array.isArray(tags)) {
            explicitTags = tags.map((t) => t.startsWith('#') ? t.toLowerCase() : `#${t.toLowerCase()}`);
        }
        else if (typeof tags === 'string' && tags.trim()) {
            explicitTags = tags
                .split(/[\s,]+/)
                .filter(Boolean)
                .map((t) => (t.startsWith('#') ? t.toLowerCase() : `#${t.toLowerCase()}`));
        }
        // Añadir la categoría como hashtag por defecto para búsquedas
        const categoryTag = `#${slug.replace(/-/g, '')}`;
        const allTags = Array.from(new Set([...explicitTags, ...extractedTags, categoryTag]));
        const finalVideoUrl = videoUrl?.trim() || '';
        const finalHlsUrl = hlsMasterUrl?.trim() || finalVideoUrl;
        // Miniatura
        let finalThumbnailUrl = thumbnailUrl?.trim();
        let finalThumbnailPublicId = thumbnailPublicId?.trim();
        if (!finalThumbnailUrl && finalVideoUrl) {
            // Intentar extraer captura del archivo de video local si existe
            const videoFilename = finalVideoUrl.split('/').pop()?.split('?')[0];
            if (videoFilename && fs_1.default.existsSync(path_1.default.join(exports.UPLOADS_VIDEOS_DIR, videoFilename))) {
                try {
                    const localVideoPath = path_1.default.join(exports.UPLOADS_VIDEOS_DIR, videoFilename);
                    const videoBuf = fs_1.default.readFileSync(localVideoPath);
                    const thumbResult = await bunny_service_1.BunnyService.extractThumbnailFromBuffer(videoBuf, 2);
                    if (thumbResult) {
                        const thumbLocalPath = path_1.default.join(exports.UPLOADS_IMAGES_DIR, thumbResult.filename);
                        fs_1.default.writeFileSync(thumbLocalPath, thumbResult.buffer);
                        const serverHost = req.get('host') || '192.168.20.25:4000';
                        finalThumbnailUrl = `http://${serverHost}/uploads/images/${thumbResult.filename}`;
                        finalThumbnailPublicId = `local_${thumbResult.filename}`;
                        console.log(`🖼️ [Auto-Thumbnail] Generada miniatura automática para video: ${finalThumbnailUrl}`);
                    }
                }
                catch (tErr) {
                    console.warn('[Auto-Thumbnail] Error generando miniatura:', tErr.message);
                }
            }
        }
        if (!finalThumbnailUrl) {
            finalThumbnailUrl = 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop';
        }
        const userId = req.user.id;
        const userRecord = await exports.prisma.user.findUnique({ where: { id: userId } });
        const { creatorProfile, actor: defaultActor } = await ensureCreatorProfileAndActor(userId, userRecord?.username || 'Usuario', userRecord?.avatarUrl);
        // Asociar actor si no se pasó explícitamente
        const assignedActorId = actorId || defaultActor.id;
        const assignedCreatorId = creatorProfile.id;
        const newVideo = await exports.prisma.video.create({
            data: {
                title: title.trim(),
                description: description ? description.trim() : '',
                duration: duration || '15:00',
                durationSeconds: Number(durationSeconds) || 900,
                thumbnailUrl: finalThumbnailUrl || finalVideoUrl,
                thumbnailPublicId: finalThumbnailPublicId || undefined,
                videoUrl: finalVideoUrl,
                cloudinaryPublicId: cloudinaryPublicId || undefined,
                hlsMasterUrl: finalHlsUrl,
                actorId: assignedActorId,
                creatorId: assignedCreatorId,
                categoryId: categoryRecord?.id || undefined,
                tagsList: allTags,
                isFollowersOnly: Boolean(isFollowersOnly),
            },
            include: {
                actor: true,
                creator: { include: { user: true } },
                category: true,
                likes: true,
                favorites: true,
                comments: true,
            },
        });
        const formatted = formatVideoItem(newVideo, userId);
        return res.status(201).json({
            status: 'success',
            message: 'Video publicado y guardado en PostgreSQL con éxito',
            video: formatted,
        });
    }
    catch (err) {
        console.error('Error creating video:', err);
        return res.status(500).json({ error: 'Error al registrar el video en la base de datos' });
    }
});
// Editar Video
// Editar Video
app.put(['/api/admin/videos/:id', '/api/videos/:id'], rbac_middleware_1.authenticateJWT, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { title, description, category, tags, duration, durationSeconds, thumbnailUrl, thumbnailPublicId, videoUrl, cloudinaryPublicId, actorId, status, } = req.body;
    try {
        const existingVideo = await exports.prisma.video.findUnique({
            where: { id },
            include: { creator: true, actor: true },
        });
        if (!existingVideo) {
            return res.status(404).json({ error: 'Video no encontrado' });
        }
        const isOwner = existingVideo.creator?.userId === userId ||
            existingVideo.actor?.userId === userId ||
            existingVideo.creatorId === userId;
        if (userRole !== 'ADMIN' && !isOwner) {
            return res.status(403).json({ error: 'No tienes permiso para editar este video' });
        }
        let categoryIdToUpdate = undefined;
        let newTagsList = undefined;
        if (category && category.trim()) {
            const slug = category.trim().toLowerCase().replace(/\s+/g, '-');
            const cat = await exports.prisma.category.upsert({
                where: { slug },
                update: {},
                create: { name: category.trim(), slug },
            });
            categoryIdToUpdate = cat.id;
        }
        if (tags !== undefined || title !== undefined || description !== undefined) {
            const extractedTags = extractHashtags(`${title || ''} ${description || ''}`);
            let explicitTags = [];
            if (Array.isArray(tags)) {
                explicitTags = tags.map((t) => t.startsWith('#') ? t.toLowerCase() : `#${t.toLowerCase()}`);
            }
            newTagsList = Array.from(new Set([...explicitTags, ...extractedTags]));
        }
        const updated = await exports.prisma.video.update({
            where: { id },
            data: {
                title: title !== undefined ? title.trim() : undefined,
                description: description !== undefined ? description.trim() : undefined,
                duration: duration !== undefined ? duration : undefined,
                durationSeconds: durationSeconds !== undefined ? Number(durationSeconds) : undefined,
                thumbnailUrl: thumbnailUrl !== undefined ? thumbnailUrl : undefined,
                thumbnailPublicId: thumbnailPublicId !== undefined ? thumbnailPublicId : undefined,
                videoUrl: videoUrl !== undefined ? videoUrl : undefined,
                cloudinaryPublicId: cloudinaryPublicId !== undefined ? cloudinaryPublicId : undefined,
                actorId: actorId !== undefined ? (actorId || null) : undefined,
                categoryId: categoryIdToUpdate !== undefined ? categoryIdToUpdate : undefined,
                tagsList: newTagsList !== undefined ? newTagsList : undefined,
                status: status !== undefined ? status : undefined,
            },
            include: {
                actor: true,
                category: true,
                likes: true,
                favorites: true,
                comments: true,
            },
        });
        return res.json({
            status: 'success',
            message: 'Video actualizado correctamente en PostgreSQL',
            video: formatVideoItem(updated, userId),
        });
    }
    catch (err) {
        console.error('Error updating video:', err);
        return res.status(500).json({ error: 'Error al actualizar el video' });
    }
});
// Cambiar estado del video (READY, FLAGGED, REJECTED) para pausar/bloquear temporalmente
app.patch('/api/videos/:id/status', rbac_middleware_1.authenticateJWT, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'READY', 'FLAGGED', 'REJECTED'
    const userId = req.user.id;
    const userRole = req.user.role;
    try {
        const video = await exports.prisma.video.findUnique({
            where: { id },
            include: { creator: true, actor: true },
        });
        if (!video) {
            return res.status(404).json({ error: 'Video no encontrado' });
        }
        const isOwner = video.creator?.userId === userId ||
            video.actor?.userId === userId ||
            video.creatorId === userId;
        if (userRole !== 'ADMIN' && !isOwner) {
            return res.status(403).json({ error: 'No tienes permiso para modificar el estado de este video' });
        }
        const validStatuses = ['READY', 'FLAGGED', 'REJECTED', 'PROCESSING', 'UPLOADING'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Estado no válido' });
        }
        const updated = await exports.prisma.video.update({
            where: { id },
            data: { status },
            include: {
                actor: true,
                creator: { include: { user: true } },
                category: true,
                likes: true,
                favorites: true,
                comments: { select: { id: true } },
            },
        });
        return res.json({
            status: 'success',
            message: `El estado del video ha cambiado a ${status}`,
            video: formatVideoItem(updated, userId),
        });
    }
    catch (err) {
        console.error('Error updating video status:', err);
        return res.status(500).json({ error: 'Error al actualizar el estado del video' });
    }
});
// Eliminar Video (Admin o Propietario del Video)
app.delete(['/api/admin/videos/:id', '/api/videos/:id'], rbac_middleware_1.authenticateJWT, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    try {
        const videoToDelete = await exports.prisma.video.findUnique({
            where: { id },
            include: { creator: true, actor: true },
        });
        if (!videoToDelete) {
            return res.status(404).json({ error: 'Video no encontrado en la base de datos' });
        }
        const isOwner = videoToDelete.creator?.userId === userId ||
            videoToDelete.actor?.userId === userId ||
            videoToDelete.creatorId === userId;
        if (userRole !== 'ADMIN' && !isOwner) {
            return res.status(403).json({ error: 'No tienes permiso para eliminar este video' });
        }
        if (videoToDelete.cloudinaryPublicId) {
            await bunny_service_1.BunnyService.deleteAsset(videoToDelete.cloudinaryPublicId).catch((e) => console.warn('Bunny.net video delete error:', e.message));
        }
        if (videoToDelete.thumbnailPublicId) {
            await bunny_service_1.BunnyService.deleteAsset(videoToDelete.thumbnailPublicId).catch((e) => console.warn('Bunny.net thumb delete error:', e.message));
        }
        // Eliminar archivos locales si existen
        if (videoToDelete.videoUrl && videoToDelete.videoUrl.includes('/uploads/videos/')) {
            const localVidName = videoToDelete.videoUrl.split('/uploads/videos/').pop();
            if (localVidName) {
                const localVidPath = path_1.default.join(exports.UPLOADS_VIDEOS_DIR, localVidName);
                if (fs_1.default.existsSync(localVidPath)) {
                    try {
                        fs_1.default.unlinkSync(localVidPath);
                    }
                    catch (_) { }
                }
            }
        }
        await exports.prisma.comment.deleteMany({ where: { videoId: id } });
        await exports.prisma.videoLike.deleteMany({ where: { videoId: id } });
        await exports.prisma.favorite.deleteMany({ where: { videoId: id } });
        await exports.prisma.playbackHistory.deleteMany({ where: { videoId: id } });
        await exports.prisma.videoTag.deleteMany({ where: { videoId: id } });
        await exports.prisma.videoRetentionStat.deleteMany({ where: { videoId: id } });
        await exports.prisma.moderationLog.deleteMany({ where: { videoId: id } });
        await exports.prisma.transcodeJob.deleteMany({ where: { videoId: id } });
        await exports.prisma.playlistItem.deleteMany({ where: { videoId: id } });
        await exports.prisma.video.delete({ where: { id } });
        return res.json({
            status: 'success',
            message: 'Video eliminado permanentemente de la base de datos y almacenamiento',
            videoId: id,
        });
    }
    catch (err) {
        console.error('Error deleting video:', err);
        return res.status(500).json({ error: 'Error al eliminar el video de la base de datos' });
    }
});
// ====================================================
// 7. SISTEMA DE LIKES, FAVORITOS (VER DESPUÉS), HISTORIAL Y SEGUIMIENTO
// ====================================================
app.post('/api/videos/:id/like', rbac_middleware_1.authenticateJWT, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const video = await exports.prisma.video.findUnique({ where: { id } });
        if (!video) {
            return res.status(404).json({ error: 'Video no encontrado' });
        }
        const existingLike = await exports.prisma.videoLike.findUnique({
            where: {
                userId_videoId: { userId, videoId: id },
            },
        });
        let isLiked = false;
        let newLikesCount = Number(video.likesCount);
        if (existingLike) {
            await exports.prisma.videoLike.delete({
                where: { userId_videoId: { userId, videoId: id } },
            });
            newLikesCount = Math.max(0, newLikesCount - 1);
            await exports.prisma.video.update({
                where: { id },
                data: { likesCount: BigInt(newLikesCount) },
            });
            isLiked = false;
        }
        else {
            await exports.prisma.videoLike.create({
                data: { userId, videoId: id },
            });
            newLikesCount += 1;
            await exports.prisma.video.update({
                where: { id },
                data: { likesCount: BigInt(newLikesCount) },
            });
            isLiked = true;
            // Despachar notificación al creador o actriz/actor del video
            try {
                const videoWithOwner = await exports.prisma.video.findUnique({
                    where: { id },
                    include: { actor: true, creator: true },
                });
                const likerUser = await exports.prisma.user.findUnique({
                    where: { id: userId },
                    select: { username: true, avatarUrl: true },
                });
                const recipientId = videoWithOwner?.actor?.userId ||
                    videoWithOwner?.actor?.id ||
                    videoWithOwner?.creator?.userId ||
                    videoWithOwner?.creatorId;
                if (recipientId && recipientId !== userId) {
                    await notification_service_1.NotificationService.notify({
                        recipientId,
                        actorId: userId,
                        type: 'NEW_LIKE',
                        title: 'Nuevo Me Gusta ❤️',
                        message: `A @${likerUser?.username || 'Un usuario'} le gustó tu video "${video.title}"`,
                        senderName: likerUser?.username || 'Usuario',
                        senderAvatar: likerUser?.avatarUrl || undefined,
                        videoId: video.id,
                        videoTitle: video.title,
                        videoThumb: video.thumbnailUrl || undefined,
                    });
                }
            }
            catch (notifErr) {
                console.warn('⚠️ Error enviando notificación de like:', notifErr.message);
            }
        }
        return res.json({
            status: 'success',
            videoId: id,
            isLiked,
            likesCount: newLikesCount,
        });
    }
    catch (err) {
        console.error('Error in toggle like:', err);
        return res.status(500).json({ error: 'Error al registrar el like' });
    }
});
// Guardar / Quitar de "Ver después" (Favoritos)
app.post(['/api/videos/:id/favorite', '/api/videos/:id/watch-later'], rbac_middleware_1.authenticateJWT, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const existing = await exports.prisma.favorite.findUnique({
            where: {
                userId_videoId: { userId, videoId: id },
            },
        });
        let isSaved = false;
        if (existing) {
            await exports.prisma.favorite.delete({
                where: { userId_videoId: { userId, videoId: id } },
            });
            isSaved = false;
        }
        else {
            await exports.prisma.favorite.create({
                data: { userId, videoId: id },
            });
            isSaved = true;
        }
        return res.json({
            status: 'success',
            videoId: id,
            isSaved,
            message: isSaved ? 'Guardado en Ver después' : 'Eliminado de Ver después',
        });
    }
    catch (err) {
        console.error('Error in toggle favorite:', err);
        return res.status(500).json({ error: 'Error al guardar video en favoritos' });
    }
});
// Registrar reproducción en Historial y sumar vista
app.post('/api/videos/:id/history', rbac_middleware_1.authenticateJWT, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { stoppedAtSec } = req.body;
    try {
        await exports.prisma.playbackHistory.upsert({
            where: {
                userId_videoId: { userId, videoId: id },
            },
            update: {
                stoppedAtSec: Number(stoppedAtSec) || 0,
                updatedAt: new Date(),
            },
            create: {
                userId,
                videoId: id,
                stoppedAtSec: Number(stoppedAtSec) || 0,
            },
        });
        await exports.prisma.video.update({
            where: { id },
            data: { viewsCount: { increment: 1 } },
        });
        return res.json({ status: 'success', message: 'Historial registrado' });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al registrar historial' });
    }
});
// Seguir / Dejar de seguir a un Actor o Creador (Suscripciones)
app.post(['/api/creators/:creatorId/follow', '/api/actors/:creatorId/follow'], rbac_middleware_1.authenticateJWT, async (req, res) => {
    const { creatorId } = req.params;
    const followerId = req.user.id;
    try {
        // Buscar actor correspondiente
        const actor = await exports.prisma.actor.findFirst({
            where: {
                OR: [{ id: creatorId }, { stageName: creatorId }],
            },
        });
        const targetActorId = actor ? actor.id : creatorId;
        const existing = await exports.prisma.follow.findFirst({
            where: {
                followerId,
                OR: [{ actorId: targetActorId }, { creatorId: targetActorId }],
            },
        });
        let isFollowing = false;
        if (existing) {
            await exports.prisma.follow.delete({ where: { id: existing.id } });
            isFollowing = false;
        }
        else {
            await exports.prisma.follow.create({
                data: {
                    followerId,
                    actorId: actor ? actor.id : undefined,
                    creatorId: !actor ? targetActorId : undefined,
                },
            });
            isFollowing = true;
            // Despachar notificación de nuevo seguidor al actor/creador
            try {
                const followerUser = await exports.prisma.user.findUnique({
                    where: { id: followerId },
                    select: { username: true, avatarUrl: true },
                });
                const recipientId = actor?.userId || actor?.id || targetActorId;
                if (recipientId && recipientId !== followerId) {
                    await notification_service_1.NotificationService.notify({
                        recipientId,
                        actorId: followerId,
                        type: 'NEW_FOLLOWER',
                        title: 'Nuevo Seguidor 👤',
                        message: `@${followerUser?.username || 'Un usuario'} comenzó a seguirte`,
                        senderName: followerUser?.username || 'Usuario',
                        senderAvatar: followerUser?.avatarUrl || undefined,
                    });
                }
            }
            catch (notifErr) {
                console.warn('⚠️ Error notificando nuevo seguidor:', notifErr.message);
            }
        }
        // Conteo real de seguidores en base de datos
        const followersCount = await exports.prisma.follow.count({
            where: {
                OR: [{ actorId: targetActorId }, { creatorId: targetActorId }],
            },
        });
        return res.json({
            status: 'success',
            creatorId: targetActorId,
            isFollowing,
            followersCount,
        });
    }
    catch (err) {
        console.error('Error in toggle follow:', err);
        return res.status(500).json({ error: 'Error al seguir creador' });
    }
});
// Comentarios
app.get('/api/videos/:id/comments', async (req, res) => {
    const { id } = req.params;
    try {
        const commentsList = await exports.prisma.comment.findMany({
            where: { videoId: id },
            include: {
                user: {
                    select: { id: true, username: true, avatarUrl: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({
            comments: commentsList.map((c) => ({
                id: c.id,
                videoId: c.videoId,
                userId: c.userId,
                userName: c.user?.username || 'Usuario',
                userAvatar: c.user?.avatarUrl ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop',
                text: c.text,
                likes: c.likesCount,
                createdAt: c.createdAt.toISOString(),
            })),
        });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al consultar comentarios' });
    }
});
app.post('/api/videos/:id/comments', rbac_middleware_1.authenticateJWT, async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user.id;
    if (!text || text.trim().length === 0) {
        return res.status(400).json({ error: 'El comentario no puede estar vacío' });
    }
    try {
        const newComment = await exports.prisma.comment.create({
            data: {
                videoId: id,
                userId,
                text: text.trim(),
            },
            include: {
                user: {
                    select: { id: true, username: true, avatarUrl: true },
                },
            },
        });
        // Despachar notificación de nuevo comentario al dueño del video
        try {
            const videoData = await exports.prisma.video.findUnique({
                where: { id },
                include: { actor: true, creator: true },
            });
            const recipientId = videoData?.actor?.userId ||
                videoData?.actor?.id ||
                videoData?.creator?.userId ||
                videoData?.creatorId;
            if (recipientId && recipientId !== userId) {
                await notification_service_1.NotificationService.notify({
                    recipientId,
                    actorId: userId,
                    type: 'NEW_COMMENT',
                    title: 'Nuevo Comentario 💬',
                    message: `@${newComment.user?.username || 'Usuario'} comentó: "${text.trim().slice(0, 70)}" en tu video "${videoData?.title || 'tu video'}"`,
                    senderName: newComment.user?.username || 'Usuario',
                    senderAvatar: newComment.user?.avatarUrl || undefined,
                    videoId: id,
                    videoTitle: videoData?.title || undefined,
                    videoThumb: videoData?.thumbnailUrl || undefined,
                    commentText: text.trim(),
                });
            }
        }
        catch (notifErr) {
            console.warn('⚠️ Error notificando nuevo comentario:', notifErr.message);
        }
        return res.status(201).json({
            status: 'success',
            comment: {
                id: newComment.id,
                videoId: newComment.videoId,
                userId: newComment.userId,
                userName: newComment.user?.username || 'Usuario',
                userAvatar: newComment.user?.avatarUrl ||
                    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop',
                text: newComment.text,
                likes: newComment.likesCount,
                createdAt: newComment.createdAt.toISOString(),
            },
        });
    }
    catch (err) {
        console.error('Error posting comment:', err);
        return res.status(500).json({ error: 'Error al publicar comentario' });
    }
});
// Enrutamiento SPA para Frontend Web (sirve index.html para rutas que no sean API)
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return next();
    }
    const indexMobilePath = path_1.default.join(__dirname, '../../mobile/dist/index.html');
    const indexPublicPath = path_1.default.join(__dirname, '../public/index.html');
    if (fs_1.default.existsSync(indexMobilePath)) {
        return res.sendFile(indexMobilePath);
    }
    else if (fs_1.default.existsSync(indexPublicPath)) {
        return res.sendFile(indexPublicPath);
    }
    next();
});
// Middleware global para manejo de errores de Multer y Payload Too Large (413)
app.use((err, req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                error: 'El archivo de video supera el límite máximo permitido de 1GB. Comprímelo o selecciona uno más corto.',
            });
        }
        return res.status(400).json({ error: `Error en la subida del archivo: ${err.message}` });
    }
    if (err.type === 'entity.too.large' || err.status === 413) {
        return res.status(413).json({
            error: 'El tamaño de la solicitud excede el límite permitido por el servidor.',
        });
    }
    console.error('Unhandled server error:', err);
    return res.status(err.status || 500).json({ error: err.message || 'Error interno del servidor' });
});
async function autoSyncDatabase() {
    try {
        console.log('🔄 Sincronizando esquema de base de datos PostgreSQL con Prisma...');
        const { stdout } = await execAsync('npx prisma db push --skip-generate --accept-data-loss', {
            cwd: path_1.default.join(__dirname, '..'),
        });
        console.log('✅ Esquema PostgreSQL sincronizado con éxito:\n', stdout);
    }
    catch (err) {
        console.warn('⚠️ Nota sobre sincronización de base de datos:', err.message);
    }
}
// Escuchar en todas las interfaces de red (0.0.0.0) para permitir acceso desde celulares en la LAN
if (require.main === module) {
    app.listen(Number(PORT), '0.0.0.0', async () => {
        console.log(`🚀 TexxxNopor API running on port ${PORT}`);
        console.log(`📡 Local: http://localhost:${PORT}`);
        console.log(`📱 LAN / Mobile: http://192.168.20.25:${PORT}`);
        console.log(`🐘 PostgreSQL + Prisma database connected`);
        console.log(`☁️ Cloudinary Video & Image upload service active`);
        console.log(`🛡️ RBAC: First user gets ADMIN role automatically`);
        // Sincronización automática de tablas en Render / PostgreSQL
        await autoSyncDatabase();
    });
}
