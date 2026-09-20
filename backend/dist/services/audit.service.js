"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class AuditService {
    /**
     * Registra una acción administrativa en el log de auditoría
     */
    static async log(params) {
        try {
            const detailsStr = params.details
                ? typeof params.details === 'string'
                    ? params.details
                    : JSON.stringify(params.details)
                : null;
            const log = await prisma.auditLog.create({
                data: {
                    adminId: params.adminId,
                    action: params.action,
                    entityType: params.entityType,
                    entityId: params.entityId || null,
                    details: detailsStr,
                    ipAddress: params.ipAddress || null,
                },
                include: {
                    admin: {
                        select: {
                            id: true,
                            email: true,
                            username: true,
                        },
                    },
                },
            });
            console.log(`🛡️ [AUDIT] ${params.action} on ${params.entityType} (${params.entityId || 'N/A'}) by Admin ${params.adminId}`);
            return log;
        }
        catch (err) {
            console.error('⚠️ Error al registrar log de auditoría:', err.message);
            return null;
        }
    }
    /**
     * Consulta el registro de auditoría con filtros y paginación
     */
    static async getLogs(params) {
        const page = Math.max(1, params.page || 1);
        const limit = Math.min(100, Math.max(1, params.limit || 30));
        const skip = (page - 1) * limit;
        const where = {};
        if (params.action)
            where.action = params.action;
        if (params.entityType)
            where.entityType = params.entityType;
        const [total, logs] = await Promise.all([
            prisma.auditLog.count({ where }),
            prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    admin: {
                        select: {
                            id: true,
                            email: true,
                            username: true,
                            avatarUrl: true,
                        },
                    },
                },
            }),
        ]);
        return {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            logs,
        };
    }
}
exports.AuditService = AuditService;
