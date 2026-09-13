import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AuditService {
  /**
   * Registra una acción administrativa en el log de auditoría
   */
  static async log(params: {
    adminId: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: any;
    ipAddress?: string;
  }) {
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
    } catch (err: any) {
      console.error('⚠️ Error al registrar log de auditoría:', err.message);
      return null;
    }
  }

  /**
   * Consulta el registro de auditoría con filtros y paginación
   */
  static async getLogs(params: {
    page?: number;
    limit?: number;
    action?: string;
    entityType?: string;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 30));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.action) where.action = params.action;
    if (params.entityType) where.entityType = params.entityType;

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
