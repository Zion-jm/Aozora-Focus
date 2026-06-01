import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await transporter.sendMail({
    from: `"Aozora" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Your Aozora verification code",
    text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
        <h2 style="color:#2563eb;margin:0 0 8px;">Aozora</h2>
        <p style="color:#6b7280;margin:0 0 32px;font-size:14px;">Home, but smarter.</p>
        <p style="font-size:16px;color:#111827;margin:0 0 16px;">
          Your verification code is:
        </p>
        <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
          <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#2563eb;">${code}</span>
        </div>
        <p style="font-size:14px;color:#6b7280;margin:0;">
          This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
        </p>
      </div>
    `,
  });
}
