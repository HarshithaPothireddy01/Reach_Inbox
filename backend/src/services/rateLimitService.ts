import IORedis from "ioredis";
import { REDIS_URL, MIN_DELAY_SECONDS } from "../config/env.js";

const redis = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

/*
 * Atomically reserves the next available sending slot for a sender.
 *
 * This prevents multiple workers from sending at the same time.
 */
const minimumDelayScript = `
local key = KEYS[1]

local now = tonumber(ARGV[1])
local delay = tonumber(ARGV[2])

local nextAllowed = redis.call("GET", key)

if not nextAllowed then
  redis.call(
    "SET",
    key,
    now + delay,
    "PX",
    delay + 60000
  )

  return 0
end

nextAllowed = tonumber(nextAllowed)

if now >= nextAllowed then
  redis.call(
    "SET",
    key,
    now + delay,
    "PX",
    delay + 60000
  )

  return 0
end

return nextAllowed - now
`;

/*
 * Atomically checks the hourly limit.
 *
 * Multiple workers can safely call this at the same time.
 */
const hourlyLimitScript = `
local key = KEYS[1]

local limit = tonumber(ARGV[1])
local expiry = tonumber(ARGV[2])

local count = redis.call("INCR", key)

if count == 1 then
  redis.call("EXPIRE", key, expiry)
end

if count <= limit then
  return 1
end

redis.call("DECR", key)

return 0
`;

export async function waitForMinimumDelay(
  senderId: string
) {
  const key = `email:next-send:${senderId}`;

  const requiredDelay = MIN_DELAY_SECONDS * 1000;

  while (true) {
    const now = Date.now();

    const waitTime = await redis.eval(
      minimumDelayScript,
      1,
      key,
      now.toString(),
      requiredDelay.toString()
    );

    const waitMilliseconds = Number(waitTime);

    if (waitMilliseconds <= 0) {
      return;
    }

    await new Promise((resolve) =>
      setTimeout(
        resolve,
        Math.max(waitMilliseconds, 50)
      )
    );
  }
}

export async function checkHourlyLimit(
  senderId: string,
  hourlyLimit: number
) {
  const hourStart = new Date();

  hourStart.setMinutes(0, 0, 0);

  const key = `email:hourly:${senderId}:${hourStart.getTime()}`;

  const result = await redis.eval(
    hourlyLimitScript,
    1,
    key,
    hourlyLimit.toString(),
    "3700"
  );

  if (Number(result) === 1) {
    return {
      allowed: true,
      retryAt: null,
    };
  }

  const nextHour = new Date(
    hourStart.getTime() + 60 * 60 * 1000
  );

  return {
    allowed: false,
    retryAt: nextHour,
  };
}