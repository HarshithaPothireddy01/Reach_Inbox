import prisma from "../db/prisma.js";
import { emailQueue } from "../queues/emailQueue.js";

type ScheduleEmailInput = {
  userId: string;
  senderId: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime: Date;
  delaySeconds: number;
  hourlyLimit: number;
};

export async function scheduleCampaign(input: ScheduleEmailInput) {
  const {
    userId,
    senderId,
    subject,
    body,
    recipients,
    startTime,
    delaySeconds,
    hourlyLimit,
  } = input;

  // Create the campaign in PostgreSQL
  const campaign = await prisma.campaign.create({
    data: {
      userId,
      senderId,
      subject,
      body,
      startTime,
      delaySeconds,
      hourlyLimit,
    },
  });

  // Create one database record for every recipient
  for (let i = 0; i < recipients.length; i++) {
    const scheduledAt = new Date(
      startTime.getTime() + i * delaySeconds * 1000
    );

    const email = await prisma.email.create({
      data: {
        campaignId: campaign.id,
        senderId,
        recipient: recipients[i],
        subject,
        body,
        scheduledAt,
      },
    });

    // Calculate how long BullMQ should wait
    const delay = Math.max(
      0,
      scheduledAt.getTime() - Date.now()
    );

    // Add the email to BullMQ
    const job = await emailQueue.add(
      "send-email",
      {
        emailId: email.id,
      },
      {
        delay,
        jobId: email.id,
      }
    );

    // Save BullMQ job ID
    await prisma.email.update({
      where: {
        id: email.id,
      },
      data: {
        bullJobId: job.id,
      },
    });
  }

  return campaign;
}