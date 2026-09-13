import prisma from "../db/prisma.js";

export async function notifySlack(
  userId: string,
  message: string
) {
  const connection =
    await prisma.slackConnection.findUnique({
      where: { userId },
    });

  if (!connection) {
    console.log(
      `Slack is not connected for user ${userId}`
    );
    return;
  }

  if (!connection.channelId) {
    console.log(
      "Slack connected, but no channel selected"
    );
    return;
  }

  const response = await fetch(
    "https://slack.com/api/chat.postMessage",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: connection.channelId,
        text: message,
      }),
    }
  );

  const data = await response.json();

  if (!data.ok) {
    throw new Error(
      `Slack notification failed: ${data.error}`
    );
  }
}