import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db/index";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env["JWT_SECRET"] ?? "aozora-secret-key-change-in-production";

export interface AuthUser {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: "student" | "owner" | "admin";
  verificationStatus: "unverified" | "pending" | "verified" | "rejected";
  isSuspended: boolean;
  avatarUrl: string | null;
  createdAt: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized", message: "No token provided" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: number };
    const user = await db.select().from(users).where(eq(users.id, payload.userId)).get();

    if (!user) {
      res.status(401).json({ error: "Unauthorized", message: "User not found" });
      return;
    }

    if (user.isSuspended) {
      res.status(403).json({ error: "Forbidden", message: "Account suspended" });
      return;
    }

    req.user = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role as AuthUser["role"],
      verificationStatus: user.verificationStatus as AuthUser["verificationStatus"],
      isSuspended: user.isSuspended,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden", message: "Insufficient permissions" });
      return;
    }
    next();
  };
}
