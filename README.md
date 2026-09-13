# ReachInbox Email Scheduler

A production-oriented full-stack email scheduling application built for the ReachInbox / Outbox Labs SDE Intern assignment.

The application allows users to authenticate with Google, create email campaigns from recipient lists, schedule emails with configurable delays and hourly limits, monitor jobs through BullMQ, search sent emails using Elasticsearch, connect Slack for rate-limit notifications, and view scheduled/sent email history.

---

## Features

- Google OAuth authentication
- User profile with name, email, avatar and logout
- Multiple email senders
- CSV/text recipient upload
- Recipient parsing and email count
- Email subject and body composition
- Scheduled email campaigns
- Configurable start time
- Configurable delay between emails
- Configurable hourly sending limit
- BullMQ delayed jobs
- Redis-backed scheduling
- PostgreSQL persistence using Prisma
- Worker concurrency configuration
- Redis-backed minimum-send-delay coordination
- Redis-backed hourly rate limiting
- Automatic rescheduling when hourly limit is reached
- Ethereal SMTP email delivery
- Elasticsearch indexing and email search
- Slack OAuth connection
- Slack channel selection
- Slack notification when hourly email limit is reached
- Bull Board live queue dashboard
- Scheduled Emails dashboard
- Sent Emails dashboard
- Loading, empty and error states
- Persistent state across backend restarts

---

## Architecture

```text
                    ┌─────────────────────┐
                    │      React UI       │
                    │  TypeScript + CSS   │
                    └──────────┬──────────┘
                               │ REST / OAuth
                               ▼
                    ┌─────────────────────┐
                    │  Express + Node.js  │
                    │    TypeScript       │
                    └─────┬────┬────┬─────┘
                          │    │    │
             ┌────────────┘    │    └──────────────┐
             ▼                 ▼                   ▼
      ┌─────────────┐   ┌─────────────┐   ┌──────────────┐
      │ PostgreSQL  │   │    Redis    │   │ Elasticsearch│
      │   Prisma    │   │ BullMQ/jobs │   │    Search    │
      └─────────────┘   └──────┬──────┘   └──────────────┘
                               │
                               ▼
                       ┌───────────────┐
                       │ BullMQ Worker │
                       └───────┬───────┘
                               │
                               ▼
                       ┌───────────────┐
                       │ Ethereal SMTP │
                       └───────────────┘

                    Slack OAuth / API
                         ▲
                         │
                  ┌──────┴───────┐
                  │ Slack Service│
                  └──────────────┘