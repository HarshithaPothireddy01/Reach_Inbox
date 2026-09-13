import { Router } from "express";
import prisma from "../db/prisma.js";
import { scheduleCampaign } from "../services/schedulerService.js";
import {
  authMiddleware,
  AuthenticatedRequest,
} from "../middleware/authMiddleware.js";

const router = Router();

router.post(
  "/schedule",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.userId;

      const {
        senderId,
        subject,
        body,
        recipients,
        startTime,
        delaySeconds,
        hourlyLimit,
      } = req.body;

      if (
        !senderId ||
        !subject ||
        !body ||
        !Array.isArray(recipients) ||
        recipients.length === 0 ||
        !startTime
      ) {
        return res.status(400).json({
          status: "error",
          message: "Missing required fields",
        });
      }

      /*
        Make sure the selected sender belongs
        to the logged-in user.
      */
      const sender = await prisma.sender.findFirst({
        where: {
          id: senderId,
          userId,
        },
      });

      if (!sender) {
        return res.status(403).json({
          status: "error",
          message: "Invalid sender",
        });
      }

      const campaign = await scheduleCampaign({
        userId,
        senderId,
        subject,
        body,
        recipients,
        startTime: new Date(startTime),
        delaySeconds: Number(delaySeconds || 0),
        hourlyLimit: Number(hourlyLimit || 100),
      });

      res.status(201).json({
        status: "scheduled",
        campaignId: campaign.id,
        recipientCount: recipients.length,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        status: "error",
        message: "Failed to schedule campaign",
      });
    }
  }
);

export default router;