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

export async function sendSuspensionLiftedEmail(opts: {
  to: string;
  name: string;
}): Promise<void> {
  const subject = "Your Account Access Has Been Fully Restored";
  const text =
    `Dear ${opts.name},\n\n` +
    `We are writing to inform you that your temporary account suspension period has concluded, ` +
    `and full access to your account has been successfully restored.\n\n` +
    `You may now log back into the platform and resume normal activity effective immediately.\n\n` +
    `Important Reminder: Please take a moment to review our official Community Guidelines and Terms of Service. ` +
    `To ensure a safe and respectful environment for everyone, future compliance with these policies is required. ` +
    `Additional infractions may result in permanent account termination.\n\n` +
    `If you experience any technical difficulties logging back in or resetting your credentials, ` +
    `please reach out to our team by replying to this message or visiting the support center.\n\n` +
    `Welcome back,\n\nAozora Admin\naozora.dormfinder.admin@gmail.com`;

  const html = `
    <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;background:#ffffff;">
      <h2 style="color:#2563eb;margin:0 0 4px;font-size:22px;">Aozora</h2>
      <p style="color:#9ca3af;margin:0 0 28px;font-size:13px;">Home, but smarter.</p>

      <div style="border-left:4px solid #10b981;padding:14px 18px;background:#10b98112;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="font-size:17px;font-weight:700;color:#111827;margin:0 0 4px;">Your Account Access Has Been Fully Restored</p>
        <p style="font-size:13px;color:#6b7280;margin:0;">Suspension period concluded</p>
      </div>

      <p style="font-size:15px;color:#374151;margin:0 0 6px;">Dear <strong>${opts.name}</strong>,</p>
      <p style="font-size:15px;color:#374151;line-height:1.65;margin:0 0 16px;">
        We are writing to inform you that your temporary account suspension period has concluded,
        and full access to your account has been successfully restored.
      </p>
      <p style="font-size:15px;color:#374151;line-height:1.65;margin:0 0 16px;">
        You may now log back into the platform and resume normal activity effective immediately.
      </p>

      <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
        <p style="font-size:13px;font-weight:700;color:#92400e;margin:0 0 4px;">⚠ Important Reminder</p>
        <p style="font-size:13px;color:#78350f;line-height:1.55;margin:0;">
          Please take a moment to review our official Community Guidelines and Terms of Service.
          To ensure a safe and respectful environment for everyone, future compliance with these policies is required.
          <strong>Additional infractions may result in permanent account termination.</strong>
        </p>
      </div>

      <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 24px;">
        If you experience any technical difficulties logging back in or resetting your credentials,
        please reach out to our team by replying to this message or visiting the support center.
      </p>

      <p style="font-size:14px;color:#374151;margin:0 0 2px;">Welcome back,</p>
      <p style="font-size:14px;color:#111827;font-weight:700;margin:0 0 2px;">Aozora Admin</p>
      <p style="font-size:13px;color:#6b7280;margin:0;">aozora.dormfinder.admin@gmail.com</p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="font-size:11px;color:#9ca3af;margin:0;line-height:1.5;">
        This is a system-generated message from Aozora. If you need further assistance, visit our Help Center.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Aozora Admin" <${process.env.GMAIL_USER}>`,
    to: opts.to,
    subject,
    text,
    html,
  });
}

