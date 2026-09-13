import { Queue } from "bullmq";
import IORedis from "ioredis";
import { REDIS_URL } from "../config/env.js";

const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const emailQueue = new Queue("email-queue", {
  connection,
});