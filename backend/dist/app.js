"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const multer_1 = __importDefault(require("multer"));
const rbac_middleware_1 = require("./middleware/rbac.middleware");
const rbac_1 = require("./types/rbac");
const cloudinary_service_1 = require("./services/cloudinary.service");
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const emailService_1 = require("./services/emailService");
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-texxxnopor-key';
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Configuración de Multer para procesamiento de archivos en memoria
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: cloudinary_service_1.MAX_VIDEO_SIZE_BYTES,
    },
});
// Helper para extraer hashtags de texto
function extractHashtags(text) {
    if (!text)
        return [];
    const matches = text.match(/#[a-zA-Z0-9_\u00C0-\u017F]+/g);
    return matches ? matches.map((t) => t.toLowerCase()) : [];
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
        videoUrl: v.videoUrl || 'https://res.cloudinary.com/demo/video/upload/sp_hd/sea-turtle.mp4',
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
        creatorName: v.actor?.stageName || 'TexxxNopor Studio',
        creatorAvatar: v.actor?.avatarUrl ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop',
        isLiked: !!isLiked,
        isSaved: !!isSaved,
        commentsCount,
        createdAt: v.createdAt instanceof Date ? v.createdAt.toISOString() : v.createdAt,
    };
}
// ====================================================
// RUTAS DE SALUD Y DIAGNÓSTICO
// ====================================================
app.get('/health', async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ error: 'Error de conexión a PostgreSQL', details: error.message });
    }
});
// ====================================================
// 1. AUTENTICACIÓN Y GESTIÓN DE ROLES (RBAC)
// ====================================================
app.get('/api/auth/bootstrap-status', async (req, res) => {
    try {
        const totalUsers = await prisma.user.count();
        const adminUser = await prisma.user.findFirst({
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
        const assignedRole = isFirstUser ? 'ADMIN' : 'CONSUMER';
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
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
    const { provider, email, name, avatarUrl, age, isOver18 } = req.body;
    if (!provider || !email) {
        return res.status(400).json({ error: 'Proveedor y correo son requeridos' });
    }
    try {
        const normalizedEmail = email.toLowerCase().trim();
        let user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
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
            const assignedRole = isFirstUser ? 'ADMIN' : 'CONSUMER';
            user = await prisma.user.create({
                data: {
                    email: normalizedEmail,
                    username: name || normalizedEmail.split('@')[0],
                    passwordHash: 'social_oauth_login',
                    role: assignedRole,
                    age: parsedAge,
                    authProvider: provider,
                    avatarUrl: avatarUrl ||
                        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop',
                    isVerified: assignedRole === 'ADMIN',
                },
            });
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
        console.error('Error in social auth:', error);
        return res.status(500).json({ error: 'Error en autenticación social' });
    }
});
app.post('/api/auth/login', async (req, res) => {
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
        const emailResult = await (0, emailService_1.sendPasswordRecoveryEmail)(normalizedEmail, user.username, code);
        return res.json({
            status: 'success',
            message: `Hemos enviado un correo a ${normalizedEmail} con tu código de 6 dígitos.`,
            code,
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
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
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
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al obtener videos que te gustan' });
    }
});
// Obtener Historial de Reproducción real
app.get('/api/user/history', rbac_middleware_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
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
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al obtener historial' });
    }
});
// Limpiar Historial de Reproducción
app.delete('/api/user/history', rbac_middleware_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        await prisma.playbackHistory.deleteMany({ where: { userId } });
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
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al obtener lista de ver después' });
    }
});
// ====================================================
// 3. GESTIÓN DE USUARIOS Y ROLES (ADMIN ONLY - POSTGRESQL)
// ====================================================
app.get('/api/admin/users', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
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
        const updated = await prisma.user.update({
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
        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                username: username !== undefined ? username.trim() : undefined,
                avatarUrl: avatarUrl !== undefined ? (avatarUrl || null) : undefined,
            },
        });
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
        const userRecord = await prisma.user.findUnique({ where: { id: userId } });
        const actorRecords = await prisma.actor.findMany({
            where: {
                OR: [
                    { stageName: { equals: userRecord?.username || '', mode: 'insensitive' } },
                    { name: { equals: userRecord?.username || '', mode: 'insensitive' } },
                ],
            },
        });
        const actorIds = actorRecords.map((a) => a.id);
        const userVideos = await prisma.video.findMany({
            where: {
                OR: [
                    { creatorId: userId },
                    { actorId: userId },
                    ...(actorIds.length > 0 ? [{ actorId: { in: actorIds } }] : []),
                ],
            },
            orderBy: { createdAt: 'desc' },
            include: {
                actor: true,
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
    }
    catch (err) {
        console.error('Error deleting user:', err);
        return res.status(500).json({ error: 'Error al eliminar usuario de la base de datos' });
    }
});
// ====================================================
// 4. CRUD DE ACTORES Y ACTRICES (POSTGRESQL + CLOUDINARY)
// ====================================================
app.get('/api/actors', async (req, res) => {
    const currentUserId = req.query.userId;
    try {
        const actorsFromDb = await prisma.actor.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                videos: { select: { id: true } },
                followers: true,
            },
        });
        const actorsList = actorsFromDb.map((a) => ({
            id: a.id,
            name: a.name,
            stageName: a.stageName,
            bio: a.bio || '',
            avatarUrl: a.avatarUrl,
            avatarPublicId: a.avatarPublicId || undefined,
            nationality: a.nationality || 'Internacional',
            isVerified: a.isVerified,
            videosCount: a.videos.length,
            followersCount: a.followers.length,
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
        const actor = await prisma.actor.findUnique({
            where: { id: req.params.id },
            include: {
                videos: true,
                followers: true,
            },
        });
        if (!actor) {
            return res.status(404).json({ error: 'Actor no encontrado' });
        }
        const isFollowing = currentUserId
            ? actor.followers.some((f) => f.followerId === currentUserId)
            : false;
        return res.json({
            actor: {
                id: actor.id,
                name: actor.name,
                stageName: actor.stageName,
                bio: actor.bio || '',
                avatarUrl: actor.avatarUrl,
                avatarPublicId: actor.avatarPublicId || undefined,
                nationality: actor.nationality || 'Internacional',
                isVerified: actor.isVerified,
                videosCount: actor.videos.length,
                followersCount: actor.followers.length,
                isFollowing,
                videos: actor.videos.map((v) => ({
                    id: v.id,
                    title: v.title,
                    description: v.description || '',
                    duration: v.duration,
                    durationSeconds: v.durationSeconds,
                    thumbnailUrl: v.thumbnailUrl,
                    videoUrl: v.videoUrl,
                    views: `${Number(v.viewsCount)} vistas`,
                    likesCount: Number(v.likesCount),
                })),
                createdAt: actor.createdAt.toISOString(),
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al consultar el actor' });
    }
});
app.post('/api/admin/actors', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    const { name, stageName, bio, avatarUrl, avatarPublicId, nationality } = req.body;
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
                avatarUrl: avatarUrl ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop',
                avatarPublicId: avatarPublicId || undefined,
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
    const { name, stageName, bio, avatarUrl, avatarPublicId, nationality, isVerified } = req.body;
    try {
        const updated = await prisma.actor.update({
            where: { id },
            data: {
                name: name !== undefined ? name.trim() : undefined,
                stageName: stageName !== undefined ? stageName.trim() : undefined,
                bio: bio !== undefined ? bio.trim() : undefined,
                avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
                avatarPublicId: avatarPublicId !== undefined ? avatarPublicId : undefined,
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
                avatarPublicId: updated.avatarPublicId,
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
        const actor = await prisma.actor.findUnique({ where: { id } });
        if (!actor) {
            return res.status(404).json({ error: 'Actor no encontrado' });
        }
        if (actor.avatarPublicId) {
            await cloudinary_service_1.CloudinaryService.deleteAsset(actor.avatarPublicId, 'image').catch(() => { });
        }
        await prisma.follow.deleteMany({ where: { actorId: id } });
        await prisma.actor.delete({ where: { id } });
        return res.json({
            status: 'success',
            message: 'Actor eliminado permanentemente de la base de datos',
            actorId: id,
        });
    }
    catch (err) {
        console.error('Error deleting actor:', err);
        return res.status(500).json({ error: 'Error al eliminar el actor' });
    }
});
// ====================================================
// 5. SUBIDAS A CLOUDINARY (VIDEOS E IMÁGENES)
// ====================================================
app.post('/api/admin/upload/video', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN, rbac_1.UserRole.CREATOR), upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se envió ningún archivo de video' });
        }
        const validation = cloudinary_service_1.CloudinaryService.validateVideoFile(req.file.mimetype, req.file.size);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }
        const result = await cloudinary_service_1.CloudinaryService.uploadVideoBuffer(req.file.buffer, req.file.originalname, 'texxxnopor/videos');
        return res.status(200).json({
            status: 'success',
            message: 'Video subido exitosamente a Cloudinary',
            data: {
                secure_url: result.secure_url,
                public_id: result.public_id,
                format: result.format,
                bytes: result.bytes,
                duration: result.duration
                    ? `${Math.floor(result.duration / 60)}:${Math.floor(result.duration % 60)
                        .toString()
                        .padStart(2, '0')}`
                    : '12:00',
                durationSeconds: result.duration || 720,
            },
        });
    }
    catch (err) {
        console.error('Error al subir video a Cloudinary:', err);
        return res.status(500).json({
            error: err.message || 'Error al procesar la subida del video a Cloudinary',
        });
    }
});
app.post('/api/admin/upload/image', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN, rbac_1.UserRole.CREATOR), upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se envió ningún archivo de imagen' });
        }
        const validation = cloudinary_service_1.CloudinaryService.validateImageFile(req.file.mimetype, req.file.size);
        if (!validation.valid) {
            return res.status(400).json({ error: validation.error });
        }
        const result = await cloudinary_service_1.CloudinaryService.uploadImageBuffer(req.file.buffer, req.file.originalname, 'texxxnopor/images');
        return res.status(200).json({
            status: 'success',
            message: 'Imagen subida exitosamente a Cloudinary',
            data: {
                secure_url: result.secure_url,
                public_id: result.public_id,
                format: result.format,
                bytes: result.bytes,
            },
        });
    }
    catch (err) {
        console.error('Error al subir imagen a Cloudinary:', err);
        return res.status(500).json({
            error: err.message || 'Error al procesar la subida de imagen a Cloudinary',
        });
    }
});
app.delete('/api/admin/upload/:publicId', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    const { publicId } = req.params;
    const resourceType = req.query.type || 'video';
    try {
        await cloudinary_service_1.CloudinaryService.deleteAsset(publicId, resourceType);
        return res.json({ status: 'success', message: `Recurso ${publicId} eliminado de Cloudinary` });
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
        let whereClause = {};
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
        const videosFromDb = await prisma.video.findMany({
            where: whereClause,
            orderBy,
            include: {
                actor: true,
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
        const video = await prisma.video.findUnique({
            where: { id: req.params.id },
            include: {
                actor: {
                    include: { followers: true },
                },
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
    const { title, description, duration, durationSeconds, thumbnailUrl, thumbnailPublicId, videoUrl, cloudinaryPublicId, hlsMasterUrl, category, tags, actorId, } = req.body;
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
        const finalVideoUrl = videoUrl || 'https://res.cloudinary.com/demo/video/upload/sp_hd/sea-turtle.mp4';
        const finalHlsUrl = hlsMasterUrl || 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
        // Si no se proporcionó miniatura personalizada, extraer automáticamente fotograma del video
        let finalThumbnailUrl = thumbnailUrl?.trim();
        if (!finalThumbnailUrl) {
            if (cloudinaryPublicId) {
                finalThumbnailUrl = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || 'texxxnopor'}/video/upload/so_1.5,w_800,c_fill,q_auto,f_jpg/${cloudinaryPublicId}.jpg`;
            }
            else if (finalVideoUrl && finalVideoUrl.includes('cloudinary.com')) {
                finalThumbnailUrl = finalVideoUrl.replace(/\.[^/.]+$/, '.jpg');
            }
            else {
                finalThumbnailUrl = finalVideoUrl;
            }
        }
        const userId = req.user.id;
        const userRecord = await prisma.user.findUnique({ where: { id: userId } });
        // Asociar actor si no se pasó explícitamente pero el usuario tiene perfil o nombre de actor
        let assignedActorId = actorId;
        if (!assignedActorId && userRecord) {
            const matchedActor = await prisma.actor.findFirst({
                where: {
                    OR: [
                        { stageName: { equals: userRecord.username, mode: 'insensitive' } },
                        { name: { equals: userRecord.username, mode: 'insensitive' } },
                    ],
                },
            });
            if (matchedActor)
                assignedActorId = matchedActor.id;
        }
        const newVideo = await prisma.video.create({
            data: {
                title: title.trim(),
                description: description ? description.trim() : '',
                duration: duration || '15:00',
                durationSeconds: Number(durationSeconds) || 900,
                thumbnailUrl: finalThumbnailUrl || finalVideoUrl,
                thumbnailPublicId: thumbnailPublicId || undefined,
                videoUrl: finalVideoUrl,
                cloudinaryPublicId: cloudinaryPublicId || undefined,
                hlsMasterUrl: finalHlsUrl,
                actorId: assignedActorId || undefined,
                creatorId: userId,
                categoryId: categoryRecord?.id || undefined,
                tagsList: allTags,
            },
            include: {
                actor: true,
                category: true,
                likes: true,
                favorites: true,
                comments: true,
            },
        });
        const formatted = formatVideoItem(newVideo);
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
app.put('/api/admin/videos/:id', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN, rbac_1.UserRole.CREATOR), async (req, res) => {
    const { id } = req.params;
    const { title, description, category, tags, duration, durationSeconds, thumbnailUrl, thumbnailPublicId, videoUrl, cloudinaryPublicId, actorId, } = req.body;
    try {
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
            let explicitTags = [];
            if (Array.isArray(tags)) {
                explicitTags = tags.map((t) => t.startsWith('#') ? t.toLowerCase() : `#${t.toLowerCase()}`);
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
            video: formatVideoItem(updated),
        });
    }
    catch (err) {
        console.error('Error updating video:', err);
        return res.status(500).json({ error: 'Error al actualizar el video' });
    }
});
// Eliminar Video
app.delete(['/api/admin/videos/:id', '/api/videos/:id'], rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN, rbac_1.UserRole.CREATOR), async (req, res) => {
    const { id } = req.params;
    try {
        const videoToDelete = await prisma.video.findUnique({
            where: { id },
        });
        if (!videoToDelete) {
            return res.status(404).json({ error: 'Video no encontrado en la base de datos' });
        }
        if (videoToDelete.cloudinaryPublicId) {
            await cloudinary_service_1.CloudinaryService.deleteAsset(videoToDelete.cloudinaryPublicId, 'video').catch((e) => console.warn('Cloudinary video delete error:', e.message));
        }
        if (videoToDelete.thumbnailPublicId) {
            await cloudinary_service_1.CloudinaryService.deleteAsset(videoToDelete.thumbnailPublicId, 'image').catch((e) => console.warn('Cloudinary thumb delete error:', e.message));
        }
        await prisma.comment.deleteMany({ where: { videoId: id } });
        await prisma.videoLike.deleteMany({ where: { videoId: id } });
        await prisma.favorite.deleteMany({ where: { videoId: id } });
        await prisma.playbackHistory.deleteMany({ where: { videoId: id } });
        await prisma.videoTag.deleteMany({ where: { videoId: id } });
        await prisma.videoRetentionStat.deleteMany({ where: { videoId: id } });
        await prisma.moderationLog.deleteMany({ where: { videoId: id } });
        await prisma.transcodeJob.deleteMany({ where: { videoId: id } });
        await prisma.video.delete({ where: { id } });
        return res.json({
            status: 'success',
            message: 'Video y recursos de Cloudinary eliminados permanentemente de la base de datos',
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
        }
        else {
            await prisma.videoLike.create({
                data: { userId, videoId: id },
            });
            newLikesCount += 1;
            await prisma.video.update({
                where: { id },
                data: { likesCount: BigInt(newLikesCount) },
            });
            isLiked = true;
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
        }
        else {
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
        }
        else {
            await prisma.follow.create({
                data: {
                    followerId,
                    actorId: actor ? actor.id : undefined,
                    creatorId: !actor ? targetActorId : undefined,
                },
            });
            isFollowing = true;
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