export async function sendAppealApprovedEmail(opts: {
  to: string;
  name: string;
}): Promise<void> {
  const subject = "Account Suspension Lifted (Appeal Approved)";

  const text =
    `Dear ${opts.name},\n\n` +
    `We have successfully reviewed the appeal you submitted regarding your recent account suspension. ` +
    `After a careful re-evaluation of your case and the context provided, we are pleased to inform you that your appeal has been approved.\n\n` +
    `As a result, your suspension has been lifted early, and full access to your Aozora account has been successfully restored effective immediately.\n\n` +
    `Important Reminder:\n\n` +
    `While your access has been restored, we kindly ask you to review our official Community Guidelines and Terms of Service. ` +
    `Maintaining a safe, reliable, and respectful environment is essential for everyone in our community. ` +
    `Please ensure all future activity complies with these policies, as subsequent infractions may lead to permanent account restriction.\n\n` +
    `You can now log back into the platform and resume your normal activities. ` +
    `If you encounter any technical issues or have trouble accessing your profile, please let us know.\n\n` +
    `Welcome back,\n\nAozora Admin Team\naozora.dormfinder.admin@gmail.com`;

  const html = `
    <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;background:#ffffff;">
      <h2 style="color:#2563eb;margin:0 0 4px;font-size:22px;">Aozora</h2>
      <p style="color:#9ca3af;margin:0 0 28px;font-size:13px;">Home, but smarter.</p>

      <div style="border-left:4px solid #10b981;padding:14px 18px;background:#10b98112;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="font-size:17px;font-weight:700;color:#111827;margin:0 0 4px;">Account Suspension Lifted (Appeal Approved)</p>
        <p style="font-size:13px;color:#6b7280;margin:0;">Full access to your account has been restored</p>
      </div>

      <p style="font-size:15px;color:#374151;margin:0 0 6px;">Dear <strong>${opts.name}</strong>,</p>
      <p style="font-size:15px;color:#374151;line-height:1.65;margin:0 0 16px;">
        We have successfully reviewed the appeal you submitted regarding your recent account suspension.
        After a careful re-evaluation of your case and the context provided, we are pleased to inform you that your appeal has been approved.
      </p>
      <p style="font-size:15px;color:#374151;line-height:1.65;margin:0 0 20px;">
        As a result, your suspension has been lifted early, and full access to your Aozora account has been successfully restored effective immediately.
      </p>

      <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
        <p style="font-size:13px;font-weight:700;color:#92400e;margin:0 0 6px;">Important Reminder</p>
        <p style="font-size:13px;color:#78350f;line-height:1.6;margin:0;">
          While your access has been restored, we kindly ask you to review our official Community Guidelines and Terms of Service.
          Maintaining a safe, reliable, and respectful environment is essential for everyone in our community.
          Please ensure all future activity complies with these policies, as <strong>subsequent infractions may lead to permanent account restriction.</strong>
        </p>
      </div>

      <p style="font-size:14px;color:#374151;line-height:1.65;margin:0 0 24px;">
        You can now log back into the platform and resume your normal activities.
        If you encounter any technical issues or have trouble accessing your profile, please let us know.
      </p>

      <p style="font-size:14px;color:#374151;margin:0 0 2px;">Welcome back,</p>
      <p style="font-size:14px;color:#111827;font-weight:700;margin:0 0 2px;">Aozora Admin Team</p>
      <p style="font-size:13px;color:#6b7280;margin:0;">aozora.dormfinder.admin@gmail.com</p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="font-size:11px;color:#9ca3af;margin:0;line-height:1.5;">
        This is a system-generated message from Aozora. If you need further assistance, visit our Help Center.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Aozora Admin" <${process.env.GMAIL_USER}>`,
    to: opts.to,
    subject,
    text,
    html,
  });
}

