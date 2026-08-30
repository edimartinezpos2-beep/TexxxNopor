import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateJWT, requireRole } from './middleware/rbac.middleware';
import { UserRole, Actor, VideoModel } from './types/rbac';
import {
  BunnyService,
  ALLOWED_VIDEO_MIMES,
  ALLOWED_IMAGE_MIMES,
  MAX_VIDEO_SIZE_BYTES,
  MAX_IMAGE_SIZE_BYTES,
} from './services/bunny.service';
import { PrismaClient, Role as PrismaRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import { sendPasswordRecoveryEmail } from './services/emailService';
import { NotificationService } from './services/notification.service';

dotenv.config();

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-texxxnopor-key';

export const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || '297210527171-d289elhgeo0raca0dki1f1bsam7ippg0.apps.googleusercontent.com';
export const GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || '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';
export const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '1075098365061413';
export const FACEBOOK_APP_SECRET =
  process.env.FACEBOOK_APP_SECRET || '4025824ae3266629b333b5b7b7d9aae';

const getBackendBaseUrl = (req: Request): string => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  return `${protocol}://${host}`;
};

// Directorios de almacenamiento local permanente para videos e imágenes
export const UPLOADS_DIR = path.join(__dirname, '../uploads');
export const UPLOADS_VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos');
export const UPLOADS_IMAGES_DIR = path.join(UPLOADS_DIR, 'images');
fs.mkdirSync(UPLOADS_VIDEOS_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_IMAGES_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '1024mb' }));
app.use(express.urlencoded({ limit: '1024mb', extended: true }));
app.use('/uploads', express.static(UPLOADS_DIR));

// Streaming de video de alto rendimiento con soporte de HTTP 206 (Partial Content / Ranges)
app.get('/api/stream/video/:filename', (req: Request, res: Response) => {
  const filePath = path.join(UPLOADS_VIDEOS_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Video no encontrado en el servidor' });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// Configuración de Multer para procesamiento de archivos en memoria con límite de 1GB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_VIDEO_SIZE_BYTES,
    fieldSize: 1024 * 1024 * 1024,
  },
});

// Helper para extraer hashtags de texto
function extractHashtags(text?: string): string[] {
  if (!text) return [];
  const matches = text.match(/#[a-zA-Z0-9_\u00C0-\u017F]+/g);
  return matches ? matches.map((t) => t.toLowerCase()) : [];
}

// Helper para asegurar que un usuario tenga Perfil de Creador y Actor
async function ensureCreatorProfileAndActor(userId: string, username: string, avatarUrl?: string | null) {
  let creatorProfile = await prisma.creatorProfile.findUnique({ where: { userId } });
  if (!creatorProfile) {
    creatorProfile = await prisma.creatorProfile.create({
      data: {
        userId,
        stageName: username,
        bio: 'Creador y talento oficial de TexxxNopor.',
      },
    });
  }

  let actor = await prisma.actor.findFirst({
    where: {
      OR: [
        { userId },
        { stageName: { equals: username, mode: 'insensitive' } },
        { name: { equals: username, mode: 'insensitive' } },
      ],
    },
  });

  if (!actor) {
    actor = await prisma.actor.create({
      data: {
        userId,
        name: username,
        stageName: username,
        bio: 'Actor/Actriz verificado de TexxxNopor.',
        avatarUrl:
          avatarUrl ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop',
        bannerUrl:
          'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&auto=format&fit=crop',
        nationality: 'Colombia',
        isVerified: true,
      },
    });
  } else if (!actor.userId) {
    actor = await prisma.actor.update({
      where: { id: actor.id },
      data: { userId },
    });
  }

  return { creatorProfile, actor };
}

// Helper para dar formato consistente a los videos
function formatVideoItem(v: any, currentUserId?: string, userFavorites?: Set<string>) {
  const viewsNum = Number(v.viewsCount || 0);
  const likesNum = Number(v.likesCount || 0);
  const isLiked =
    currentUserId && v.likes
      ? v.likes.some((l: any) => l.userId === currentUserId)
      : false;
  const isSaved =
    currentUserId && userFavorites
      ? userFavorites.has(v.id)
      : currentUserId && v.favorites
      ? v.favorites.some((f: any) => f.userId === currentUserId)
      : false;
  const commentsCount = v.comments ? v.comments.length : (v._count?.comments || 0);

  const creatorDisplayName =
    v.creator?.stageName ||
    v.creator?.user?.username ||
    v.actor?.stageName ||
    'TexxxNopor Studio';

  const creatorDisplayAvatar =
    v.creator?.user?.avatarUrl ||
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
    thumbnailUrl:
      v.thumbnailUrl ||
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
    actorAvatar:
      v.actor?.avatarUrl ||
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
app.get('/health', async (req: Request, res: Response) => {
  try {
    const usersCount = await prisma.user.count();
    const actorsCount = await prisma.actor.count();
    const videosCount = await prisma.video.count();
    const categoriesCount = await prisma.category.count();

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
  } catch (error: any) {
    res.status(500).json({ error: 'Error de conexión a PostgreSQL', details: error.message });
  }
});

// ====================================================
// 1. AUTENTICACIÓN Y GESTIÓN DE ROLES (RBAC)
// ====================================================
app.get('/api/auth/bootstrap-status', async (req: Request, res: Response) => {
  try {
    const totalUsers = await prisma.user.count();
    const adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    const hasAdmin = !!adminUser;
    res.json({
      totalUsers,
      hasAdmin,
      nextRegistrationRole: totalUsers === 0 || !hasAdmin ? UserRole.ADMIN : UserRole.CONSUMER,
    });
  } catch (error: any) {
    console.error('Error in bootstrap-status:', error);
    res.status(500).json({ error: 'Database connection error' });
  }
});

app.post('/api/auth/register', async (req: Request, res: Response) => {
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

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { username: chosenUsername }],
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'El usuario o correo ya existe en la base de datos' });
    }

    const totalUsers = await prisma.user.count();
    const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    const hasAdmin = !!adminUser;

    const isFirstUser = totalUsers === 0 || !hasAdmin;
    const assignedRole: PrismaRole = isFirstUser ? 'ADMIN' : 'CONSUMER';

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
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

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

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
  } catch (error: any) {
    console.error('Error in register:', error);
    return res.status(500).json({ error: 'Error al crear el usuario en la base de datos.' });
  }
});

