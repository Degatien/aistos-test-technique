import "dotenv/config";

export interface MailRecipient {
  email: string;
  name?: string;
}

export interface SendMailOptions {
  to: MailRecipient;
  subject: string;
  text: string;
}

/** Send an email through the Mailpit HTTP API (test mail server). */
export async function sendMail({ to, subject, text }: SendMailOptions): Promise<void> {
  const baseUrl = process.env.MAILPIT_URL ?? "http://localhost:8025";

  const res = await fetch(`${baseUrl}/api/v1/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      From: { Email: "rappels@aistos.fr", Name: "Aistos — Recouvrement" },
      To: [{ Email: to.email, Name: to.name }],
      Subject: subject,
      Text: text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Mailpit send failed with status ${res.status}`);
  }
}