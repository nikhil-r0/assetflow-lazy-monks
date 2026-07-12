import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { Role } from "./enums.js";
import { AppError } from "./errors.js";

export interface UserPayload {
  id: number;
  role: Role;
  department_id: number | null;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super("UNAUTHORIZED", 401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super("FORBIDDEN", 403, message);
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }

    if (token) {
      try {
        const secret = process.env["JWT_SECRET"] || "change-me-in-prod";
        const decoded = jwt.verify(token, secret) as any;
        req.user = {
          id: Number(decoded.sub),
          role: decoded.role as Role,
          department_id: decoded.department_id ? Number(decoded.department_id) : null,
          email: decoded.email || "",
        };
        next();
        return;
      } catch (err) {
        // Token invalid, fall back to headers
      }
    }

    // Fallback headers for testing and parallel development
    const userIdHeader = req.headers["x-user-id"];
    const userRoleHeader = req.headers["x-user-role"];
    const userDeptIdHeader = req.headers["x-user-dept-id"];

    if (userIdHeader && userRoleHeader) {
      req.user = {
        id: Number(userIdHeader),
        role: userRoleHeader as Role,
        department_id: userDeptIdHeader ? Number(userDeptIdHeader) : null,
        email: (req.headers["x-user-email"] as string) || "mock@assetflow.dev",
      };
      next();
      return;
    }

    throw new UnauthorizedError("No token or credentials provided");
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError("Authentication required");
      }
      if (!roles.includes(req.user.role)) {
        throw new ForbiddenError(`Role ${req.user.role} does not have permission`);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