app.post('/api/auth/social', async (req: Request, res: Response) => {
  const { provider, token: clientToken, idToken, accessToken, email, name, avatarUrl, age, isOver18 } = req.body;

  if (!provider) {
    return res.status(400).json({ error: 'El proveedor de autenticación es requerido' });
  }

  const normalizedProvider = provider.toUpperCase();
  let verifiedEmail = email ? email.toLowerCase().trim() : null;
  let verifiedName = name ? name.trim() : null;
  let verifiedAvatar = avatarUrl || null;
  let providerUserId: string | null = null;

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
      } catch (tokenErr) {
        console.warn('⚠️ [OAuth Backend] Error al validar token de Google:', tokenErr);
      }
    }

    // 2. Verificación oficial con Facebook Graph API
    if (normalizedProvider === 'FACEBOOK' && oauthToken) {
      try {
        const fbRes = await fetch(
          `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${oauthToken}`
        );
        if (fbRes.ok) {
          const fbPayload = await fbRes.json();
          if (fbPayload.id) {
            providerUserId = fbPayload.id;
            verifiedEmail = fbPayload.email ? fbPayload.email.toLowerCase().trim() : verifiedEmail;
            verifiedName = fbPayload.name || verifiedName;
            verifiedAvatar = fbPayload.picture?.data?.url || verifiedAvatar;
          }
        }
      } catch (fbErr) {
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
    let user = await prisma.user.findUnique({
      where: { email: verifiedEmail },
    });

    if (!user) {
      const parsedAge = age ? Number(age) : 18;
      if (parsedAge < 18 || isOver18 === false) {
        return res.status(400).json({
          error: 'Acceso restringido: Debes confirmar que tienes 18 años o más.',
        });
      }

      const totalUsers = await prisma.user.count();
      const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      const hasAdmin = !!adminUser;

      const isFirstUser = totalUsers === 0 || !hasAdmin;
      const assignedRole: PrismaRole = isFirstUser ? 'ADMIN' : 'CONSUMER';

      let baseUsername = (verifiedName || verifiedEmail.split('@')[0])
        .trim()
        .replace(/[^a-zA-Z0-9_]/g, '_');
      if (!baseUsername || baseUsername.length < 3) {
        baseUsername = `user_${Math.floor(1000 + Math.random() * 9000)}`;
      }
      
      let finalUsername = baseUsername;
      const existingUserWithUsername = await prisma.user.findUnique({ where: { username: finalUsername } });
      if (existingUserWithUsername) {
        finalUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
      }

      user = await prisma.user.create({
        data: {
          email: verifiedEmail,
          username: finalUsername,
          passwordHash: `social_oauth_verified_${normalizedProvider}`,
          role: assignedRole,
          age: parsedAge,
          authProvider: normalizedProvider,
          avatarUrl:
            verifiedAvatar ||
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop',
          isVerified: assignedRole === 'ADMIN',
        },
      });
      console.log(`✅ [Social Auth] Nuevo usuario registrado en PostgreSQL: ${user.email} (${user.role})`);
    } else {
      // Si el usuario ya existe, actualizar su avatar o proveedor si aún no lo tiene
      const updates: any = {};
      if (!user.avatarUrl && verifiedAvatar) {
        updates.avatarUrl = verifiedAvatar;
      }
      if (!user.authProvider || user.authProvider === 'LOCAL') {
        updates.authProvider = normalizedProvider;
      }
      if (Object.keys(updates).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updates,
        });
      }
      console.log(`🔑 [Social Auth] Sesión iniciada para usuario existente: ${user.email} (${user.role})`);
    }

    const sessionToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

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
  } catch (error: any) {
    console.error('Error in social auth:', error);
    return res.status(500).json({ error: 'Error en el procesamiento de autenticación social en base de datos.' });
  }
});

// ====================================================
// RENDERERS HTML PARA VENTANA OAUTH DE RETORNO
// ====================================================
function renderOAuthSuccessHtml(token: string, user: any, redirectScheme: string = 'texxxnopor'): string {
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

function renderOAuthErrorHtml(errorMessage: string): string {
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
app.get('/api/auth/google/start', (req: Request, res: Response) => {
  const redirectScheme = (req.query.redirect_scheme as string) || 'texxxnopor';
  const backendBaseUrl = getBackendBaseUrl(req);
  const callbackUrl = `${backendBaseUrl}/api/auth/google/callback`;
  const state = Buffer.from(JSON.stringify({ redirectScheme, origin: backendBaseUrl })).toString('base64');

  const googleAuthUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('openid email profile')}` +
    `&state=${encodeURIComponent(state)}` +
    `&prompt=select_account` +
    `&access_type=offline`;

  console.log('🔵 [Google OAuth Start] Redirigiendo a Google con callback:', callbackUrl);
  return res.redirect(googleAuthUrl);
});

app.get('/api/auth/google/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  let redirectScheme = 'texxxnopor';
  if (state && typeof state === 'string') {
    try {
      const parsedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
      redirectScheme = parsedState.redirectScheme || redirectScheme;
    } catch {}
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
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
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
    let user = await prisma.user.findUnique({
      where: { email: verifiedEmail },
    });

    if (!user) {
      const totalUsers = await prisma.user.count();
      const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      const hasAdmin = !!adminUser;
      const isFirstUser = totalUsers === 0 || !hasAdmin;
      const assignedRole: PrismaRole = isFirstUser ? 'ADMIN' : 'CONSUMER';

      let baseUsername = verifiedName.replace(/[^a-zA-Z0-9_]/g, '_');
      if (!baseUsername || baseUsername.length < 3) baseUsername = `user_${Math.floor(1000 + Math.random() * 9000)}`;
      let finalUsername = baseUsername;
      const existingUser = await prisma.user.findUnique({ where: { username: finalUsername } });
      if (existingUser) {
        finalUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
      }

      user = await prisma.user.create({
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
    } else {
      if (!user.avatarUrl && verifiedAvatar) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: verifiedAvatar, authProvider: user.authProvider || 'GOOGLE' },
        });
      }
      console.log(`🔑 [Google OAuth Callback] Sesión para usuario existente en PostgreSQL: ${user.email} (${user.role})`);
    }

    const sessionToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

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
  } catch (error: any) {
    console.error('Error en Google Callback:', error);
    return res.status(500).send(renderOAuthErrorHtml(error.message || 'Error interno en Google OAuth.'));
  }
});

// ====================================================
// RUTAS OAUTH OFICIALES DE FACEBOOK (START & CALLBACK)
// ====================================================
app.get('/api/auth/facebook/start', (req: Request, res: Response) => {
  const redirectScheme = (req.query.redirect_scheme as string) || 'texxxnopor';
  const backendBaseUrl = getBackendBaseUrl(req);
  const callbackUrl = `${backendBaseUrl}/api/auth/facebook/callback`;
  const state = Buffer.from(JSON.stringify({ redirectScheme, origin: backendBaseUrl })).toString('base64');

  const fbAuthUrl =
    `https://www.facebook.com/v19.0/dialog/oauth?` +
    `client_id=${encodeURIComponent(FACEBOOK_APP_ID)}` +
    `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent('public_profile')}` +
    `&state=${encodeURIComponent(state)}`;

  console.log('🔷 [Facebook OAuth Start] Redirigiendo a Facebook con callback:', callbackUrl);
  return res.redirect(fbAuthUrl);
});

app.get('/api/auth/facebook/callback', async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;

  let redirectScheme = 'texxxnopor';
  if (state && typeof state === 'string') {
    try {
      const parsedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
      redirectScheme = parsedState.redirectScheme || redirectScheme;
    } catch {}
  }

  if (error || !code || typeof code !== 'string') {
    return res.status(400).send(renderOAuthErrorHtml(error_description ? String(error_description) : 'Autorización cancelada con Facebook.'));
  }

  try {
    const backendBaseUrl = getBackendBaseUrl(req);
    const callbackUrl = `${backendBaseUrl}/api/auth/facebook/callback`;

    // 1. Intercambiar código por Access Token
    const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${encodeURIComponent(FACEBOOK_APP_ID)}&redirect_uri=${encodeURIComponent(callbackUrl)}&client_secret=${encodeURIComponent(FACEBOOK_APP_SECRET)}&code=${encodeURIComponent(code)}`;
    const tokenRes = await fetch(tokenUrl);

    if (!tokenRes.ok) {
      const errData = await tokenRes.json().catch(() => ({}));
      console.error('❌ [Facebook Callback] Error obteniendo access_token:', errData);
      return res.status(400).send(renderOAuthErrorHtml('No se pudo verificar la autorización con Facebook.'));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Obtener perfil de usuario desde Graph API
    const fbRes = await fetch(
      `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(accessToken)}`
    );
    const fbData = await fbRes.json();

    if (fbData.error) {
      return res.status(400).send(renderOAuthErrorHtml(fbData.error.message || 'Error al obtener datos de Facebook.'));
    }

    const verifiedEmail = fbData.email ? fbData.email.toLowerCase().trim() : `fb_${fbData.id}@texxxnopor.com`;
    const verifiedName = fbData.name || 'Usuario Facebook';
    const verifiedAvatar = fbData.picture?.data?.url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop';

    // 3. Persistir o recuperar en PostgreSQL
    let user = await prisma.user.findUnique({
      where: { email: verifiedEmail },
    });

    if (!user) {
      const totalUsers = await prisma.user.count();
      const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      const hasAdmin = !!adminUser;
      const isFirstUser = totalUsers === 0 || !hasAdmin;
      const assignedRole: PrismaRole = isFirstUser ? 'ADMIN' : 'CONSUMER';

      let baseUsername = verifiedName.replace(/[^a-zA-Z0-9_]/g, '_');
      if (!baseUsername || baseUsername.length < 3) baseUsername = `user_${Math.floor(1000 + Math.random() * 9000)}`;
      let finalUsername = baseUsername;
      const existingUser = await prisma.user.findUnique({ where: { username: finalUsername } });
      if (existingUser) {
        finalUsername = `${baseUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
      }

      user = await prisma.user.create({
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
    } else {
      if (!user.avatarUrl && verifiedAvatar) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: verifiedAvatar, authProvider: user.authProvider || 'FACEBOOK' },
        });
      }
      console.log(`🔑 [Facebook OAuth Callback] Sesión para usuario existente en PostgreSQL: ${user.email} (${user.role})`);
    }

    const sessionToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

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
  } catch (error: any) {
    console.error('Error en Facebook Callback:', error);
    return res.status(500).send(renderOAuthErrorHtml(error.message || 'Error interno en Facebook OAuth.'));
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch && user.passwordHash !== password) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

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
  } catch (error: any) {
    console.error('Error in login:', error);
    return res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

app.get('/api/auth/me', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
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
  } catch (error) {
    return res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// RECUPERACIÓN DE CONTRASEÑA CON CÓDIGO DE VERIFICACIÓN (6 DÍGITOS)
app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'El correo electrónico es obligatorio' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(404).json({ error: 'No existe ninguna cuenta registrada con este correo electrónico' });
    }

    // Generar código numérico seguro de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // Válido por 15 minutos

    await prisma.user.update({
      where: { email: normalizedEmail },
      data: {
        resetPasswordCode: code,
        resetCodeExpiresAt: expiresAt,
      },
    });

    console.log(`🔑 [Recuperar Contraseña] Código para ${normalizedEmail}: ${code}`);

    // Enviar correo con plantilla HTML llamativa con logo y código de 6 dígitos
    const emailResult = await sendPasswordRecoveryEmail(normalizedEmail, user.username, code);

    return res.json({
      status: 'success',
      message: `Hemos enviado un correo a ${normalizedEmail} con tu código de 6 dígitos.`,
      previewUrl: emailResult.previewUrl,
    });
  } catch (error: any) {
    console.error('Error in forgot-password:', error);
    return res.status(500).json({ error: 'Error al procesar la solicitud de recuperación de contraseña' });
  }
});

