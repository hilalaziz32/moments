import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { config } from "../config.js";

/** Shared-secret gate for web -> worker calls over the private network. */
export function requireInternalKey(req: Request, res: Response, next: NextFunction): void {
  const provided = String(req.header("x-internal-api-key") ?? "");
  const expected = config.internalApiKey;

  if (!expected) {
    res.status(503).json({ error: "internal API key is not configured" });
    return;
  }
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}
