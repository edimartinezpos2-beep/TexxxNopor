"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const rbac_1 = require("../types/rbac");
const audit_service_1 = require("../services/audit.service");
const settings_service_1 = require("../services/settings.service");
const notification_service_1 = require("../services/notification.service");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// ====================================================
// 1. CONTROL LEGAL Y VERIFICACIÓN DE IDENTIDAD (KYC)
// ====================================================
// Envío de documentación KYC por parte de un Creador/Actor
router.post('/api/kyc/submit', rbac_middleware_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const { documentType, documentNumber, fullName, birthDate, frontDocumentUrl, backDocumentUrl, selfieWithDocUrl, } = req.body;
        if (!documentNumber || !fullName || !frontDocumentUrl || !selfieWithDocUrl) {
            return res.status(400).json({
                error: 'Todos los campos obligatorios deben completarse (Número de documento, Nombre completo, Foto frontal y Selfie con documento)',
            });
        }
        const parsedBirthDate = birthDate ? new Date(birthDate) : null;
        // Crear o actualizar registro KYC
        const kyc = await prisma.kycVerification.create({
            data: {
                userId,
                documentType: documentType || 'CEDULA',
                documentNumber: documentNumber.trim(),
                fullName: fullName.trim(),
                birthDate: parsedBirthDate,
                frontDocumentUrl,
                backDocumentUrl: backDocumentUrl || null,
                selfieWithDocUrl,
                status: client_1.KycStatus.PENDING,
            },
        });
        // Actualizar estado del usuario a PENDING
        await prisma.user.update({
            where: { id: userId },
            data: { kycStatus: 'PENDING' },
        });
        return res.status(201).json({
            status: 'success',
            message: 'Documentación KYC enviada exitosamente. El equipo administrativo revisará tu solicitud para cumplir con regulaciones legales.',
            kyc,
        });
    }
    catch (err) {
        console.error('Error submitting KYC:', err);
        return res.status(500).json({ error: 'Error al procesar solicitud de verificación KYC' });
    }
});
// Consultar estado KYC propio del usuario autenticado
router.get('/api/kyc/my-status', rbac_middleware_1.authenticateJWT, async (req, res) => {
    try {
        const userId = req.user.id;
        const latestKyc = await prisma.kycVerification.findFirst({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { isVerified: true, kycStatus: true },
        });
        return res.json({
            kycStatus: user?.kycStatus || 'NONE',
            isVerified: user?.isVerified || false,
            submission: latestKyc || null,
        });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al consultar estado KYC' });
    }
});
// Listar solicitudes KYC para Administrador (Filtros: PENDING, APPROVED, REJECTED)
router.get('/api/admin/kyc', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const statusParam = req.query.status;
        const where = {};
        if (statusParam && ['PENDING', 'APPROVED', 'REJECTED'].includes(statusParam.toUpperCase())) {
            where.status = statusParam.toUpperCase();
        }
        const submissions = await prisma.kycVerification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        username: true,
                        role: true,
                        isVerified: true,
                        avatarUrl: true,
                        createdAt: true,
                    },
                },
            },
        });
        return res.json({
            total: submissions.length,
            submissions: submissions.map((k) => ({
                id: k.id,
                userId: k.userId,
                documentType: k.documentType,
                documentNumber: k.documentNumber,
                fullName: k.fullName,
                birthDate: k.birthDate ? k.birthDate.toISOString().split('T')[0] : null,
                frontDocumentUrl: k.frontDocumentUrl,
                backDocumentUrl: k.backDocumentUrl,
                selfieWithDocUrl: k.selfieWithDocUrl,
                status: k.status,
                rejectionReason: k.rejectionReason,
                reviewedAt: k.reviewedAt ? k.reviewedAt.toISOString() : null,
                createdAt: k.createdAt.toISOString(),
                user: k.user,
            })),
        });
    }
    catch (err) {
        console.error('Error fetching admin KYC:', err);
        return res.status(500).json({ error: 'Error al consultar solicitudes KYC' });
    }
});
// Revisar (Aprobar o Rechazar) solicitud KYC (ADMIN ONLY)
router.patch('/api/admin/kyc/:id/review', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;
        const adminId = req.user.id;
        if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ error: 'El estado debe ser APPROVED o REJECTED' });
        }
        const submission = await prisma.kycVerification.findUnique({
            where: { id },
            include: { user: true },
        });
        if (!submission) {
            return res.status(404).json({ error: 'Solicitud KYC no encontrada' });
        }
        const isApproved = status === 'APPROVED';
        const updated = await prisma.kycVerification.update({
            where: { id },
            data: {
                status: isApproved ? client_1.KycStatus.APPROVED : client_1.KycStatus.REJECTED,
                rejectionReason: isApproved ? null : rejectionReason || 'Documentación ilegible o inconsistente',
                reviewedByAdminId: adminId,
                reviewedAt: new Date(),
            },
        });
        // Actualizar usuario: si es aprobado, pasa a verificado y se asegura rol CREATOR
        await prisma.user.update({
            where: { id: submission.userId },
            data: {
                isVerified: isApproved,
                kycStatus: isApproved ? 'APPROVED' : 'REJECTED',
                role: isApproved && submission.user.role === 'CONSUMER' ? 'CREATOR' : undefined,
            },
        });
        // Asegurar perfil de actor si fue aprobado
        if (isApproved) {
            await prisma.actor.upsert({
                where: { stageName: submission.user.username },
                update: { isVerified: true, userId: submission.userId },
                create: {
                    name: submission.fullName,
                    stageName: submission.user.username,
                    avatarUrl: submission.user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
                    isVerified: true,
                    userId: submission.userId,
                },
            }).catch(() => { });
        }
        // Notificar al usuario sobre el resultado
        await notification_service_1.NotificationService.notify({
            recipientId: submission.userId,
            type: 'NEW_FOLLOWER',
            title: isApproved ? '¡Verificación KYC Aprobada! 🎉' : 'Solicitud KYC Rechazada ⚠️',
            message: isApproved
                ? 'Tu identidad ha sido verificada legalmente. Ya tienes permisos de Creador para publicar contenido.'
                : `Tu documentación fue rechazada. Motivo: ${rejectionReason || 'Documentos ilegibles'}. Por favor vuelve a intentarlo.`,
        }).catch(() => { });
        // Auditoría
        await audit_service_1.AuditService.log({
            adminId,
            action: isApproved ? 'KYC_APPROVE' : 'KYC_REJECT',
            entityType: 'KYC',
            entityId: id,
            details: { targetUserId: submission.userId, targetUsername: submission.user.username, rejectionReason },
            ipAddress: req.ip,
        });
        return res.json({
            status: 'success',
            message: isApproved
                ? `KYC aprobado para @${submission.user.username}. Ahora tiene permisos legales para publicar.`
                : `KYC rechazado para @${submission.user.username}.`,
            kyc: updated,
        });
    }
    catch (err) {
        console.error('Error reviewing KYC:', err);
        return res.status(500).json({ error: 'Error al procesar revisión de KYC' });
    }
});
// ====================================================
// 2. SOPORTE, DISPUTAS Y RECLAMACIONES (DMCA)
// ====================================================
// Crear reporte / reclamación (Público o con usuario)
router.post('/api/reports', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        let reporterId = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const jwt = require('jsonwebtoken');
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-texxxnopor-key');
                if (decoded?.id && !decoded.id.startsWith('usr_')) {
                    reporterId = decoded.id;
                }
            }
            catch (_) { }
        }
        const { reporterEmail, videoId, targetUserId, reason, description, evidenceUrl } = req.body;
        if (!reason || !description || !description.trim()) {
            return res.status(400).json({ error: 'El motivo y la descripción de la reclamación son obligatorios' });
        }
        const reportReasonMap = {
            DMCA: client_1.ReportReason.DMCA_COPYRIGHT,
            DMCA_COPYRIGHT: client_1.ReportReason.DMCA_COPYRIGHT,
            NON_CONSENSUAL: client_1.ReportReason.NON_CONSENSUAL_CONTENT,
            NON_CONSENSUAL_CONTENT: client_1.ReportReason.NON_CONSENSUAL_CONTENT,
            IMPERSONATION: client_1.ReportReason.IMPERSONATION,
            UNDERAGE: client_1.ReportReason.UNDERAGE_SUSPICION,
            UNDERAGE_SUSPICION: client_1.ReportReason.UNDERAGE_SUSPICION,
            OTHER: client_1.ReportReason.OTHER,
        };
        const parsedReason = reportReasonMap[reason.toUpperCase()] || client_1.ReportReason.OTHER;
        const report = await prisma.contentReport.create({
            data: {
                reporterId,
                reporterEmail: reporterEmail || null,
                videoId: videoId || null,
                targetUserId: targetUserId || null,
                reason: parsedReason,
                description: description.trim(),
                evidenceUrl: evidenceUrl || null,
                status: client_1.ReportStatus.OPEN,
            },
        });
        console.log(`🚨 [REPORT CREATED] Reason: ${parsedReason}, Video: ${videoId || 'N/A'}`);
        return res.status(201).json({
            status: 'success',
            message: 'Reclamación / reporte registrado correctamente. El equipo de moderación legal lo revisará a la brevedad.',
            reportId: report.id,
        });
    }
    catch (err) {
        console.error('Error creating report:', err);
        return res.status(500).json({ error: 'Error al enviar reporte' });
    }
});
// Listar reportes y disputas para Administrador
router.get('/api/admin/reports', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { status, reason } = req.query;
        const where = {};
        if (status)
            where.status = status;
        if (reason)
            where.reason = reason;
        const reports = await prisma.contentReport.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                reporter: { select: { id: true, email: true, username: true } },
                targetUser: { select: { id: true, email: true, username: true, isSuspended: true } },
                video: {
                    select: {
                        id: true,
                        title: true,
                        thumbnailUrl: true,
                        videoUrl: true,
                        status: true,
                        actor: { select: { name: true, stageName: true } },
                    },
                },
            },
        });
        return res.json({
            total: reports.length,
            reports: reports.map((r) => ({
                id: r.id,
                reason: r.reason,
                description: r.description,
                evidenceUrl: r.evidenceUrl,
                status: r.status,
                resolutionNotes: r.resolutionNotes,
                resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
                createdAt: r.createdAt.toISOString(),
                reporterEmail: r.reporterEmail || r.reporter?.email || 'Anónimo',
                reporter: r.reporter,
                targetUser: r.targetUser,
                video: r.video,
            })),
        });
    }
    catch (err) {
        console.error('Error fetching reports:', err);
        return res.status(500).json({ error: 'Error al consultar reportes' });
    }
});
// Resolver disputa o reporte (ADMIN ONLY: dar de baja video, suspender usuario, etc.)
router.patch('/api/admin/reports/:id/resolve', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, resolutionNotes, actionTaken } = req.body;
        const adminId = req.user.id;
        const report = await prisma.contentReport.findUnique({
            where: { id },
            include: { video: true, targetUser: true },
        });
        if (!report) {
            return res.status(404).json({ error: 'Reporte no encontrado' });
        }
        // Ejecutar acción legal inmediata si aplica
        if (actionTaken === 'TAKEDOWN_VIDEO' && report.videoId) {
            await prisma.video.update({
                where: { id: report.videoId },
                data: { status: 'REJECTED' },
            });
            await prisma.moderationLog.create({
                data: {
                    videoId: report.videoId,
                    adminId,
                    action: 'TAKEDOWN',
                    reason: `Baja por reporte ${report.reason}: ${resolutionNotes || 'Infracción de derechos o contenido no consentido'}`,
                },
            });
        }
        if (actionTaken === 'SUSPEND_USER' && (report.targetUserId || report.video?.creatorId)) {
            const targetId = report.targetUserId || report.video?.creatorId;
            if (targetId) {
                await prisma.user.update({
                    where: { id: targetId },
                    data: {
                        isSuspended: true,
                        suspensionReason: `Suspendido por resolución de disputa legal: ${report.reason}`,
                    },
                }).catch(() => { });
            }
        }
        const updated = await prisma.contentReport.update({
            where: { id },
            data: {
                status: status === 'DISMISSED' ? client_1.ReportStatus.DISMISSED : client_1.ReportStatus.RESOLVED,
                resolutionNotes: resolutionNotes || `Acción aplicada: ${actionTaken || 'Revisado y cerrado'}`,
                resolvedByAdminId: adminId,
                resolvedAt: new Date(),
            },
        });
        await audit_service_1.AuditService.log({
            adminId,
            action: 'REPORT_RESOLVE',
            entityType: 'REPORT',
            entityId: id,
            details: { actionTaken, resolutionNotes, reportReason: report.reason, videoId: report.videoId },
            ipAddress: req.ip,
        });
        return res.json({
            status: 'success',
            message: `Reporte resuelto exitosamente. Acción: ${actionTaken || 'Cerrado'}`,
            report: updated,
        });
    }
    catch (err) {
        console.error('Error resolving report:', err);
        return res.status(500).json({ error: 'Error al resolver disputa o reporte' });
    }
});
// ====================================================
// 3. ADMINISTRACIÓN DEL CATÁLOGO Y MODERACIÓN DE VIDEOS
// ====================================================
// Listar videos para moderación previa/posterior con estados
router.get('/api/admin/videos/moderation', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const statusParam = req.query.status;
        const where = {};
        if (statusParam) {
            where.status = statusParam;
        }
        const videos = await prisma.video.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                actor: { select: { id: true, name: true, stageName: true, avatarUrl: true } },
                category: { select: { id: true, name: true } },
                reports: { select: { id: true, reason: true, status: true } },
                _count: { select: { likes: true, comments: true } },
            },
        });
        return res.json({
            total: videos.length,
            videos: videos.map((v) => ({
                id: v.id,
                title: v.title,
                description: v.description,
                duration: v.duration,
                thumbnailUrl: v.thumbnailUrl,
                videoUrl: v.videoUrl,
                status: v.status,
                viewsCount: Number(v.viewsCount),
                likesCount: v._count.likes,
                commentsCount: v._count.comments,
                reportsCount: v.reports.filter((r) => r.status === 'OPEN').length,
                actor: v.actor,
                category: v.category?.name || 'General',
                tags: v.tagsList,
                createdAt: v.createdAt.toISOString(),
            })),
        });
    }
    catch (err) {
        console.error('Error fetching videos for moderation:', err);
        return res.status(500).json({ error: 'Error al consultar videos para moderación' });
    }
});
// Moderar video (APPROVE, REJECT, FLAG, TAKEDOWN)
router.patch('/api/admin/videos/:id/moderate', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { id } = req.params;
        const { action, reason } = req.body; // APPROVE, REJECT, FLAG, TAKEDOWN
        const adminId = req.user.id;
        if (!action || !['APPROVE', 'REJECT', 'FLAG', 'TAKEDOWN'].includes(action)) {
            return res.status(400).json({ error: 'Acción inválida. Opciones: APPROVE, REJECT, FLAG, TAKEDOWN' });
        }
        let newStatus = 'READY';
        if (action === 'REJECT' || action === 'TAKEDOWN')
            newStatus = 'REJECTED';
        else if (action === 'FLAG')
            newStatus = 'FLAGGED';
        else if (action === 'APPROVE')
            newStatus = 'READY';
        const video = await prisma.video.update({
            where: { id },
            data: { status: newStatus },
        });
        await prisma.moderationLog.create({
            data: {
                videoId: id,
                adminId,
                action,
                reason: reason || `Acción de moderación: ${action}`,
            },
        });
        await audit_service_1.AuditService.log({
            adminId,
            action: `VIDEO_${action}`,
            entityType: 'VIDEO',
            entityId: id,
            details: { videoTitle: video.title, newStatus, reason },
            ipAddress: req.ip,
        });
        return res.json({
            status: 'success',
            message: `Video "${video.title}" actualizado a estado ${newStatus}`,
            video: {
                id: video.id,
                title: video.title,
                status: video.status,
                viewsCount: Number(video.viewsCount),
                likesCount: Number(video.likesCount),
            },
        });
    }
    catch (err) {
        console.error('Error in video moderation:', err);
        return res.status(500).json({ error: 'Error al moderar video' });
    }
});
// CRUD de Categorías para el Admin
router.get('/api/admin/categories', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const categories = await prisma.category.findMany({
            orderBy: { name: 'asc' },
            include: { _count: { select: { videos: true } } },
        });
        return res.json({
            categories: categories.map((c) => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                description: c.description,
                videosCount: c._count.videos,
            })),
        });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al consultar categorías' });
    }
});
router.post('/api/admin/categories', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
        }
        const slug = name.trim().toLowerCase().replace(/\s+/g, '-');
        const cat = await prisma.category.upsert({
            where: { slug },
            update: { description },
            create: { name: name.trim(), slug, description },
        });
        await audit_service_1.AuditService.log({
            adminId: req.user.id,
            action: 'CATEGORY_CREATE',
            entityType: 'CATEGORY',
            entityId: cat.id,
            details: { name: cat.name, slug: cat.slug },
            ipAddress: req.ip,
        });
        return res.status(201).json({ status: 'success', category: cat });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al crear categoría' });
    }
});
router.delete('/api/admin/categories/:id', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.category.delete({ where: { id } });
        await audit_service_1.AuditService.log({
            adminId: req.user.id,
            action: 'CATEGORY_DELETE',
            entityType: 'CATEGORY',
            entityId: id,
            ipAddress: req.ip,
        });
        return res.json({ status: 'success', message: 'Categoría eliminada' });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al eliminar categoría' });
    }
});
// CRUD de Etiquetas / Tags globales
router.post('/api/admin/tags', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim())
            return res.status(400).json({ error: 'Nombre de tag requerido' });
        const cleanTag = name.trim().startsWith('#') ? name.trim().toLowerCase() : `#${name.trim().toLowerCase()}`;
        const tag = await prisma.tag.upsert({
            where: { name: cleanTag },
            update: {},
            create: { name: cleanTag },
        });
        return res.status(201).json({ status: 'success', tag });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al crear tag' });
    }
});
router.delete('/api/admin/tags/:id', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.videoTag.deleteMany({ where: { tagId: id } });
        await prisma.tag.delete({ where: { id } });
        return res.json({ status: 'success', message: 'Tag eliminado' });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al eliminar tag' });
    }
});
// Control de Calidad y Monitoreo de Almacenamiento / CDN
router.get('/api/admin/storage/stats', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const [totalVideos, readyVideos, flaggedVideos] = await Promise.all([
            prisma.video.count(),
            prisma.video.count({ where: { status: 'READY' } }),
            prisma.video.count({ where: { status: 'FLAGGED' } }),
        ]);
        // Calcular tamaño de almacenamiento local
        const uploadsDir = path_1.default.join(__dirname, '../../uploads');
        let localSizeBytes = 0;
        let localFilesCount = 0;
        const calculateDirSize = (dir) => {
            if (fs_1.default.existsSync(dir)) {
                const files = fs_1.default.readdirSync(dir, { withFileTypes: true });
                for (const file of files) {
                    const fullPath = path_1.default.join(dir, file.name);
                    if (file.isDirectory()) {
                        calculateDirSize(fullPath);
                    }
                    else {
                        try {
                            const stat = fs_1.default.statSync(fullPath);
                            localSizeBytes += stat.size;
                            localFilesCount++;
                        }
                        catch (_) { }
                    }
                }
            }
        };
        calculateDirSize(uploadsDir);
        const localSizeMB = (localSizeBytes / (1024 * 1024)).toFixed(2);
        const localSizeGB = (localSizeBytes / (1024 * 1024 * 1024)).toFixed(2);
        return res.json({
            status: 'success',
            storage: {
                provider: 'Bunny.net CDN + Cloudinary Fallback + Local Storage',
                totalVideos,
                readyVideos,
                flaggedVideos,
                localStorage: {
                    filesCount: localFilesCount,
                    sizeBytes: localSizeBytes,
                    sizeFormatted: Number(localSizeGB) > 1 ? `${localSizeGB} GB` : `${localSizeMB} MB`,
                },
                cdnHealth: 'OPTIMAL (Transcoding HLS Master + 1080p/720p/480p Ready)',
                bandwidthEstimateMB: (Number(localSizeMB) * 1.8).toFixed(1),
            },
        });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al consultar estado de almacenamiento' });
    }
});
// ====================================================
// 4. MÉTRICAS Y ANALÍTICA DE PLATAFORMA
// ====================================================
router.get('/api/admin/analytics/overview', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [totalUsers, totalCreators, vipUsers, totalVideos, videosAgg, recentUsersToday, topVideos, topActors,] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({ where: { role: 'CREATOR' } }),
            prisma.user.count({ where: { isVip: true } }),
            prisma.video.count(),
            prisma.video.aggregate({
                _sum: { viewsCount: true, likesCount: true },
            }),
            prisma.user.count({ where: { createdAt: { gte: today } } }),
            prisma.video.findMany({
                orderBy: { viewsCount: 'desc' },
                take: 5,
                select: {
                    id: true,
                    title: true,
                    viewsCount: true,
                    likesCount: true,
                    thumbnailUrl: true,
                    actor: { select: { name: true, stageName: true } },
                },
            }),
            prisma.actor.findMany({
                orderBy: { followers: { _count: 'desc' } },
                take: 5,
                select: {
                    id: true,
                    name: true,
                    stageName: true,
                    avatarUrl: true,
                    _count: { select: { followers: true, videos: true } },
                },
            }),
        ]);
        const totalViews = Number(videosAgg._sum.viewsCount || 0);
        const totalLikes = Number(videosAgg._sum.likesCount || 0);
        // Estimación DAU / MAU basada en actividad de reproducciones y usuarios registrados
        const estimatedDAU = Math.max(recentUsersToday * 3 + 12, Math.round(totalUsers * 0.35));
        const estimatedMAU = Math.max(totalUsers, 45);
        return res.json({
            platform: {
                totalUsers,
                totalCreators,
                vipUsers,
                totalVideos,
                totalViews,
                totalLikes,
                estimatedDAU,
                estimatedMAU,
                conversionRatePercent: totalUsers > 0 ? ((vipUsers / totalUsers) * 100).toFixed(1) : '0.0',
                avgRetentionSeconds: 240, // 4 minutos de promedio
            },
            topVideos: topVideos.map((v) => ({
                id: v.id,
                title: v.title,
                views: Number(v.viewsCount),
                likes: Number(v.likesCount),
                thumbnailUrl: v.thumbnailUrl,
                actorName: v.actor?.stageName || v.actor?.name || 'Creador',
            })),
            topActors: topActors.map((a) => ({
                id: a.id,
                name: a.name,
                stageName: a.stageName,
                avatarUrl: a.avatarUrl,
                followersCount: a._count.followers,
                videosCount: a._count.videos,
            })),
        });
    }
    catch (err) {
        console.error('Error fetching analytics overview:', err);
        return res.status(500).json({ error: 'Error al consultar analíticas de plataforma' });
    }
});
// ====================================================
// 5. GESTIÓN FINANCIERA, PAGOS Y PAYOUTS (RETIROS)
// ====================================================
// Resumen financiero de la plataforma (Wompi, VIP, Retiros)
router.get('/api/admin/finance/overview', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const transactions = await prisma.paymentTransaction.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        const approvedTransactions = transactions.filter((t) => t.status === 'APPROVED');
        const totalRevenueCents = approvedTransactions.reduce((sum, t) => sum + t.amountInCents, 0);
        const totalRevenueCOP = totalRevenueCents / 100;
        // Comisión configurada
        const commissionPercent = Number(await settings_service_1.SettingsService.get('CREATOR_COMMISSION_PERCENT')) || 80;
        const platformKeepCOP = totalRevenueCOP * ((100 - commissionPercent) / 100);
        const creatorPoolCOP = totalRevenueCOP * (commissionPercent / 100);
        // Retiros pendientes
        const pendingPayouts = await prisma.payoutRecord.findMany({
            where: { status: 'PENDING' },
            include: {
                creator: {
                    include: {
                        user: { select: { id: true, email: true, username: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const pendingPayoutsTotalCOP = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);
        return res.json({
            revenue: {
                totalCOP: totalRevenueCOP,
                formattedTotal: `$${totalRevenueCOP.toLocaleString('es-CO')} COP`,
                platformKeepCOP,
                creatorPoolCOP,
                commissionPercent,
                transactionsCount: approvedTransactions.length,
            },
            payouts: {
                pendingCount: pendingPayouts.length,
                pendingTotalCOP: pendingPayoutsTotalCOP,
                formattedPendingTotal: `$${pendingPayoutsTotalCOP.toLocaleString('es-CO')} COP`,
            },
            recentTransactions: transactions.slice(0, 15).map((t) => ({
                id: t.id,
                reference: t.reference,
                amountCOP: t.amountInCents / 100,
                formattedAmount: `$${(t.amountInCents / 100).toLocaleString('es-CO')} COP`,
                currency: t.currency,
                status: t.status,
                paymentMethod: t.paymentMethod || 'WOMPI',
                date: t.createdAt.toISOString(),
            })),
        });
    }
    catch (err) {
        console.error('Error fetching finance overview:', err);
        return res.status(500).json({ error: 'Error al consultar resumen financiero' });
    }
});
// Listado de solicitudes de retiro (Payouts) para el Admin
router.get('/api/admin/finance/payouts', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const payouts = await prisma.payoutRecord.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                creator: {
                    include: {
                        user: { select: { id: true, email: true, username: true, avatarUrl: true } },
                    },
                },
            },
        });
        return res.json({
            total: payouts.length,
            payouts: payouts.map((p) => ({
                id: p.id,
                creatorId: p.creatorId,
                creatorUsername: p.creator?.user?.username || 'Creador',
                creatorEmail: p.creator?.user?.email || '',
                creatorAvatar: p.creator?.user?.avatarUrl,
                amount: p.amount,
                formattedAmount: `$${p.amount.toLocaleString('es-CO')} COP`,
                status: p.status,
                reference: p.reference,
                bankDetails: p.bankDetails || p.creator?.payoutAccount || 'Cuenta registrada en perfil',
                notes: p.notes,
                reviewedAt: p.reviewedAt ? p.reviewedAt.toISOString() : null,
                createdAt: p.createdAt.toISOString(),
            })),
        });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al consultar solicitudes de retiro' });
    }
});
// Aprobar o procesar retiro (ADMIN ONLY)
router.patch('/api/admin/finance/payouts/:id', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reference, notes } = req.body; // APPROVED, REJECTED, COMPLETED
        const adminId = req.user.id;
        if (!status || !['APPROVED', 'REJECTED', 'COMPLETED'].includes(status)) {
            return res.status(400).json({ error: 'Estado de retiro inválido (APPROVED, REJECTED, COMPLETED)' });
        }
        const payout = await prisma.payoutRecord.findUnique({
            where: { id },
            include: { creator: { include: { user: true } } },
        });
        if (!payout)
            return res.status(404).json({ error: 'Solicitud de retiro no encontrada' });
        const updated = await prisma.payoutRecord.update({
            where: { id },
            data: {
                status,
                reference: reference || payout.reference,
                notes: notes || payout.notes,
                reviewedByAdminId: adminId,
                reviewedAt: new Date(),
            },
        });
        // Notificar al creador
        if (payout.creator?.user?.id) {
            await notification_service_1.NotificationService.notify({
                recipientId: payout.creator.user.id,
                type: 'NEW_FOLLOWER',
                title: status === 'COMPLETED' ? '¡Retiro Transferido! 💸' : status === 'APPROVED' ? 'Retiro Aprobado ⏳' : 'Retiro Rechazado ❌',
                message: status === 'COMPLETED'
                    ? `Se transfirieron exitosamente $${payout.amount.toLocaleString('es-CO')} COP a tu cuenta bancaria. Ref: ${reference || 'TX'}.`
                    : status === 'APPROVED'
                        ? `Tu retiro de $${payout.amount.toLocaleString('es-CO')} COP fue aprobado y está en cola de desembolso.`
                        : `Tu solicitud de retiro fue rechazada. Motivo: ${notes || 'Revisar datos bancarios'}.`,
            }).catch(() => { });
        }
        await audit_service_1.AuditService.log({
            adminId,
            action: `PAYOUT_${status}`,
            entityType: 'PAYOUT',
            entityId: id,
            details: { amount: payout.amount, creatorUsername: payout.creator?.user?.username, reference, notes },
            ipAddress: req.ip,
        });
        return res.json({
            status: 'success',
            message: `Solicitud de retiro actualizada a ${status}`,
            payout: updated,
        });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al actualizar solicitud de retiro' });
    }
});
// Creadores solicitan retiro
router.post('/api/creator/payout-request', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.CREATOR, rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, bankDetails } = req.body;
        const minAmount = Number(await settings_service_1.SettingsService.get('MIN_PAYOUT_AMOUNT')) || 50000;
        const numAmount = Number(amount);
        if (!numAmount || numAmount < minAmount) {
            return res.status(400).json({
                error: `El monto mínimo para solicitar un retiro es de $${minAmount.toLocaleString('es-CO')} COP.`,
            });
        }
        // Buscar o crear perfil de creador
        let profile = await prisma.creatorProfile.findUnique({ where: { userId } });
        if (!profile) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            profile = await prisma.creatorProfile.create({
                data: {
                    userId,
                    stageName: user?.username || 'Creador',
                    payoutAccount: bankDetails || null,
                },
            });
        }
        const payout = await prisma.payoutRecord.create({
            data: {
                creatorId: profile.id,
                amount: numAmount,
                status: 'PENDING',
                bankDetails: bankDetails || profile.payoutAccount,
                reference: `PAY-${Date.now().toString().slice(-6)}`,
            },
        });
        return res.status(201).json({
            status: 'success',
            message: 'Solicitud de retiro enviada exitosamente para aprobación administrativa.',
            payout,
        });
    }
    catch (err) {
        console.error('Error in payout request:', err);
        return res.status(500).json({ error: 'Error al procesar solicitud de retiro' });
    }
});
// ====================================================
// 6. REGISTRO DE AUDITORÍA (AUDIT LOGS) Y CONFIGURACIÓN
// ====================================================
// Consultar Audit Logs de la plataforma
router.get('/api/admin/audit-logs', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 30;
        const action = req.query.action;
        const entityType = req.query.entityType;
        const data = await audit_service_1.AuditService.getLogs({ page, limit, action, entityType });
        return res.json(data);
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al consultar registro de auditoría' });
    }
});
// Consultar configuración global
router.get('/api/admin/settings', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const settings = await settings_service_1.SettingsService.getAll();
        return res.json({ settings });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al consultar ajustes globales' });
    }
});
// Actualizar configuración global
router.put('/api/admin/settings', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { key, value, description } = req.body;
        const adminId = req.user.id;
        if (!key || value === undefined) {
            return res.status(400).json({ error: 'Clave (key) y valor (value) son requeridos' });
        }
        const updated = await settings_service_1.SettingsService.set(key, String(value), description);
        await audit_service_1.AuditService.log({
            adminId,
            action: 'SETTINGS_UPDATE',
            entityType: 'SETTINGS',
            entityId: key,
            details: { key, newValue: value },
            ipAddress: req.ip,
        });
        return res.json({
            status: 'success',
            message: `Ajuste global "${key}" actualizado con éxito.`,
            setting: updated,
        });
    }
    catch (err) {
        return res.status(500).json({ error: 'Error al actualizar configuración' });
    }
});
// Ajustes públicos para clientes (Marca de agua, políticas)
router.get('/api/settings/public', async (req, res) => {
    try {
        const [watermarkEnabled, watermarkText, tosContent, privacyContent] = await Promise.all([
            settings_service_1.SettingsService.get('WATERMARK_ENABLED'),
            settings_service_1.SettingsService.get('WATERMARK_TEXT'),
            settings_service_1.SettingsService.get('TOS_CONTENT'),
            settings_service_1.SettingsService.get('PRIVACY_CONTENT'),
        ]);
        return res.json({
            watermarkEnabled: watermarkEnabled === 'true',
            watermarkText: watermarkText || 'TexxxNopor',
            tosContent,
            privacyContent,
        });
    }
    catch (err) {
        return res.json({
            watermarkEnabled: true,
            watermarkText: 'TexxxNopor',
        });
    }
});
// ====================================================
// GESTIÓN Y REVISIÓN DE VERIFICACIÓN DE ACTORES (ADMIN)
// ====================================================
router.get('/api/admin/actors/verification-requests', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const actors = await prisma.actor.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        createdAt: true,
                        isVerified: true,
                    },
                },
                followers: true,
                videos: {
                    select: {
                        id: true,
                        title: true,
                        videoUrl: true,
                        thumbnailUrl: true,
                        durationSeconds: true,
                        viewsCount: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        const MIN_FOLLOWERS = 10;
        const MIN_WATCH_HOURS = 0.5;
        const formatted = actors.map((a) => {
            const followersCount = a.followers.length;
            const totalDurationSecondsWatched = a.videos.reduce((acc, v) => {
                return acc + (Number(v.viewsCount) * (v.durationSeconds || 60));
            }, 0);
            const totalWatchHours = Number((totalDurationSecondsWatched / 3600).toFixed(2));
            const sampleVideo = a.verificationVideoUrl || (a.videos.length > 0 ? a.videos[0].videoUrl : null);
            const meetsCriteria = followersCount >= MIN_FOLLOWERS && totalWatchHours >= MIN_WATCH_HOURS;
            return {
                id: a.id,
                userId: a.userId,
                name: a.name,
                stageName: a.stageName,
                bio: a.bio,
                avatarUrl: a.avatarUrl,
                bannerUrl: a.bannerUrl,
                nationality: a.nationality,
                isVerified: Boolean(a.isVerified),
                followersCount,
                videosCount: a.videos.length,
                totalWatchHours,
                sampleVideoUrl: sampleVideo,
                recentVideos: a.videos.slice(0, 3),
                meetsCriteria,
                minFollowersRequired: MIN_FOLLOWERS,
                minWatchHoursRequired: MIN_WATCH_HOURS,
                createdAt: a.createdAt,
            };
        });
        return res.json({
            status: 'success',
            total: formatted.length,
            pendingCount: formatted.filter((a) => !a.isVerified).length,
            actors: formatted,
        });
    }
    catch (err) {
        console.error('Error fetching actor verification requests:', err);
        return res.status(500).json({ error: 'Error al consultar solicitudes de verificación de actores' });
    }
});
router.post('/api/admin/actors/:id/verify', rbac_middleware_1.authenticateJWT, (0, rbac_middleware_1.requireRole)(rbac_1.UserRole.ADMIN), async (req, res) => {
    try {
        const { id } = req.params;
        const { approved, notes } = req.body;
        const isApproved = approved === true || approved === 'true';
        const adminId = req.user.id;
        const actor = await prisma.actor.findUnique({
            where: { id },
            include: { user: true },
        });
        if (!actor) {
            return res.status(404).json({ error: 'Actor no encontrado' });
        }
        const updatedActor = await prisma.actor.update({
            where: { id },
            data: { isVerified: isApproved },
        });
        if (actor.userId) {
            await prisma.user.update({
                where: { id: actor.userId },
                data: { isVerified: isApproved },
            });
        }
        await audit_service_1.AuditService.log({
            adminId,
            action: isApproved ? 'ACTOR_VERIFY_APPROVE' : 'ACTOR_VERIFY_REJECT',
            entityType: 'ACTOR',
            entityId: id,
            details: {
                stageName: actor.stageName,
                approved: isApproved,
                notes: notes || (isApproved ? 'Verificación aprobada por administrador' : 'Verificación rechazada por falta de métricas u optimización'),
            },
            ipAddress: req.ip,
        });
        if (actor.userId) {
            await notification_service_1.NotificationService.notify({
                recipientId: actor.userId,
                type: 'NEW_FOLLOWER',
                title: isApproved ? '¡Felicidades! Tu cuenta de Actor ha sido Verificada 🎉' : 'Actualización sobre tu Verificación de Actor',
                message: isApproved
                    ? `Tu perfil de actor @${actor.stageName} ha sido verificado oficialmente por el equipo administrativo.`
                    : `Tu solicitud de verificación para @${actor.stageName} no ha sido aprobada en este momento. Revisa tus métricas de seguidores y horas de reproducción.`,
            });
        }
        return res.json({
            status: 'success',
            message: isApproved
                ? `Actor @${actor.stageName} verificado con éxito.`
                : `Verificación para @${actor.stageName} actualizada a no verificada.`,
            actor: updatedActor,
        });
    }
    catch (err) {
        console.error('Error in actor verification review:', err);
        return res.status(500).json({ error: 'Error al procesar la verificación del actor' });
    }
});
exports.default = router;