export async function sendAppealDeniedEmail(opts: {
  to: string;
  name: string;
  restorationDate: string;
  reason?: string;
}): Promise<void> {
  const subject = "Notice of Continued Account Suspension";
  const reason = opts.reason ?? "Confirmed violation of community standards";

  const text =
    `Dear ${opts.name},\n\n` +
    `We have completed our review of your account status following your recent appeal or inquiry regarding your suspension. ` +
    `After a careful evaluation of the evidence and context surrounding the violation, we regret to inform you that your appeal has been denied.\n\n` +
    `The initial disciplinary action stands, and your account will remain suspended for the duration of the originally specified period.\n\n` +
    `Current Status: Suspension Maintained\n\n` +
    `Reason for Persistence: ${reason}\n\n` +
    `Restoration Date: ${opts.restorationDate}\n\n` +
    `Policy Reminder:\n\n` +
    `Aozora Admin Team enforces these policies strictly to maintain a secure and reliable platform for all users. ` +
    `Bypassing or violating these guidelines compromises community safety.\n\n` +
    `What Happens Next?\n` +
    `Your access to log in, view your profile, or interact on the Aozora platform will remain restricted until the Restoration Date listed above. ` +
    `Once this period concludes, your account access will be automatically restored, provided there are no further policy infractions.\n\n` +
    `Please note that any further violations upon your return will result in harsher penalties, up to and including a permanent ban from the platform.\n\n` +
    `Sincerely,\n\nAozora Admin Team\naozora.dormfinder.admin@gmail.com`;

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff;">
      <h2 style="color:#2563eb;margin:0 0 4px;font-size:22px;">Aozora</h2>
      <p style="color:#9ca3af;margin:0 0 28px;font-size:13px;">Home, but smarter.</p>

      <div style="border-left:4px solid #ef4444;padding:14px 18px;background:#ef444412;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="font-size:17px;font-weight:700;color:#111827;margin:0 0 4px;">Notice of Continued Account Suspension</p>
        <p style="font-size:13px;color:#6b7280;margin:0;">Your appeal has been reviewed and denied</p>
      </div>

      <p style="font-size:15px;color:#374151;margin:0 0 6px;">Dear <strong>${opts.name}</strong>,</p>
      <p style="font-size:15px;color:#374151;line-height:1.65;margin:0 0 16px;">
        We have completed our review of your account status following your recent appeal or inquiry regarding your suspension.
        After a careful evaluation of the evidence and context surrounding the violation, we regret to inform you that your appeal has been denied.
      </p>
      <p style="font-size:15px;color:#374151;line-height:1.65;margin:0 0 20px;">
        The initial disciplinary action stands, and your account will remain suspended for the duration of the originally specified period.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr style="background:#fef2f2;">
          <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#374151;border:1px solid #fecaca;width:40%;">Current Status</td>
          <td style="padding:10px 14px;font-size:13px;color:#ef4444;font-weight:700;border:1px solid #fecaca;">Suspension Maintained</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#374151;border:1px solid #e5e7eb;border-top:none;">Reason for Persistence</td>
          <td style="padding:10px 14px;font-size:13px;color:#111827;border:1px solid #e5e7eb;border-top:none;">${reason}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#374151;border:1px solid #e5e7eb;border-top:none;">Restoration Date</td>
          <td style="padding:10px 14px;font-size:13px;color:#374151;font-weight:600;border:1px solid #e5e7eb;border-top:none;">${opts.restorationDate}</td>
        </tr>
      </table>

      <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
        <p style="font-size:13px;font-weight:700;color:#92400e;margin:0 0 6px;">Policy Reminder</p>
        <p style="font-size:13px;color:#78350f;line-height:1.6;margin:0;">
          Aozora Admin Team enforces these policies strictly to maintain a secure and reliable platform for all users.
          Bypassing or violating these guidelines compromises community safety.
        </p>
      </div>

      <p style="font-size:14px;font-weight:700;color:#111827;margin:0 0 6px;">What Happens Next?</p>
      <p style="font-size:14px;color:#374151;line-height:1.65;margin:0 0 16px;">
        Your access to log in, view your profile, or interact on the Aozora platform will remain restricted until the Restoration Date listed above.
        Once this period concludes, your account access will be automatically restored, provided there are no further policy infractions.
      </p>
      <p style="font-size:14px;color:#374151;line-height:1.65;margin:0 0 24px;">
        Please note that any further violations upon your return will result in harsher penalties, up to and including
        <strong>a permanent ban from the platform.</strong>
      </p>

      <p style="font-size:14px;color:#374151;margin:0 0 2px;">Sincerely,</p>
      <p style="font-size:14px;color:#111827;font-weight:700;margin:0 0 2px;">Aozora Admin Team</p>
      <p style="font-size:13px;color:#6b7280;margin:0;">aozora.dormfinder.admin@gmail.com</p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="font-size:11px;color:#9ca3af;margin:0;line-height:1.5;">
        This is a system-generated message from Aozora. If you need further assistance, please reach out via our Help Center.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Aozora Admin" <${process.env.GMAIL_USER}>`,
    to: opts.to,
    subject,
    text,
    html,
  });
}

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

