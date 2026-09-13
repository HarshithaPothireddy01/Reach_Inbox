import authRoutes from "./routes/authRoutes.js";
import passport from "passport";
import "./config/passport.js";
import express from "express";
import prisma from "./db/prisma.js";
import { emailQueue } from "./queues/emailQueue.js";
import campaignRoutes from "./routes/campaignRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import recipientRoutes from "./routes/recipientRoutes.js";
import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import slackRoutes from "./routes/slackRoutes.js";
import senderRoutes from "./routes/senderRoutes.js";
import cors from "cors";

import {
  SMTP_USER,
} from "./config/env.js";

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
app.use(passport.initialize());
const serverAdapter = new ExpressAdapter();

serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue),
  ],
  serverAdapter,
});





app.use(
  "/admin/queues",
  serverAdapter.getRouter()
);

app.use(express.json());
app.use("/api/campaigns", campaignRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/recipients", recipientRoutes);
app.use("/api/slack", slackRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/senders", senderRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
  });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const users = await prisma.user.findMany();

    res.json({
      status: "connected",
      userCount: users.length,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Database connection failed",
    });
  }
});

app.post("/api/test-queue", async (req, res) => {
  try {
    const job = await emailQueue.add("test-email", {
      message: "Hello from BullMQ",
    });

    res.json({
      status: "queued",
      jobId: job.id,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Failed to add job",
    });
  }
});

app.post("/api/test-email", async (req, res) => {
  try {
    const user = await prisma.user.findFirst();
    const sender = await prisma.sender.findFirst();

    if (!user || !sender) {
      return res.status(400).json({
        status: "error",
        message: "Test user or sender not found",
      });
    }

    const campaign = await prisma.campaign.create({
      data: {
        userId: user.id,
        senderId: sender.id,
        subject: "ReachInbox SMTP Test",
        body: "This is a test email from the ReachInbox assignment.",
        startTime: new Date(),
        delaySeconds: 0,
        hourlyLimit: 100,
      },
    });

    const email = await prisma.email.create({
      data: {
        campaignId: campaign.id,
        senderId: sender.id,
        recipient: sender.email,
        subject: "ReachInbox SMTP Test",
        body: "This is a test email from the ReachInbox assignment.",
        scheduledAt: new Date(),
      },
    });

    const job = await emailQueue.add(
      "send-email",
      {
        emailId: email.id,
      },
      {
        jobId: email.id,
      }
    );

    await prisma.email.update({
      where: {
        id: email.id,
      },
      data: {
        bullJobId: job.id,
      },
    });

    res.json({
      status: "queued",
      jobId: job.id,
      emailId: email.id,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Failed to queue test email",
    });
  }
});

export default app;