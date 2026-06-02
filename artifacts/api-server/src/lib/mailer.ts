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

const RESPONSE_CONFIGS: Record<string, { subject: string; headline: string; body: string; color: string }> = {
  suspension_lifted: {
    subject: "Your Suspension Has Been Lifted — Aozora",
    headline: "Great news — your suspension has been lifted!",
    body: "After reviewing your appeal, our admin team has decided to lift your account suspension. You may now log back into Aozora and continue using the platform normally.",
    color: "#10b981",
  },
  suspension_persists: {
    subject: "Your Appeal Has Been Reviewed — Suspension Upheld",
    headline: "Your suspension remains in effect.",
    body: "After carefully reviewing your appeal, our admin team has determined that the suspension on your account will remain in effect. If you have additional information or believe this decision was made in error, you may submit a new appeal through our Help Center.",
    color: "#ef4444",
  },
  decision_overturned: {
    subject: "Your Appeal Has Been Accepted — Decision Overturned",
    headline: "Your appeal has been accepted.",
    body: "After reviewing your appeal, our admin team has decided to overturn the previous decision. The relevant action has been reversed and your account status has been updated accordingly.",
    color: "#10b981",
  },
  rejection_stands: {
    subject: "Your Appeal Has Been Reviewed — Decision Stands",
    headline: "Our original decision has been upheld.",
    body: "After carefully reviewing your appeal, our admin team has determined that the original decision stands. If you have additional information or believe this was an error, you may submit a new appeal through our Help Center.",
    color: "#f97316",
  },
  takedown_reversed: {
    subject: "Your Appeal Has Been Accepted — Content Restored",
    headline: "Your content has been restored.",
    body: "After reviewing your appeal, our admin team has decided to reverse the takedown. Your listing has been restored and is now visible on the platform.",
    color: "#10b981",
  },
  takedown_upheld: {
    subject: "Your Appeal Has Been Reviewed — Takedown Upheld",
    headline: "The takedown has been upheld.",
    body: "After carefully reviewing your appeal, our admin team has determined that the takedown will remain in effect. If you believe this decision was made in error, you may submit a new appeal with additional context through our Help Center.",
    color: "#f97316",
  },
  request_resolved: {
    subject: "Your Support Request Has Been Resolved — Aozora",
    headline: "Your support request has been resolved.",
    body: "Our admin team has reviewed and resolved your support request. We hope your concern has been fully addressed. If you have further questions or need additional assistance, feel free to reach out again through our Help Center.",
    color: "#10b981",
  },
  request_denied: {
    subject: "Your Support Request Has Been Reviewed — Aozora",
    headline: "We were unable to fulfill your request.",
    body: "After reviewing your support request, our admin team was unable to fulfill it at this time. If you have additional context or believe this was a mistake, you are welcome to submit a new request through our Help Center.",
    color: "#f97316",
  },
  bug_fixed: {
    subject: "Your Bug Report Has Been Resolved — Aozora",
    headline: "Great news — the bug you reported has been fixed!",
    body: "Thank you for taking the time to report this issue. Our engineering team has identified and resolved the bug. The fix is now live and you should no longer experience this problem. If the issue persists, please don't hesitate to submit a new report.",
    color: "#10b981",
  },
  bug_in_progress: {
    subject: "Your Bug Report Is Being Worked On — Aozora",
    headline: "We're on it — your bug report is in progress.",
    body: "Thank you for reporting this issue. Our engineering team has acknowledged the bug and is actively working on a fix. We appreciate your patience and will have it resolved as soon as possible. You don't need to take any further action.",
    color: "#f59e0b",
  },
};

export async function sendSupportResponseEmail(opts: {
  to: string;
  name: string;
  ticketType: string;
  subject: string;
  responseType: string;
}): Promise<void> {
  const config = RESPONSE_CONFIGS[opts.responseType];
  if (!config) throw new Error(`Unknown responseType: ${opts.responseType}`);

  await transporter.sendMail({
    from: `"Aozora Support" <${process.env.GMAIL_USER}>`,
    to: opts.to,
    subject: config.subject,
    text: `${config.headline}\n\nRe: ${opts.ticketType} — "${opts.subject}"\n\nHello, ${opts.name}.\n\n${config.body}\n\n— Aozora Admin Team\n\nThis is a system-generated email. Please do not reply directly to this message.`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#ffffff;">
        <h2 style="color:#2563eb;margin:0 0 4px;font-size:22px;">Aozora</h2>
        <p style="color:#9ca3af;margin:0 0 28px;font-size:13px;">Home, but smarter.</p>

        <div style="border-left:4px solid ${config.color};padding:14px 18px;background:${config.color}18;border-radius:0 8px 8px 0;margin-bottom:24px;">
          <p style="font-size:17px;font-weight:700;color:#111827;margin:0 0 5px;">${config.headline}</p>
          <p style="font-size:12px;color:#6b7280;margin:0;">Re: <strong>${opts.ticketType}</strong> — "${opts.subject}"</p>
        </div>

        <p style="font-size:15px;color:#374151;margin:0 0 6px;">Hello, <strong>${opts.name}</strong>.</p>
        <p style="font-size:15px;color:#374151;line-height:1.65;margin:0 0 28px;">${config.body}</p>

        <p style="font-size:13px;color:#9ca3af;margin:0 0 4px;">Warm regards,</p>
        <p style="font-size:13px;color:#6b7280;font-weight:600;margin:0;">Aozora Admin Team</p>

        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="font-size:11px;color:#9ca3af;margin:0;line-height:1.5;">
          This is a system-generated message from Aozora. Please do not reply to this email directly.
          If you need further assistance, visit our Help Center.
        </p>
      </div>
    `,
  });
}