export async function sendSuspensionNoticeEmail(opts: {
  to: string;
  name: string;
  violationCategory: string;
  suspensionPeriod: string;
  restorationDate: string;
}): Promise<void> {
  const subject = "Notice of Account Suspension";

  const text =
    `Dear ${opts.name},\n\n` +
    `We are writing to notify you that your account has been temporarily suspended due to a violation of our community policies.\n\n` +
    `Violation Category: ${opts.violationCategory}\n\n` +
    `Suspension Period: ${opts.suspensionPeriod}\n\n` +
    `Restoration Date: ${opts.restorationDate}\n\n` +
    `Policy Reminder:\n\n` +
    `Aozora Admin Team is committed to maintaining a safe, fair, and respectful platform for all users. ` +
    `Activities that disrupt this environment or bypass our guidelines are strictly prohibited.\n\n` +
    `What Happens Next?\n` +
    `During this suspension period, you will be unable to log in, access your profile, or interact on the platform. ` +
    `Your access will be automatically restored on the Restoration Date noted above, provided there are no further complications.\n\n` +
    `Please use this time to review our guidelines so you can safely resume your activities once the suspension is lifted. ` +
    `Please note that subsequent violations following this suspension may result in a permanent ban.\n\n` +
    `If you believe this action was taken in error and wish to submit an appeal, please reach out via our support portal.\n\n` +
    `Sincerely,\n\nAozora Admin Team\naozora.dormfinder.admin@gmail.com`;

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff;">
      <h2 style="color:#2563eb;margin:0 0 4px;font-size:22px;">Aozora</h2>
      <p style="color:#9ca3af;margin:0 0 28px;font-size:13px;">Home, but smarter.</p>

      <div style="border-left:4px solid #ef4444;padding:14px 18px;background:#ef444412;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="font-size:17px;font-weight:700;color:#111827;margin:0 0 4px;">Notice of Account Suspension</p>
        <p style="font-size:13px;color:#6b7280;margin:0;">Your account has been temporarily suspended</p>
      </div>

      <p style="font-size:15px;color:#374151;margin:0 0 6px;">Dear <strong>${opts.name}</strong>,</p>
      <p style="font-size:15px;color:#374151;line-height:1.65;margin:0 0 20px;">
        We are writing to notify you that your account has been temporarily suspended due to a violation of our community policies.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr style="background:#f9fafb;">
          <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#374151;border:1px solid #e5e7eb;border-radius:4px 0 0 4px;width:40%;">Violation Category</td>
          <td style="padding:10px 14px;font-size:13px;color:#111827;border:1px solid #e5e7eb;">${opts.violationCategory}</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#374151;border:1px solid #e5e7eb;border-top:none;">Suspension Period</td>
          <td style="padding:10px 14px;font-size:13px;color:#111827;border:1px solid #e5e7eb;border-top:none;">${opts.suspensionPeriod}</td>
        </tr>
        <tr style="background:#fef2f2;">
          <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#374151;border:1px solid #e5e7eb;border-top:none;">Restoration Date</td>
          <td style="padding:10px 14px;font-size:13px;color:#ef4444;font-weight:600;border:1px solid #e5e7eb;border-top:none;">${opts.restorationDate}</td>
        </tr>
      </table>

      <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
        <p style="font-size:13px;font-weight:700;color:#92400e;margin:0 0 6px;">Policy Reminder</p>
        <p style="font-size:13px;color:#78350f;line-height:1.6;margin:0;">
          Aozora Admin Team is committed to maintaining a safe, fair, and respectful platform for all users.
          Activities that disrupt this environment or bypass our guidelines are strictly prohibited.
        </p>
      </div>

      <p style="font-size:14px;font-weight:700;color:#111827;margin:0 0 6px;">What Happens Next?</p>
      <p style="font-size:14px;color:#374151;line-height:1.65;margin:0 0 16px;">
        During this suspension period, you will be unable to log in, access your profile, or interact on the platform.
        Your access will be automatically restored on the Restoration Date noted above, provided there are no further complications.
      </p>
      <p style="font-size:14px;color:#374151;line-height:1.65;margin:0 0 16px;">
        Please use this time to review our guidelines so you can safely resume your activities once the suspension is lifted.
        Please note that subsequent violations following this suspension may result in a permanent ban.
      </p>
      <p style="font-size:14px;color:#374151;line-height:1.65;margin:0 0 24px;">
        If you believe this action was taken in error and wish to submit an appeal, please reach out via our support portal.
      </p>

      <p style="font-size:14px;color:#374151;margin:0 0 2px;">Sincerely,</p>
      <p style="font-size:14px;color:#111827;font-weight:700;margin:0 0 2px;">Aozora Admin Team</p>
      <p style="font-size:13px;color:#6b7280;margin:0;">aozora.dormfinder.admin@gmail.com</p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="font-size:11px;color:#9ca3af;margin:0;line-height:1.5;">
        This is a system-generated message from Aozora. If you need further assistance, please reach out via our support portal.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Aozora Admin" <${process.env.GMAIL_USER}>`,
    to: opts.to,
    subject,
    text,
    html,
  });
}

