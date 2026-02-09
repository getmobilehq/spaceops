import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendReportEmail(params: {
  to: string[];
  buildingName: string;
  pdfBuffer: Uint8Array;
  reportDate: string;
}): Promise<void> {
  const { to, buildingName, pdfBuffer, reportDate } = params;

  const fromAddress =
    process.env.RESEND_FROM_EMAIL ?? "reports@spaceops.app";

  const resend = getResend();
  await resend.emails.send({
    from: `SpaceOps Reports <${fromAddress}>`,
    to,
    subject: `Inspection Report — ${buildingName} (${reportDate})`,
    html: `
      <div style="font-family: sans-serif; color: #334155;">
        <h2 style="color: #111827;">Inspection Report</h2>
        <p>The daily inspection report for <strong>${buildingName}</strong> is attached.</p>
        <p style="color: #64748B; font-size: 13px;">
          Report date: ${reportDate}<br/>
          Generated automatically by SpaceOps
        </p>
      </div>
    `,
    attachments: [
      {
        filename: `SpaceOps_Report_${buildingName.replace(/\s+/g, "_")}_${reportDate}.pdf`,
        content: Buffer.from(pdfBuffer),
      },
    ],
  });
}
