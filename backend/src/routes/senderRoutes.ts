import { Router } from "express";
import prisma from "../db/prisma.js";
import {
  SMTP_USER,
  SMTP_PASSWORD,
} from "../config/env.js";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../middleware/authMiddleware.js";

const router = Router();

/*
  Get senders for logged-in user
*/
router.get(
  "/",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.userId;

      let senders = await prisma.sender.findMany({
        where: {
          userId,
        },
        select: {
          id: true,
          email: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      /*
        If this user has no sender yet,
        create the default Ethereal sender.
      */
      if (senders.length === 0) {
        const sender = await prisma.sender.create({
          data: {
            userId,
            email: SMTP_USER,
            etherealUser: SMTP_USER,
            etherealPassword: SMTP_PASSWORD,
          },
          select: {
            id: true,
            email: true,
            createdAt: true,
          },
        });

        senders = [sender];
      }

      res.json({
        status: "success",
        senders,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        status: "error",
        message: "Failed to fetch senders",
      });
    }
  }
);

/*
  Create sender
*/
router.post(
  "/",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.userId;

      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          status: "error",
          message: "email is required",
        });
      }

      const sender = await prisma.sender.create({
        data: {
          userId,
          email: String(email).trim().toLowerCase(),
          etherealUser: SMTP_USER,
          etherealPassword: SMTP_PASSWORD,
        },
        select: {
          id: true,
          email: true,
          createdAt: true,
        },
      });

      res.status(201).json({
        status: "success",
        sender,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        status: "error",
        message: "Failed to create sender",
      });
    }
  }
);

export default router;