export async function sendVerificationApprovedEmail(opts: {
  to: string;
  name: string;
  approvalDate: string;
}): Promise<void> {
  const subject = "Identity Verification Approved";

  const text =
    `Dear ${opts.name},\n\n` +
    `Great news! We are pleased to inform you that your identity verification application has been successfully reviewed and approved.\n\n` +
    `Your profile has now been updated to reflect your verified status, granting you full access to all verified features on the platform.\n\n` +
    `Status: Verified\n` +
    `Approval Date: ${opts.approvalDate}\n\n` +
    `What this means for you:\n\n` +
    `You can now securely interact with the community, list or browse properties, and utilize advanced platform features with a verified badge.\n\n` +
    `Thank you for helping us maintain a safe and trusted community environment. If you have any questions or need further assistance with your account, please visit our support center.\n\n` +
    `Best regards,\n\nAozora Admin Team\naozora.dormfinder.admin@gmail.com`;

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff;">
      <h2 style="color:#2563eb;margin:0 0 4px;font-size:22px;">Aozora</h2>
      <p style="color:#9ca3af;margin:0 0 28px;font-size:13px;">Home, but smarter.</p>

      <div style="border-left:4px solid #10b981;padding:14px 18px;background:#10b98112;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="font-size:17px;font-weight:700;color:#111827;margin:0 0 4px;">Identity Verification Approved</p>
        <p style="font-size:13px;color:#6b7280;margin:0;">Your identity has been successfully verified</p>
      </div>

      <p style="font-size:15px;color:#374151;margin:0 0 6px;">Dear <strong>${opts.name}</strong>,</p>
      <p style="font-size:15px;color:#374151;line-height:1.65;margin:0 0 20px;">
        Great news! We are pleased to inform you that your identity verification application has been successfully reviewed and approved.
      </p>
      <p style="font-size:15px;color:#374151;line-height:1.65;margin:0 0 24px;">
        Your profile has now been updated to reflect your verified status, granting you full access to all verified features on the platform.
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr style="background:#f0fdf4;">
          <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#374151;border:1px solid #d1fae5;width:40%;">Status</td>
          <td style="padding:10px 14px;font-size:13px;color:#10b981;font-weight:700;border:1px solid #d1fae5;">&#10003; Verified</td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#374151;border:1px solid #e5e7eb;border-top:none;">Approval Date</td>
          <td style="padding:10px 14px;font-size:13px;color:#111827;border:1px solid #e5e7eb;border-top:none;">${opts.approvalDate}</td>
        </tr>
      </table>

      <p style="font-size:14px;font-weight:700;color:#111827;margin:0 0 6px;">What this means for you:</p>
      <p style="font-size:14px;color:#374151;line-height:1.65;margin:0 0 24px;">
        You can now securely interact with the community, list or browse properties, and utilize advanced platform features with a verified badge.
      </p>
      <p style="font-size:14px;color:#374151;line-height:1.65;margin:0 0 24px;">
        Thank you for helping us maintain a safe and trusted community environment. If you have any questions or need further assistance with your account, please visit our support center.
      </p>

      <p style="font-size:14px;color:#374151;margin:0 0 2px;">Best regards,</p>
      <p style="font-size:14px;color:#111827;font-weight:700;margin:0 0 2px;">Aozora Admin Team</p>
      <p style="font-size:13px;color:#6b7280;margin:0;">aozora.dormfinder.admin@gmail.com</p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="font-size:11px;color:#9ca3af;margin:0;line-height:1.5;">
        This is a system-generated message from Aozora. If you need further assistance, please reach out via our support portal.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Aozora Admin" <${process.env.GMAIL_USER}>`,
    to: opts.to,
    subject,
    text,
    html,
  });
}

