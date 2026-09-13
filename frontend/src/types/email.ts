export interface Email {
  id: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt: string | null;
  status: "SCHEDULED" | "PROCESSING" | "SENT" | "FAILED" | "CANCELLED";
  attempts: number;
  error: string | null;
}