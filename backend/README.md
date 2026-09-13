# ReachInbox Email Scheduler

A production-oriented full-stack email scheduling application built for the Outbox Labs SDE Intern assignment.

## Features

- Google OAuth authentication
- Email campaign scheduling
- Multiple sender accounts
- CSV/TXT recipient upload and parsing
- BullMQ delayed jobs
- Redis-backed scheduling and rate limiting
- Configurable worker concurrency
- Minimum delay between emails
- Configurable hourly email limit
- Automatic rescheduling when hourly limit is reached
- PostgreSQL persistence with Prisma
- Ethereal SMTP email delivery
- Elasticsearch email indexing and search
- Slack OAuth integration
- Slack notifications when hourly email limits are reached
- BullMQ dashboard
- React + TypeScript frontend
- Loading and empty states

## Architecture

```text
React + TypeScript
        |
        | REST API / OAuth
        v
Express + TypeScript
   |        |        |        |
   v        v        v        v
Postgres  Redis  Elasticsearch  OAuth
   |        |
   |        v
   |     BullMQ
   |        |
   |        v
   |     Worker
   |        |
   |        v
   |    Ethereal SMTP
   |
   v
Email state persistence