app.post('/api/auth/verify-reset-code', async (req: Request, res: Response) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'El correo y el código son requeridos' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
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
  } catch (error: any) {
    return res.status(500).json({ error: 'Error al verificar el código' });
  }
});

app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, código y nueva contraseña son obligatorios' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (!user.resetPasswordCode || user.resetPasswordCode !== code.trim()) {
      return res.status(400).json({ error: 'El código de verificación es inválido' });
    }

    if (!user.resetCodeExpiresAt || user.resetCodeExpiresAt < new Date()) {
      return res.status(400).json({ error: 'El código de verificación ha expirado. Solicita uno nuevo.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
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
  } catch (error: any) {
    console.error('Error in reset-password:', error);
    return res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
});

// ====================================================
// 2. ESTADÍSTICAS Y ACTIVIDAD DEL USUARIO (CONTADORES REALES EN DB)
// ====================================================
app.get('/api/user/stats', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Contadores reales calculados desde la base de datos (inician en 0 para todo usuario nuevo)
    const [subscriptionsCount, likedVideosCount, historyCount, watchLaterCount] =
      await Promise.all([
        prisma.follow.count({ where: { followerId: userId } }),
        prisma.videoLike.count({ where: { userId } }),
        prisma.playbackHistory.count({ where: { userId } }),
        prisma.favorite.count({ where: { userId } }),
      ]);

    return res.json({
      subscriptionsCount,
      likedVideosCount,
      historyCount,
      watchLaterCount,
    });
  } catch (err: any) {
    console.error('Error getting user stats:', err);
    return res.status(500).json({ error: 'Error al obtener estadísticas del usuario' });
  }
});

// Obtener Suscripciones reales del usuario
app.get('/api/user/subscriptions', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const follows = await prisma.follow.findMany({
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
        id: f.actor!.id,
        name: f.actor!.stageName,
        avatar: f.actor!.avatarUrl,
        videos: f.actor!.videos.length,
        isFollowed: true,
      }));

    return res.json({ subscriptions });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al obtener suscripciones' });
  }
});

// Obtener Videos que le gustan al usuario
app.get('/api/user/likes', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const likes = await prisma.videoLike.findMany({
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
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al obtener videos que te gustan' });
  }
});

// Obtener Historial de Reproducción real
app.get('/api/user/history', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const history = await prisma.playbackHistory.findMany({
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
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// Limpiar Historial de Reproducción
app.delete('/api/user/history', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    await prisma.playbackHistory.deleteMany({ where: { userId } });
    return res.json({ status: 'success', message: 'Historial eliminado con éxito' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al limpiar historial' });
  }
});

// Obtener Lista de "Ver Después" / Favoritos
app.get('/api/user/favorites', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const favorites = await prisma.favorite.findMany({
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
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al obtener lista de ver después' });
  }
});

// Obtener listas de reproducción creadas por el usuario autenticado
app.get('/api/user/playlists', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const playlists = await prisma.playlist.findMany({
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
      coverUrl:
        pl.coverUrl ||
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
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al consultar listas del usuario' });
  }
});

// Suscribirse a Plan Premium (Simulación y Registro en DB)
app.post('/api/user/subscribe-premium', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { plan, paymentMethod, amount } = req.body;

    // Actualizar usuario a verificado / premium
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    });

    return res.json({
      status: 'success',
      message: '¡Felicidades! Tu suscripción Premium ha sido activada con éxito.',
      user: {
        id: updated.id,
        email: updated.email,
        username: updated.username,
        role: updated.role,
        isVerified: updated.isVerified,
        avatarUrl: updated.avatarUrl,
      },
      transaction: {
        id: `tx_${Date.now()}`,
        plan: plan || '1_month',
        paymentMethod: paymentMethod || 'CREDIT_CARD',
        amount: amount || 9.99,
        date: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('Error in subscribe-premium:', err);
    return res.status(500).json({ error: 'Error al procesar la suscripción Premium' });
  }
});

// ====================================================
// NOTIFICACIONES EN TIEMPO REAL (SEGUIDORES, LIKES, COMENTARIOS)
// ====================================================

// Obtener Notificaciones del usuario / actor autenticado
app.get('/api/user/notifications', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const actor = await prisma.actor.findFirst({ where: { userId } });
    const actorId = actor ? actor.id : undefined;

    const [userNotifs, actorNotifs] = await Promise.all([
      NotificationService.getForUser(userId),
      actorId ? NotificationService.getForUser(actorId) : Promise.resolve({ unreadCount: 0, notifications: [] }),
    ]);

    const combined = [...userNotifs.notifications, ...actorNotifs.notifications];
    const uniqueMap = new Map();
    combined.forEach((n) => uniqueMap.set(n.id, n));
    const allNotifs = Array.from(uniqueMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const unreadCount = allNotifs.filter((n) => !n.read).length;

    return res.json({ unreadCount, notifications: allNotifs });
  } catch (err: any) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({ error: 'Error al consultar notificaciones' });
  }
});

// Marcar notificación individual como leída
app.patch('/api/user/notifications/:id/read', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    await NotificationService.markAsRead(id, userId);
    return res.json({ status: 'success', id });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al marcar notificación' });
  }
});