export async function sendVerificationRejectedEmail(opts: {
  to: string;
  name: string;
  rejectionReasons: string;
  reviewDate: string;
}): Promise<void> {
  const subject = "Update on Your Identity Verification Application";

  const reasonLines = opts.rejectionReasons
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const reasonTextList = reasonLines.map((l) => `• ${l}`).join("\n");
  const reasonHtmlList = reasonLines
    .map((l) => `<li style="margin-bottom:4px;">${l}</li>`)
    .join("");

  const text =
    `Dear ${opts.name},\n\n` +
    `Thank you for submitting your identity verification application. We have carefully reviewed the information and documents you provided.\n\n` +
    `Regrettably, we are unable to approve your application at this time due to the following reason(s):\n\n` +
    `Reason for Rejection:\n${reasonTextList}\n\n` +
    `Review Date: ${opts.reviewDate}\n\n` +
    `What this means for you:\n\n` +
    `Your profile will temporarily remain unverified, and access to certain advanced features—such as listing properties or contacting specific users—may be restricted until your identity can be successfully verified.\n\n` +
    `How to Resubmit Your Application\n` +
    `We welcome you to try again! To ensure a successful approval on your next attempt, please make sure that:\n\n` +
    `• The uploaded ID is valid and not expired.\n` +
    `• The image is clear, well-lit, and all text is easily readable.\n` +
    `• The name and details on your ID match the information provided in your Aozora account profile.\n\n` +
    `You can submit a new verification request directly through the Identity Verification section of your account profile.\n\n` +
    `If you believe this decision was made in error or if you need assistance regarding your documents, please reach out to our team.\n\n` +
    `Best regards,\n\nAozora Admin Team\naozora.dormfinder.admin@gmail.com`;

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff;">
      <h2 style="color:#2563eb;margin:0 0 4px;font-size:22px;">Aozora</h2>
      <p style="color:#9ca3af;margin:0 0 28px;font-size:13px;">Home, but smarter.</p>

      <div style="border-left:4px solid #f59e0b;padding:14px 18px;background:#fef3c712;border-radius:0 8px 8px 0;margin-bottom:24px;">
        <p style="font-size:17px;font-weight:700;color:#111827;margin:0 0 4px;">Update on Your Verification Application</p>
        <p style="font-size:13px;color:#6b7280;margin:0;">We were unable to approve your application at this time</p>
      </div>

      <p style="font-size:15px;color:#374151;margin:0 0 6px;">Dear <strong>${opts.name}</strong>,</p>
      <p style="font-size:15px;color:#374151;line-height:1.65;margin:0 0 20px;">
        Thank you for submitting your identity verification application. We have carefully reviewed the information and documents you provided.
      </p>
      <p style="font-size:15px;color:#374151;line-height:1.65;margin:0 0 16px;">
        Regrettably, we are unable to approve your application at this time due to the following reason(s):
      </p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr style="background:#fef2f2;">
          <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#374151;border:1px solid #fecaca;width:40%;vertical-align:top;">Reason for Rejection</td>
          <td style="padding:12px 14px;font-size:13px;color:#ef4444;border:1px solid #fecaca;">
            <ul style="margin:0;padding:0 0 0 16px;">${reasonHtmlList}</ul>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 14px;font-size:13px;font-weight:600;color:#374151;border:1px solid #e5e7eb;border-top:none;">Review Date</td>
          <td style="padding:10px 14px;font-size:13px;color:#111827;border:1px solid #e5e7eb;border-top:none;">${opts.reviewDate}</td>
        </tr>
      </table>

      <p style="font-size:14px;font-weight:700;color:#111827;margin:0 0 6px;">What this means for you:</p>
      <p style="font-size:14px;color:#374151;line-height:1.65;margin:0 0 24px;">
        Your profile will temporarily remain unverified, and access to certain advanced features—such as listing properties or contacting specific users—may be restricted until your identity can be successfully verified.
      </p>

      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
        <p style="font-size:13px;font-weight:700;color:#0c4a6e;margin:0 0 8px;">How to Resubmit Your Application</p>
        <p style="font-size:13px;color:#0369a1;line-height:1.6;margin:0 0 8px;">We welcome you to try again! Please make sure that:</p>
        <ul style="margin:0;padding:0 0 0 16px;font-size:13px;color:#0369a1;line-height:1.8;">
          <li>The uploaded ID is valid and not expired.</li>
          <li>The image is clear, well-lit, and all text is easily readable.</li>
          <li>The name and details on your ID match the information provided in your Aozora account profile.</li>
        </ul>
      </div>

      <p style="font-size:14px;color:#374151;line-height:1.65;margin:0 0 24px;">
        You can submit a new verification request directly through the <strong>Identity Verification</strong> section of your account profile.
        If you believe this decision was made in error or need assistance, please reach out to our team.
      </p>

      <p style="font-size:14px;color:#374151;margin:0 0 2px;">Best regards,</p>
      <p style="font-size:14px;color:#111827;font-weight:700;margin:0 0 2px;">Aozora Admin Team</p>
      <p style="font-size:13px;color:#6b7280;margin:0;">aozora.dormfinder.admin@gmail.com</p>

      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
      <p style="font-size:11px;color:#9ca3af;margin:0;line-height:1.5;">
        This is a system-generated message from Aozora. If you need further assistance, please reach out via our support portal.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Aozora Admin" <${process.env.GMAIL_USER}>`,
    to: opts.to,
    subject,
    text,
    html,
  });
}
