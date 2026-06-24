import { fromNodeHeaders } from "better-auth/node";
import { User } from "../models/User.js";
import { verifyToken } from "../utils/jwt.js";

const COOKIE_NAME = "arthub_jwt";

export function createSessionMiddleware(auth) {
  async function attachUser(req, _res, next) {
    try {
      // 1. Try JWT from httpOnly cookie
      const token = req.cookies?.[COOKIE_NAME];

      if (token) {
        try {
          const payload = await verifyToken(token);
          req.user = await User.findById(payload.userId);
          if (req.user) return next();
        } catch {
          // Token invalid or expired — fall through to Better Auth
        }
      }

      // 2. Fall back to Better Auth session (covers Google OAuth & first-login window)
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(req.headers)
      });

      req.session = session || null;
      req.authUser = session?.user || null;

      if (req.authUser?.email) {
        req.user = await User.findOne({ email: req.authUser.email });
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  function requireAuth(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ message: "Please login first." });
    }
    next();
  }

  function requireRole(roles) {
    return (req, res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ message: "You do not have permission for this action." });
      }
      next();
    };
  }

  return { attachUser, requireAuth, requireRole };
}
