interface HostingerMailInput {
  displayName: string;
  html: string;
  mailboxId: string;
  subject: string;
  text: string;
  to: string;
  token: string;
}

export async function sendHostingerMail(input: HostingerMailInput) {
  const response = await fetch(
    `https://api.mail.hostinger.com/api/v1/mailboxes/${encodeURIComponent(input.mailboxId)}/send`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        to: [input.to],
        displayName: input.displayName,
        subject: input.subject,
        text: input.text,
        html: input.html
      })
    }
  );

  if (!response.ok) {
    throw new Error(`Hostinger mail send failed with status ${response.status}.`);
  }
}
