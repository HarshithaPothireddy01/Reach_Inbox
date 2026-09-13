import { Router } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { createToken } from "../utils/jwt.js";
import prisma from "../db/prisma.js";
import { JWT_SECRET } from "../config/env.js";

const router = Router();

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/api/auth/login-failed",
  }),
  (req, res) => {
    const user = req.user as {
      id: string;
      name: string;
      email: string;
      avatar: string | null;
    };

    const token = createToken({
      id: user.id,
      email: user.email,
    });

    res.redirect(
      `http://localhost:5173/dashboard?token=${encodeURIComponent(token)}`
    );
  }
);

router.get("/login-failed", (_req, res) => {
  res.status(401).json({
    status: "error",
    message: "Google login failed",
  });
});

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        status: "error",
        message: "Missing token",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    ) as {
      userId: string;
    };

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    res.json({
      status: "success",
      user,
    });
  } catch (error) {
    console.error(error);

    res.status(401).json({
      status: "error",
      message: "Invalid token",
    });
  }
});

export default router;