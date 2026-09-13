import { Worker } from "bullmq";
import IORedis from "ioredis";

import { indexEmail } from "../services/elasticsearchService.js";
import { notifySlack } from "../services/slackService.js";

import {
  REDIS_URL,
  WORKER_CONCURRENCY,
} from "../config/env.js";

import prisma from "../db/prisma.js";

import { sendEmail } from "../services/mailService.js";

import { emailQueue } from "../queues/emailQueue.js";

import {
  waitForMinimumDelay,
  checkHourlyLimit,
} from "../services/rateLimitService.js";

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "email-queue",

  async (job) => {
    console.log(
      "Processing job:",
      job.id,
      job.data
    );

    const emailId = job.data.emailId;

    if (!emailId) {
      throw new Error("Missing emailId in job data");
    }

    /*
     * Get email from PostgreSQL
     */
    const email = await prisma.email.findUnique({
      where: {
        id: emailId,
      },
    });

    if (!email) {
      throw new Error(
        `Email ${emailId} not found`
      );
    }

    /*
     * Get campaign
     */
    const campaign =
      await prisma.campaign.findUnique({
        where: {
          id: email.campaignId,
        },
      });

    if (!campaign) {
      throw new Error(
        `Campaign ${email.campaignId} not found`
      );
    }

    /*
     * Get selected sender
     */
    const sender = await prisma.sender.findUnique({
      where: {
        id: email.senderId,
      },
    });

    if (!sender) {
      throw new Error(
        `Sender ${email.senderId} not found`
      );
    }

    /*
     * Atomically claim the email.
     */
    const claimed = await prisma.email.updateMany({
      where: {
        id: emailId,
        status: "SCHEDULED",
      },
      data: {
        status: "PROCESSING",
      },
    });

    if (claimed.count === 0) {
      console.log(
        `Email ${emailId} was already processed`
      );

      return;
    }

    try {
      /*
       * Check hourly sender limit.
       */
      const limitResult =
        await checkHourlyLimit(
          email.senderId,
          campaign.hourlyLimit
        );

      if (!limitResult.allowed) {
        const retryAt =
          limitResult.retryAt!;

        console.log(
          `Hourly limit reached for sender ${email.senderId}`
        );

        /*
         * Notify Slack.
         */
        try {
          await notifySlack(
            campaign.userId,
            `Hourly email limit reached for sender ${sender.email}. Emails are being rescheduled to the next available hour.`
          );
        } catch (slackError) {
          console.error(
            "Slack notification failed:",
            slackError
          );
        }

        /*
         * Return email to scheduled state.
         */
        await prisma.email.update({
          where: {
            id: email.id,
          },
          data: {
            status: "SCHEDULED",
            scheduledAt: retryAt,
          },
        });

        /*
         * Re-add job for next hour.
         */
        const delay = Math.max(
          0,
          retryAt.getTime() - Date.now()
        );

        await emailQueue.add(
          "send-email",
          {
            emailId: email.id,
          },
          {
            delay,
            jobId:
              `${email.id}-retry-${Date.now()}`,
          }
        );

        console.log(
          `Email ${email.id} rescheduled for ${retryAt.toISOString()}`
        );

        return;
      }

      /*
       * Enforce minimum delay.
       */
      await waitForMinimumDelay(
        email.senderId
      );

      /*
       * Count send attempt.
       */
      await prisma.email.update({
        where: {
          id: email.id,
        },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      /*
       * Send through Ethereal.
       */
      const result = await sendEmail(
        sender.email,
        email.recipient,
        email.subject,
        email.body
      );

      /*
       * Mark as sent.
       */
      const sentAt = new Date();

      await prisma.email.update({
        where: {
          id: emailId,
        },
        data: {
          status: "SENT",
          sentAt,
          messageId: result.messageId,
        },
      });

      /*
       * Index into Elasticsearch.
       */
      await indexEmail({
        id: email.id,
        userId: campaign.userId,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        status: "SENT",
        scheduledAt: email.scheduledAt,
        sentAt,
      });

      console.log(
        "Email sent:",
        email.recipient,
        result
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown email error";

      await prisma.email.update({
        where: {
          id: emailId,
        },
        data: {
          status: "FAILED",
          error: message,
        },
      });

      throw error;
    }
  },

  {
    connection,
    concurrency: WORKER_CONCURRENCY,
  }
);

worker.on("completed", (job) => {
  console.log(
    "Job completed:",
    job.id
  );
});

worker.on("failed", (job, error) => {
  console.error(
    "Job failed:",
    job?.id,
    error.message
  );
});

console.log(
  `Email worker started with concurrency ${WORKER_CONCURRENCY}`
);