// Marcar todas las notificaciones como leídas
app.post('/api/user/notifications/read-all', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const actor = await prisma.actor.findFirst({ where: { userId } });
    await NotificationService.markAllAsRead(userId);
    if (actor) await NotificationService.markAllAsRead(actor.id);
    return res.json({ status: 'success', message: 'Todas las notificaciones marcadas como leídas' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al marcar notificaciones' });
  }
});

// ====================================================
// 3. GESTIÓN DE USUARIOS Y ROLES (ADMIN ONLY - POSTGRESQL)
// ====================================================
app.get(
  '/api/admin/users',
  authenticateJWT,
  requireRole(UserRole.ADMIN),
  async (req: Request, res: Response) => {
    try {
      const users = await prisma.user.findMany({
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
    } catch (err: any) {
      console.error('Error fetching admin users:', err);
      return res.status(500).json({ error: 'Error al obtener lista de usuarios' });
    }
  }
);

app.patch(
  '/api/admin/users/:id/role',
  authenticateJWT,
  requireRole(UserRole.ADMIN),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['ADMIN', 'CREATOR', 'CONSUMER'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido proporcionado' });
    }

    try {
      const updated = await prisma.user.update({
        where: { id },
        data: {
          role: role as PrismaRole,
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
    } catch (err: any) {
      console.error('Error updating user role:', err);
      return res.status(500).json({ error: 'No se pudo actualizar el rol del usuario' });
    }
  }
);

// Actualizar perfil de usuario (Foto de perfil, username)
app.patch('/api/user/profile', authenticateJWT, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { username, avatarUrl } = req.body;

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        username: username !== undefined ? username.trim() : undefined,
        avatarUrl: avatarUrl !== undefined ? (avatarUrl || null) : undefined,
      },
    });

    // Sincronizar con el perfil de Actor asociado si existe
    if (avatarUrl !== undefined) {
      await prisma.actor.updateMany({
        where: { userId },
        data: { avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop' },
      }).catch(() => {});
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
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al actualizar el perfil' });
  }
});

// Obtener videos subidos por el usuario actual
app.get('/api/user/my-videos', authenticateJWT, async (req: Request, res: Response) => {
  const userId = req.user!.id;

  try {
    const userRecord = await prisma.user.findUnique({
      where: { id: userId },
      include: { creatorProfile: true },
    });

    const actorRecords = await prisma.actor.findMany({
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

    const orConditions: any[] = [];
    if (creatorProfileId) {
      orConditions.push({ creatorId: creatorProfileId });
    }
    if (actorIds.length > 0) {
      orConditions.push({ actorId: { in: actorIds } });
    }
    orConditions.push({ creatorId: userId });
    orConditions.push({ actorId: userId });

    const userVideos = await prisma.video.findMany({
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
  } catch (err: any) {
    console.error('Error in /api/user/my-videos:', err);
    return res.status(500).json({ error: 'Error al consultar videos subidos' });
  }
});

// Eliminar usuario permanentemente (ADMIN ONLY)
app.delete(
  '/api/admin/users/:id',
  authenticateJWT,
  requireRole(UserRole.ADMIN),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const requestingAdminId = req.user!.id;

    if (id === requestingAdminId) {
      return res.status(400).json({
        error: 'Por seguridad, no puedes eliminar tu propia cuenta de Administrador principal.',
      });
    }

    try {
      const userToDelete = await prisma.user.findUnique({ where: { id } });
      if (!userToDelete) {
        return res.status(404).json({ error: 'Usuario no encontrado en la base de datos' });
      }

      // Eliminar relaciones en cascada para evitar restricciones de clave foránea
      await prisma.comment.deleteMany({ where: { userId: id } });
      await prisma.videoLike.deleteMany({ where: { userId: id } });
      await prisma.favorite.deleteMany({ where: { userId: id } });
      await prisma.playbackHistory.deleteMany({ where: { userId: id } });
      await prisma.follow.deleteMany({ where: { followerId: id } });
      await prisma.moderationLog.deleteMany({ where: { adminId: id } });
      await prisma.creatorProfile.deleteMany({ where: { userId: id } });

      await prisma.user.delete({ where: { id } });

      return res.json({
        status: 'success',
        message: `Usuario ${userToDelete.username} (${userToDelete.email}) eliminado permanentemente.`,
        userId: id,
      });
    } catch (err: any) {
      console.error('Error deleting user:', err);
      return res.status(500).json({ error: 'Error al eliminar usuario de la base de datos' });
    }
  }
);

// ====================================================
// 4. CRUD DE ACTORES Y ACTRICES (POSTGRESQL + STORAGE)
// ====================================================
app.get('/api/actors', async (req: Request, res: Response) => {
  const currentUserId = req.query.userId as string | undefined;

  try {
    const actorsFromDb = await prisma.actor.findMany({
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
      bannerUrl:
        a.bannerUrl ||
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
  } catch (err: any) {
    console.error('Error fetching actors:', err);
    return res.status(500).json({ error: 'Error al consultar actores en la base de datos' });
  }
});

app.get('/api/actors/:id', async (req: Request, res: Response) => {
  const currentUserId = req.query.userId as string | undefined;

  try {
    const actor = await prisma.actor.findUnique({
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
    const actorOrConditions: any[] = [{ actorId: actor.id }];
    if (actor.userId) {
      actorOrConditions.push({ creatorId: actor.userId });
      actorOrConditions.push({ actorId: actor.userId });
    }
    if (creatorProfileId) {
      actorOrConditions.push({ creatorId: creatorProfileId });
    }

    const actorVideos = await prisma.video.findMany({
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
      coverUrl:
        pl.coverUrl ||
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
        bannerUrl:
          actor.bannerUrl ||
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
  } catch (err: any) {
    console.error('Error in GET /api/actors/:id:', err);
    return res.status(500).json({ error: 'Error al consultar el actor' });
  }
});

// Editar perfil de actriz/actor (por el propio actor, creador o administrador)
app.put(
  '/api/actors/:id',
  authenticateJWT,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const {
      name,
      stageName,
      bio,
      avatarUrl,
      avatarPublicId,
      bannerUrl,
      bannerPublicId,
      nationality,
      isVerified,
    } = req.body;

    try {
      const existingActor = await prisma.actor.findUnique({ where: { id } });
      if (!existingActor) {
        return res.status(404).json({ error: 'Actor no encontrado' });
      }

      const currentUser = await prisma.user.findUnique({ where: { id: req.user!.id } });
      const isOwner = existingActor.userId === req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';
      const isCreator = req.user!.role === 'CREATOR';
      const isMatchingName = currentUser && (
        existingActor.stageName.toLowerCase() === currentUser.username.toLowerCase() ||
        existingActor.name.toLowerCase() === currentUser.username.toLowerCase()
      );

      // Permitir si es admin, creador, dueño o coincide el nombre de usuario
      if (!isOwner && !isAdmin && !isCreator && !isMatchingName && existingActor.userId) {
        return res.status(403).json({ error: 'No tienes permisos para editar este perfil' });
      }

      // Si stageName cambia, verificar que no esté ocupado por otro
      if (stageName && stageName.trim() !== existingActor.stageName) {
        const duplicate = await prisma.actor.findUnique({ where: { stageName: stageName.trim() } });
        if (duplicate && duplicate.id !== id) {
          return res.status(400).json({ error: 'El nombre artístico ya está en uso por otra persona' });
        }
      }

      // Si el actor no tenía userId vinculado, vincularlo al usuario actual
      const shouldLinkUserId = !existingActor.userId ? req.user!.id : undefined;

      const updated = await prisma.actor.update({
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
    } catch (err: any) {
      console.error('Error updating actor profile:', err);
      return res.status(500).json({ error: 'Error al actualizar el perfil' });
    }
  }
);

// Gestión de Playlists del Actor
app.get('/api/actors/:id/playlists', async (req: Request, res: Response) => {
  try {
    const playlists = await prisma.playlist.findMany({
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
      coverUrl:
        pl.coverUrl ||
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
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al consultar listas' });
  }
});

app.post(
  '/api/actors/:id/playlists',
  authenticateJWT,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, coverUrl, isPrivate, videoIds } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'El título de la lista es obligatorio' });
    }

    try {
      const actor = await prisma.actor.findUnique({ where: { id } });
      if (!actor) {
        return res.status(404).json({ error: 'Actor no encontrado' });
      }

      const isOwner = actor.userId === req.user!.id;
      const isAdmin = req.user!.role === 'ADMIN';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'No tienes permiso para crear listas para este actor' });
      }

      const newPlaylist = await prisma.playlist.create({
        data: {
          actorId: id,
          userId: req.user!.id,
          title: title.trim(),
          description: description?.trim() || '',
          coverUrl: coverUrl || undefined,
          isPrivate: Boolean(isPrivate),
          items:
            Array.isArray(videoIds) && videoIds.length > 0
              ? {
                  create: videoIds.map((vId: string, idx: number) => ({
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
    } catch (err: any) {
      console.error('Error creating playlist:', err);
      return res.status(500).json({ error: 'Error al crear la lista de reproducción' });
    }
  }
);

app.delete(
  '/api/playlists/:id',
  authenticateJWT,
  async (req: Request, res: Response) => {
    try {
      const pl = await prisma.playlist.findUnique({ where: { id: req.params.id } });
      if (!pl) return res.status(404).json({ error: 'Lista no encontrada' });

      if (pl.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
        return res.status(403).json({ error: 'No tienes permiso para eliminar esta lista' });
      }

      await prisma.playlistItem.deleteMany({ where: { playlistId: pl.id } });
      await prisma.playlist.delete({ where: { id: pl.id } });

      return res.json({ status: 'success', message: 'Lista eliminada correctamente' });
    } catch (err: any) {
      return res.status(500).json({ error: 'Error al eliminar la lista' });
    }
  }
);

app.post(
  '/api/admin/actors',
  authenticateJWT,
  requireRole(UserRole.ADMIN),
  async (req: Request, res: Response) => {
    const { name, stageName, bio, avatarUrl, avatarPublicId, bannerUrl, bannerPublicId, nationality } = req.body;

    if (!stageName || !stageName.trim()) {
      return res.status(400).json({ error: 'El nombre artístico (stageName) es obligatorio' });
    }

    try {
      const existing = await prisma.actor.findUnique({
        where: { stageName: stageName.trim() },
      });

      if (existing) {
        return res.status(400).json({ error: 'Ya existe un actor con ese nombre artístico' });
      }

      const newActor = await prisma.actor.create({
        data: {
          name: name?.trim() || stageName.trim(),
          stageName: stageName.trim(),
          bio: bio?.trim() || 'Actor verificado de la plataforma TexxxNopor.',
          avatarUrl:
            avatarUrl ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop',
          avatarPublicId: avatarPublicId || undefined,
          bannerUrl:
            bannerUrl ||
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
    } catch (err: any) {
      console.error('Error creating actor:', err);
      return res.status(500).json({ error: 'Error al crear el actor en la base de datos' });
    }
  }
);

app.put(
  '/api/admin/actors/:id',
  authenticateJWT,
  requireRole(UserRole.ADMIN),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, stageName, bio, avatarUrl, avatarPublicId, bannerUrl, bannerPublicId, nationality, isVerified } = req.body;

    try {
      const updated = await prisma.actor.update({
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
    } catch (err: any) {
      console.error('Error updating actor:', err);
      return res.status(500).json({ error: 'Error al actualizar el actor' });
    }
  }
);

app.delete(
  '/api/admin/actors/:id',
  authenticateJWT,
  requireRole(UserRole.ADMIN),
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const actor = await prisma.actor.findUnique({ where: { id } });
      if (!actor) {
        return res.status(404).json({ error: 'Actor no encontrado' });
      }

      // 1. Buscar todos los videos asociados al actor (por actorId o por userId del creador)
      const actorVideos = await prisma.video.findMany({
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
          await BunnyService.deleteAsset(video.cloudinaryPublicId).catch((e: any) =>
            console.warn(`[Bunny.net] Error al eliminar video ${video.cloudinaryPublicId}:`, e.message)
          );
        }
        if (video.thumbnailPublicId) {
          await BunnyService.deleteAsset(video.thumbnailPublicId).catch((e: any) =>
            console.warn(`[Bunny.net] Error al eliminar miniatura ${video.thumbnailPublicId}:`, e.message)
          );
        }

        // Eliminar archivos locales si existen
        if (video.videoUrl && video.videoUrl.includes('/uploads/videos/')) {
          const localVidName = video.videoUrl.split('/uploads/videos/').pop();
          if (localVidName) {
            const localVidPath = path.join(UPLOADS_VIDEOS_DIR, localVidName);
            if (fs.existsSync(localVidPath)) {
              try { fs.unlinkSync(localVidPath); } catch (_) {}
            }
          }
        }

        // Eliminar relaciones en la base de datos
        await prisma.comment.deleteMany({ where: { videoId: video.id } });
        await prisma.videoLike.deleteMany({ where: { videoId: video.id } });
        await prisma.favorite.deleteMany({ where: { videoId: video.id } });
        await prisma.playbackHistory.deleteMany({ where: { videoId: video.id } });
        await prisma.videoTag.deleteMany({ where: { videoId: video.id } });
        await prisma.videoRetentionStat.deleteMany({ where: { videoId: video.id } });
        await prisma.moderationLog.deleteMany({ where: { videoId: video.id } });
        await prisma.transcodeJob.deleteMany({ where: { videoId: video.id } });
        await prisma.playlistItem.deleteMany({ where: { videoId: video.id } });
        await prisma.video.delete({ where: { id: video.id } });
      }

      // 3. Eliminar playlists creadas por este actor
      await prisma.playlistItem.deleteMany({
        where: { playlist: { actorId: id } },
      });
      await prisma.playlist.deleteMany({ where: { actorId: id } });

      // 4. Eliminar fotos de avatar y banner del actor en almacenamiento externo
      if (actor.avatarPublicId) {
        await BunnyService.deleteAsset(actor.avatarPublicId).catch(() => {});
      }
      if (actor.bannerPublicId) {
        await BunnyService.deleteAsset(actor.bannerPublicId).catch(() => {});
      }

      // 5. Eliminar followers y el registro del actor
      await prisma.follow.deleteMany({ where: { actorId: id } });
      await prisma.actor.delete({ where: { id } });

      return res.json({
        status: 'success',
        message: `Actor '${actor.stageName}' y sus ${actorVideos.length} videos fueron eliminados permanentemente.`,
        actorId: id,
        deletedVideosCount: actorVideos.length,
      });
    } catch (err: any) {
      console.error('Error deleting actor:', err);
      return res.status(500).json({ error: 'Error al eliminar el actor y sus videos' });
    }
  }
);

// ====================================================
// 5. SUBIDAS DE MULTIMEDIA (LOCAL STREAMING + BUNNY.NET)
// ====================================================
app.post(
  ['/api/admin/upload/video', '/api/upload/video'],
  authenticateJWT,
  upload.single('video'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se envió ningún archivo de video' });
      }

      const validation = BunnyService.validateVideoFile(req.file.mimetype, req.file.size);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      // 1. Guardar video localmente para streaming inmediato
      const cleanName = path.parse(req.file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, '') || 'video';
      const localFilename = `vid_${Date.now()}_${cleanName}.mp4`;
      const localFilePath = path.join(UPLOADS_VIDEOS_DIR, localFilename);
      fs.writeFileSync(localFilePath, req.file.buffer);

      const serverHost = req.get('host') || '192.168.20.25:4000';
      const localStreamUrl = `http://${serverHost}/api/stream/video/${localFilename}`;

      console.log(`📹 Video guardado localmente: ${localFilePath} (${req.file.size} bytes)`);

      // 2. Generar miniatura automática desde el fotograma del video (segundo 3)
      let autoThumbnailUrl: string | undefined;
      let autoThumbnailPublicId: string | undefined;

      console.log('🖼️ Extrayendo miniatura automática del video...');
      const thumbResult = await BunnyService.extractThumbnailFromBuffer(req.file.buffer, 1);
      if (thumbResult) {
        // Guardar miniatura localmente
        const thumbLocalPath = path.join(UPLOADS_IMAGES_DIR, thumbResult.filename);
        fs.writeFileSync(thumbLocalPath, thumbResult.buffer);
        const thumbLocalUrl = `http://${serverHost}/uploads/images/${thumbResult.filename}`;

        // Intentar subir miniatura a Bunny.net
        try {
          const bunnyThumb = await BunnyService.uploadImageBuffer(
            thumbResult.buffer,
            thumbResult.filename,
            'thumbnails'
          );
          autoThumbnailUrl = bunnyThumb.secure_url;
          autoThumbnailPublicId = bunnyThumb.public_id;
          console.log(`✅ Miniatura subida a Bunny.net: ${autoThumbnailUrl}`);
        } catch (_e: any) {
          autoThumbnailUrl = thumbLocalUrl;
          autoThumbnailPublicId = `local_${thumbResult.filename}`;
          console.log(`📍 Miniatura guardada localmente: ${thumbLocalUrl}`);
        }
      } else {
        console.log('⚠️ No se pudo extraer miniatura; se usará la URL del video como referencia.');
      }

      // 3. Subir video a Bunny.net Storage & CDN en segundo plano
      let bunnyResult: any = null;
      try {
        bunnyResult = await BunnyService.uploadVideoBuffer(
          req.file.buffer,
          req.file.originalname,
          'videos'
        );
      } catch (bunnyErr: any) {
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
    } catch (err: any) {
      console.error('Error al procesar subida de video:', err);
      return res.status(500).json({
        error: err.message || 'Error al procesar la subida del video',
      });
    }
  }
);

app.post(
  '/api/admin/upload/image',
  authenticateJWT,
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se envió ningún archivo de imagen' });
      }

      const validation = BunnyService.validateImageFile(req.file.mimetype, req.file.size);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      const cleanName = path.parse(req.file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, '') || 'image';
      const ext = path.parse(req.file.originalname).ext || '.jpg';
      const localFilename = `img_${Date.now()}_${cleanName}${ext}`;
      const localFilePath = path.join(UPLOADS_IMAGES_DIR, localFilename);
      fs.writeFileSync(localFilePath, req.file.buffer);

      const serverHost = req.get('host') || '192.168.20.25:4000';
      const localImageUrl = `http://${serverHost}/uploads/images/${localFilename}`;

      let bunnyResult: any = null;
      try {
        bunnyResult = await BunnyService.uploadImageBuffer(
          req.file.buffer,
          req.file.originalname,
          'images'
        );
      } catch (bunnyErr: any) {
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
    } catch (err: any) {
      console.error('Error al subir imagen:', err);
      return res.status(500).json({
        error: err.message || 'Error al procesar la subida de imagen',
      });
    }
  }
);

app.post(
  '/api/upload/image',
  authenticateJWT,
  upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No se envió ningún archivo de imagen' });
      }

      const validation = BunnyService.validateImageFile(req.file.mimetype, req.file.size);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      const cleanName = path.parse(req.file.originalname).name.replace(/[^a-zA-Z0-9_-]/g, '') || 'image';
      const ext = path.parse(req.file.originalname).ext || '.jpg';
      const localFilename = `img_${Date.now()}_${cleanName}${ext}`;
      const localFilePath = path.join(UPLOADS_IMAGES_DIR, localFilename);
      fs.writeFileSync(localFilePath, req.file.buffer);

      const serverHost = req.get('host') || '192.168.20.25:4000';
      const localImageUrl = `http://${serverHost}/uploads/images/${localFilename}`;

      let bunnyResult: any = null;
      try {
        bunnyResult = await BunnyService.uploadImageBuffer(
          req.file.buffer,
          req.file.originalname,
          'images'
        );
      } catch (bunnyErr: any) {
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
    } catch (err: any) {
      console.error('Error al subir imagen:', err);
      return res.status(500).json({
        error: err.message || 'Error al procesar la subida de imagen',
      });
    }
  }
);

app.delete(
  '/api/admin/upload/:publicId',
  authenticateJWT,
  requireRole(UserRole.ADMIN),
  async (req: Request, res: Response) => {
    const { publicId } = req.params;

    try {
      await BunnyService.deleteAsset(publicId);
      return res.json({ status: 'success', message: `Recurso ${publicId} eliminado de Bunny.net` });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
);

// ====================================================
// 6. CRUD DE VIDEOS (CATEGORÍAS Y HASHTAGS DE BÚSQUEDA)
// ====================================================
// Público (Espectadores y Admin) con soporte de categorías y hashtags
app.get('/api/videos', async (req: Request, res: Response) => {
  const currentUserId = req.query.userId as string | undefined;
  const categoryFilter = req.query.category as string | undefined;
  const searchFilter = req.query.q as string | undefined;
  const tagFilter = req.query.tag as string | undefined;

  try {
    let whereClause: any = {
      status: 'READY',
    };

    // Filtrar por Categoría específica si no es 'Para ti' o 'Todos'
    if (
      categoryFilter &&
      categoryFilter.trim() !== '' &&
      categoryFilter !== 'Para ti' &&
      categoryFilter !== 'Todos'
    ) {
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
    let orderBy: any = { createdAt: 'desc' };
    if (categoryFilter === 'Más videos' || categoryFilter === 'Más vistos') {
      orderBy = { viewsCount: 'desc' };
    }

    const videosFromDb = await prisma.video.findMany({
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
  } catch (err: any) {
    console.error('Error fetching videos from DB:', err);
    return res.status(500).json({ error: 'Error al consultar videos en la base de datos' });
  }
});

app.get('/api/videos/:id', async (req: Request, res: Response) => {
  const currentUserId = req.query.userId as string | undefined;

  try {
    const video = await prisma.video.findUnique({
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
    const isFollowingActor =
      currentUserId && video.actor
        ? video.actor.followers.some((f) => f.followerId === currentUserId)
        : false;

    const commentsList = video.comments.map((c) => ({
      id: c.id,
      videoId: c.videoId,
      userId: c.userId,
      userName: c.user?.username || 'Usuario',
      userAvatar:
        c.user?.avatarUrl ||
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
  } catch (err: any) {
    console.error('Error fetching video detail:', err);
    return res.status(500).json({ error: 'Error al consultar el video' });
  }
});

// Crear Video con Categoría y Hashtags
app.post(
  '/api/admin/videos',
  authenticateJWT,
  requireRole(UserRole.ADMIN, UserRole.CREATOR),
  async (req: Request, res: Response) => {
    const {
      title,
      description,
      duration,
      durationSeconds,
      thumbnailUrl,
      thumbnailPublicId,
      videoUrl,
      cloudinaryPublicId,
      hlsMasterUrl,
      category,
      tags,
      actorId,
      isFollowersOnly,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'El título del video es obligatorio' });
    }

    try {
      // 1. Categoría
      let categoryRecord = null;
      const catName = category?.trim() || 'Para ti';
      const slug = catName.toLowerCase().replace(/\s+/g, '-');

      categoryRecord = await prisma.category.upsert({
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
      let explicitTags: string[] = [];
      if (Array.isArray(tags)) {
        explicitTags = tags.map((t: string) =>
          t.startsWith('#') ? t.toLowerCase() : `#${t.toLowerCase()}`
        );
      } else if (typeof tags === 'string' && tags.trim()) {
        explicitTags = tags
          .split(/[\s,]+/)
          .filter(Boolean)
          .map((t) => (t.startsWith('#') ? t.toLowerCase() : `#${t.toLowerCase()}`));
      }

      // Añadir la categoría como hashtag por defecto para búsquedas
      const categoryTag = `#${slug.replace(/-/g, '')}`;
      const allTags = Array.from(
        new Set([...explicitTags, ...extractedTags, categoryTag])
      );

      const finalVideoUrl = videoUrl?.trim() || '';
      const finalHlsUrl = hlsMasterUrl?.trim() || finalVideoUrl;

      // Miniatura
      let finalThumbnailUrl = thumbnailUrl?.trim();
      let finalThumbnailPublicId = thumbnailPublicId?.trim();

      if (!finalThumbnailUrl && finalVideoUrl) {
        // Intentar extraer captura del archivo de video local si existe
        const videoFilename = finalVideoUrl.split('/').pop()?.split('?')[0];
        if (videoFilename && fs.existsSync(path.join(UPLOADS_VIDEOS_DIR, videoFilename))) {
          try {
            const localVideoPath = path.join(UPLOADS_VIDEOS_DIR, videoFilename);
            const videoBuf = fs.readFileSync(localVideoPath);
            const thumbResult = await BunnyService.extractThumbnailFromBuffer(videoBuf, 2);
            if (thumbResult) {
              const thumbLocalPath = path.join(UPLOADS_IMAGES_DIR, thumbResult.filename);
              fs.writeFileSync(thumbLocalPath, thumbResult.buffer);
              const serverHost = req.get('host') || '192.168.20.25:4000';
              finalThumbnailUrl = `http://${serverHost}/uploads/images/${thumbResult.filename}`;
              finalThumbnailPublicId = `local_${thumbResult.filename}`;
              console.log(`🖼️ [Auto-Thumbnail] Generada miniatura automática para video: ${finalThumbnailUrl}`);
            }
          } catch (tErr: any) {
            console.warn('[Auto-Thumbnail] Error generando miniatura:', tErr.message);
          }
        }
      }

      if (!finalThumbnailUrl) {
        finalThumbnailUrl = 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800&auto=format&fit=crop';
      }

      const userId = req.user!.id;
      const userRecord = await prisma.user.findUnique({ where: { id: userId } });
      const { creatorProfile, actor: defaultActor } = await ensureCreatorProfileAndActor(
        userId,
        userRecord?.username || 'Usuario',
        userRecord?.avatarUrl
      );

      // Asociar actor si no se pasó explícitamente
      const assignedActorId = actorId || defaultActor.id;
      const assignedCreatorId = creatorProfile.id;

      const newVideo = await prisma.video.create({
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
    } catch (err: any) {
      console.error('Error creating video:', err);
      return res.status(500).json({ error: 'Error al registrar el video en la base de datos' });
    }
  }
);

// Editar Video
// Editar Video
app.put(
  ['/api/admin/videos/:id', '/api/videos/:id'],
  authenticateJWT,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const {
      title,
      description,
      category,
      tags,
      duration,
      durationSeconds,
      thumbnailUrl,
      thumbnailPublicId,
      videoUrl,
      cloudinaryPublicId,
      actorId,
      status,
    } = req.body;

    try {
      const existingVideo = await prisma.video.findUnique({
        where: { id },
        include: { creator: true, actor: true },
      });

      if (!existingVideo) {
        return res.status(404).json({ error: 'Video no encontrado' });
      }

      const isOwner =
        existingVideo.creator?.userId === userId ||
        existingVideo.actor?.userId === userId ||
        existingVideo.creatorId === userId;

      if (userRole !== 'ADMIN' && !isOwner) {
        return res.status(403).json({ error: 'No tienes permiso para editar este video' });
      }

      let categoryIdToUpdate = undefined;
      let newTagsList = undefined;

      if (category && category.trim()) {
        const slug = category.trim().toLowerCase().replace(/\s+/g, '-');
        const cat = await prisma.category.upsert({
          where: { slug },
          update: {},
          create: { name: category.trim(), slug },
        });
        categoryIdToUpdate = cat.id;
      }

      if (tags !== undefined || title !== undefined || description !== undefined) {
        const extractedTags = extractHashtags(`${title || ''} ${description || ''}`);
        let explicitTags: string[] = [];
        if (Array.isArray(tags)) {
          explicitTags = tags.map((t: string) =>
            t.startsWith('#') ? t.toLowerCase() : `#${t.toLowerCase()}`
          );
        }
        newTagsList = Array.from(new Set([...explicitTags, ...extractedTags]));
      }

      const updated = await prisma.video.update({
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
    } catch (err: any) {
      console.error('Error updating video:', err);
      return res.status(500).json({ error: 'Error al actualizar el video' });
    }
  }
);

// Cambiar estado del video (READY, FLAGGED, REJECTED) para pausar/bloquear temporalmente
app.patch('/api/videos/:id/status', authenticateJWT, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'READY', 'FLAGGED', 'REJECTED'
  const userId = req.user!.id;
  const userRole = req.user!.role;

  try {
    const video = await prisma.video.findUnique({
      where: { id },
      include: { creator: true, actor: true },
    });

    if (!video) {
      return res.status(404).json({ error: 'Video no encontrado' });
    }

    const isOwner =
      video.creator?.userId === userId ||
      video.actor?.userId === userId ||
      video.creatorId === userId;

    if (userRole !== 'ADMIN' && !isOwner) {
      return res.status(403).json({ error: 'No tienes permiso para modificar el estado de este video' });
    }

    const validStatuses = ['READY', 'FLAGGED', 'REJECTED', 'PROCESSING', 'UPLOADING'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    const updated = await prisma.video.update({
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
  } catch (err: any) {
    console.error('Error updating video status:', err);
    return res.status(500).json({ error: 'Error al actualizar el estado del video' });
  }
});

// Eliminar Video (Admin o Propietario del Video)
app.delete(
  ['/api/admin/videos/:id', '/api/videos/:id'],
  authenticateJWT,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    try {
      const videoToDelete = await prisma.video.findUnique({
        where: { id },
        include: { creator: true, actor: true },
      });

      if (!videoToDelete) {
        return res.status(404).json({ error: 'Video no encontrado en la base de datos' });
      }

      const isOwner =
        videoToDelete.creator?.userId === userId ||
        videoToDelete.actor?.userId === userId ||
        videoToDelete.creatorId === userId;

      if (userRole !== 'ADMIN' && !isOwner) {
        return res.status(403).json({ error: 'No tienes permiso para eliminar este video' });
      }

      if (videoToDelete.cloudinaryPublicId) {
        await BunnyService.deleteAsset(videoToDelete.cloudinaryPublicId).catch(
          (e: any) => console.warn('Bunny.net video delete error:', e.message)
        );
      }
      if (videoToDelete.thumbnailPublicId) {
        await BunnyService.deleteAsset(videoToDelete.thumbnailPublicId).catch(
          (e: any) => console.warn('Bunny.net thumb delete error:', e.message)
        );
      }

      // Eliminar archivos locales si existen
      if (videoToDelete.videoUrl && videoToDelete.videoUrl.includes('/uploads/videos/')) {
        const localVidName = videoToDelete.videoUrl.split('/uploads/videos/').pop();
        if (localVidName) {
          const localVidPath = path.join(UPLOADS_VIDEOS_DIR, localVidName);
          if (fs.existsSync(localVidPath)) {
            try { fs.unlinkSync(localVidPath); } catch (_) {}
          }
        }
      }

      await prisma.comment.deleteMany({ where: { videoId: id } });
      await prisma.videoLike.deleteMany({ where: { videoId: id } });
      await prisma.favorite.deleteMany({ where: { videoId: id } });
      await prisma.playbackHistory.deleteMany({ where: { videoId: id } });
      await prisma.videoTag.deleteMany({ where: { videoId: id } });
      await prisma.videoRetentionStat.deleteMany({ where: { videoId: id } });
      await prisma.moderationLog.deleteMany({ where: { videoId: id } });
      await prisma.transcodeJob.deleteMany({ where: { videoId: id } });
      await prisma.playlistItem.deleteMany({ where: { videoId: id } });

      await prisma.video.delete({ where: { id } });

      return res.json({
        status: 'success',
        message: 'Video eliminado permanentemente de la base de datos y almacenamiento',
        videoId: id,
      });
    } catch (err: any) {
      console.error('Error deleting video:', err);
      return res.status(500).json({ error: 'Error al eliminar el video de la base de datos' });
    }
  }
);

// ====================================================
// 7. SISTEMA DE LIKES, FAVORITOS (VER DESPUÉS), HISTORIAL Y SEGUIMIENTO
// ====================================================
app.post('/api/videos/:id/like', authenticateJWT, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;

  try {
    const video = await prisma.video.findUnique({ where: { id } });
    if (!video) {
      return res.status(404).json({ error: 'Video no encontrado' });
    }

    const existingLike = await prisma.videoLike.findUnique({
      where: {
        userId_videoId: { userId, videoId: id },
      },
    });

    let isLiked = false;
    let newLikesCount = Number(video.likesCount);

    if (existingLike) {
      await prisma.videoLike.delete({
        where: { userId_videoId: { userId, videoId: id } },
      });
      newLikesCount = Math.max(0, newLikesCount - 1);
      await prisma.video.update({
        where: { id },
        data: { likesCount: BigInt(newLikesCount) },
      });
      isLiked = false;
    } else {
      await prisma.videoLike.create({
        data: { userId, videoId: id },
      });
      newLikesCount += 1;
      await prisma.video.update({
        where: { id },
        data: { likesCount: BigInt(newLikesCount) },
      });
      isLiked = true;

      // Despachar notificación al creador o actriz/actor del video
      try {
        const videoWithOwner = await prisma.video.findUnique({
          where: { id },
          include: { actor: true, creator: true },
        });
        const likerUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { username: true, avatarUrl: true },
        });

        const recipientId =
          videoWithOwner?.actor?.userId ||
          videoWithOwner?.actor?.id ||
          videoWithOwner?.creator?.userId ||
          videoWithOwner?.creatorId;

        if (recipientId && recipientId !== userId) {
          await NotificationService.notify({
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
      } catch (notifErr: any) {
        console.warn('⚠️ Error enviando notificación de like:', notifErr.message);
      }
    }

    return res.json({
      status: 'success',
      videoId: id,
      isLiked,
      likesCount: newLikesCount,
    });
  } catch (err: any) {
    console.error('Error in toggle like:', err);
    return res.status(500).json({ error: 'Error al registrar el like' });
  }
});

// Guardar / Quitar de "Ver después" (Favoritos)
app.post(
  ['/api/videos/:id/favorite', '/api/videos/:id/watch-later'],
  authenticateJWT,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;

    try {
      const existing = await prisma.favorite.findUnique({
        where: {
          userId_videoId: { userId, videoId: id },
        },
      });

      let isSaved = false;

      if (existing) {
        await prisma.favorite.delete({
          where: { userId_videoId: { userId, videoId: id } },
        });
        isSaved = false;
      } else {
        await prisma.favorite.create({
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
    } catch (err: any) {
      console.error('Error in toggle favorite:', err);
      return res.status(500).json({ error: 'Error al guardar video en favoritos' });
    }
  }
);

// Registrar reproducción en Historial y sumar vista
app.post('/api/videos/:id/history', authenticateJWT, async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const { stoppedAtSec } = req.body;

  try {
    await prisma.playbackHistory.upsert({
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

    await prisma.video.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });

    return res.json({ status: 'success', message: 'Historial registrado' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al registrar historial' });
  }
});

// Seguir / Dejar de seguir a un Actor o Creador (Suscripciones)
app.post(
  ['/api/creators/:creatorId/follow', '/api/actors/:creatorId/follow'],
  authenticateJWT,
  async (req: Request, res: Response) => {
    const { creatorId } = req.params;
    const followerId = req.user!.id;

    try {
      // Buscar actor correspondiente
      const actor = await prisma.actor.findFirst({
        where: {
          OR: [{ id: creatorId }, { stageName: creatorId }],
        },
      });

      const targetActorId = actor ? actor.id : creatorId;

      const existing = await prisma.follow.findFirst({
        where: {
          followerId,
          OR: [{ actorId: targetActorId }, { creatorId: targetActorId }],
        },
      });

      let isFollowing = false;

      if (existing) {
        await prisma.follow.delete({ where: { id: existing.id } });
        isFollowing = false;
      } else {
        await prisma.follow.create({
          data: {
            followerId,
            actorId: actor ? actor.id : undefined,
            creatorId: !actor ? targetActorId : undefined,
          },
        });
        isFollowing = true;

        // Despachar notificación de nuevo seguidor al actor/creador
        try {
          const followerUser = await prisma.user.findUnique({
            where: { id: followerId },
            select: { username: true, avatarUrl: true },
          });

          const recipientId = actor?.userId || actor?.id || targetActorId;

          if (recipientId && recipientId !== followerId) {
            await NotificationService.notify({
              recipientId,
              actorId: followerId,
              type: 'NEW_FOLLOWER',
              title: 'Nuevo Seguidor 👤',
              message: `@${followerUser?.username || 'Un usuario'} comenzó a seguirte`,
              senderName: followerUser?.username || 'Usuario',
              senderAvatar: followerUser?.avatarUrl || undefined,
            });
          }
        } catch (notifErr: any) {
          console.warn('⚠️ Error notificando nuevo seguidor:', notifErr.message);
        }
      }

      // Conteo real de seguidores en base de datos
      const followersCount = await prisma.follow.count({
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
    } catch (err: any) {
      console.error('Error in toggle follow:', err);
      return res.status(500).json({ error: 'Error al seguir creador' });
    }
  }
);

// Comentarios
app.get('/api/videos/:id/comments', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const commentsList = await prisma.comment.findMany({
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
        userAvatar:
          c.user?.avatarUrl ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop',
        text: c.text,
        likes: c.likesCount,
        createdAt: c.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Error al consultar comentarios' });
  }
});

app.post('/api/videos/:id/comments', authenticateJWT, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { text } = req.body;
  const userId = req.user!.id;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: 'El comentario no puede estar vacío' });
  }

  try {
    const newComment = await prisma.comment.create({
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
      const videoData = await prisma.video.findUnique({
        where: { id },
        include: { actor: true, creator: true },
      });

      const recipientId =
        videoData?.actor?.userId ||
        videoData?.actor?.id ||
        videoData?.creator?.userId ||
        videoData?.creatorId;

      if (recipientId && recipientId !== userId) {
        await NotificationService.notify({
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
    } catch (notifErr: any) {
      console.warn('⚠️ Error notificando nuevo comentario:', notifErr.message);
    }

    return res.status(201).json({
      status: 'success',
      comment: {
        id: newComment.id,
        videoId: newComment.videoId,
        userId: newComment.userId,
        userName: newComment.user?.username || 'Usuario',
        userAvatar:
          newComment.user?.avatarUrl ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop',
        text: newComment.text,
        likes: newComment.likesCount,
        createdAt: newComment.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error('Error posting comment:', err);
    return res.status(500).json({ error: 'Error al publicar comentario' });
  }
});

// Middleware global para manejo de errores de Multer y Payload Too Large (413)
app.use((err: any, req: Request, res: Response, next: any) => {
  if (err instanceof multer.MulterError) {
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

// Escuchar en todas las interfaces de red (0.0.0.0) para permitir acceso desde celulares en la LAN
if (require.main === module) {
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 TexxxNopor API running on port ${PORT}`);
    console.log(`📡 Local: http://localhost:${PORT}`);
    console.log(`📱 LAN / Mobile: http://192.168.20.25:${PORT}`);
    console.log(`🐘 PostgreSQL + Prisma database connected`);
    console.log(`☁️ Cloudinary Video & Image upload service active`);
    console.log(`🛡️ RBAC: First user gets ADMIN role automatically`);
  });
}

export { app };
