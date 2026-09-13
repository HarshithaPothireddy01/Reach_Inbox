import { Router } from "express";
import prisma from "../db/prisma.js";
import {
  SLACK_CLIENT_ID,
  SLACK_CLIENT_SECRET,
  SLACK_REDIRECT_URI,
} from "../config/env.js";

const router = Router();

router.get("/connect", (req, res) => {
  const userId = String(req.query.userId || "");

  if (!userId) {
    return res.status(400).json({
      status: "error",
      message: "userId is required",
    });
  }

  const params = new URLSearchParams({
    client_id: SLACK_CLIENT_ID,
    scope: "chat:write",
    redirect_uri: SLACK_REDIRECT_URI,
    state: userId,
  });

  const slackUrl =
    `https://slack.com/oauth/v2/authorize?${params.toString()}`;

  res.redirect(slackUrl);
});

router.get("/callback", async (req, res) => {
  try {
    const code = String(req.query.code || "");
    const userId = String(req.query.state || "");

    if (!code || !userId) {
      return res.status(400).send("Missing Slack OAuth data");
    }

    const response = await fetch(
      "https://slack.com/api/oauth.v2.access",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: SLACK_CLIENT_ID,
          client_secret: SLACK_CLIENT_SECRET,
          code,
          redirect_uri: SLACK_REDIRECT_URI,
        }),
      }
    );

    const data = await response.json();

    if (!data.ok) {
      console.error("Slack OAuth error:", data);
      return res.status(400).send(
        "Slack connection failed"
      );
    }

    await prisma.slackConnection.upsert({
      where: {
        userId,
      },
      update: {
        accessToken: data.access_token,
        teamId: data.team?.id,
        teamName: data.team?.name,
      },
      create: {
        userId,
        accessToken: data.access_token,
        teamId: data.team?.id,
        teamName: data.team?.name,
      },
    });

    res.send(`
      <html>
        <body>
          <h2>Slack connected successfully</h2>
          <p>You can close this window.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error(error);
    res.status(500).send(
      "Slack connection failed"
    );
  }
});

router.get("/channels", async (req, res) => {
  try {
    const userId = String(req.query.userId || "");

    const connection =
      await prisma.slackConnection.findUnique({
        where: { userId },
      });

    if (!connection) {
      return res.status(400).json({
        status: "error",
        message: "Slack is not connected",
      });
    }

    const response = await fetch(
      "https://slack.com/api/conversations.list",
      {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
        },
      }
    );

    const data = await response.json();

    if (!data.ok) {
      return res.status(400).json({
        status: "error",
        message: data.error,
      });
    }

    const channels = data.channels.map(
      (channel: {
        id: string;
        name: string;
      }) => ({
        id: channel.id,
        name: channel.name,
      })
    );

    res.json({
      status: "success",
      channels,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Failed to fetch Slack channels",
    });
  }
});

router.post("/channel", async (req, res) => {
  try {
    const {
      userId,
      channelId,
      channelName,
    } = req.body;

    if (!userId || !channelId) {
      return res.status(400).json({
        status: "error",
        message: "userId and channelId are required",
      });
    }

    await prisma.slackConnection.update({
      where: { userId },
      data: {
        channelId,
        channelName,
      },
    });

    res.json({
      status: "success",
      message: "Slack channel selected",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: "error",
      message: "Failed to save Slack channel",
    });
  }
});

export default router;