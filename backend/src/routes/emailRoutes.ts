import { Router } from "express";
import prisma from "../db/prisma.js";
import { searchEmails } from "../services/elasticsearchService.js";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../middleware/authMiddleware.js";

const router = Router();

router.get(
  "/scheduled",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.userId;

      const emails = await prisma.email.findMany({
        where: {
          status: "SCHEDULED",
          campaign: {
            userId,
          },
        },
        orderBy: {
          scheduledAt: "asc",
        },
      });

      res.json({
        status: "success",
        emails,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        status: "error",
        message: "Failed to fetch scheduled emails",
      });
    }
  }
);

router.get(
  "/sent",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.userId;

      const emails = await prisma.email.findMany({
        where: {
          status: "SENT",
          campaign: {
            userId,
          },
        },
        orderBy: {
          sentAt: "desc",
        },
      });

      res.json({
        status: "success",
        emails,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        status: "error",
        message: "Failed to fetch sent emails",
      });
    }
  }
);

router.get(
  "/search",
  authMiddleware,
  async (req, res) => {
    try {
      const query = String(req.query.q || "").trim();

      if (!query) {
        return res.status(400).json({
          status: "error",
          message: "Search query is required",
        });
      }

      const results = await searchEmails(
  query,
  (req as AuthenticatedRequest).user!.userId
);

      res.json({
        status: "success",
        results,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        status: "error",
        message: "Failed to search emails",
      });
    }
  }
);

export default router;