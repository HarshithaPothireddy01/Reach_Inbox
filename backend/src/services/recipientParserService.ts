import { parse } from "csv-parse/sync";

export function parseRecipients(
  fileContent: string
): string[] {
  const records = parse(fileContent, {
    skip_empty_lines: true,
    relax_column_count: true,
  });

  const emails: string[] = [];

  for (const row of records) {
    for (const value of row) {
      const email = String(value).trim();

      if (
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ) {
        emails.push(email.toLowerCase());
      }
    }
  }

  return [...new Set(emails)];
}