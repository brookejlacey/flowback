import { Request, Response, NextFunction } from "express";

// Extend express-session to include our custom fields
declare module "express-session" {
  interface SessionData {
    siwe: {
      address: string;
      chainId: number;
    };
    nonce: string;
  }
}

/** Requires a valid SIWE session */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.siwe?.address) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

/** Validates CRE service token for metrics endpoint */
export function requireCREToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  if (token !== process.env.CRE_SERVICE_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
