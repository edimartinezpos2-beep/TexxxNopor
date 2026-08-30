import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole, AuthUser } from '../types/rbac';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-texxxnopor-key';

export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso denegado: Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  // Soporte para tokens mock/demo de desarrollo
  if (token.startsWith('token_') || token === 'token_demo' || token === 'demo_token') {
    const rolePart = token.replace('token_', '').toUpperCase();
    const role: UserRole =
      rolePart === 'ADMIN' ? UserRole.ADMIN : rolePart === 'CREATOR' ? UserRole.CREATOR : UserRole.CONSUMER;
    req.user = {
      id: `usr_${role.toLowerCase()}`,
      email: `${role.toLowerCase()}@texxxnopor.com`,
      role,
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

/**
 * Middleware generador de verificación de roles para RBAC
 * @param allowedRoles Lista de roles permitidos para ejecutar el endpoint
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acceso prohibido: Tu rol '${req.user.role}' no tiene permisos para esta acción.`,
      });
    }

    next();
  };
};
