import { NextRequest, NextResponse } from 'next/server';
import { sendMail } from '@/lib/server/mailer';

function failureEmailHtml(vendorName: string, storeName: string, retryLink: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#1a1a2e,#0f3460);padding:32px 40px;">
      <p style="margin:0;font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px;">
        RNVS <span style="color:#f97316;">CommerceX</span>
      </p>
    </div>
    <div style="padding:36px 40px;">
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Payment Not Completed</h1>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        Hi ${vendorName}, it looks like your payment for <strong>${storeName}</strong> was not completed.
        Your account is created &mdash; activate now at just &#x20B9;2,999/month for your first 3 months.
      </p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:14px;color:#991b1b;">
          Your seller account is in <strong>Trial mode</strong>. Complete payment to activate it.
        </p>
      </div>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${retryLink}"
          style="display:inline-block;background:#f97316;color:#fff;font-weight:700;font-size:16px;padding:16px 40px;border-radius:10px;text-decoration:none;">
          Retry Payment &rarr;
        </a>
      </div>
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        Need help? Reply to this email or contact our seller support team.
      </p>
    </div>
    <div style="padding:20px 40px;border-top:1px solid #f3f4f6;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">&copy; 2026 RNVS Innovative AI LLP</p>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const { vendorEmail, vendorName, storeName } = await req.json();

    const retryLink = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/vendor/payment`;

    await sendMail({
      to: vendorEmail,
      subject: 'Payment Not Completed — Activate Your Store',
      html: failureEmailHtml(vendorName ?? 'Seller', storeName ?? 'Your Store', retryLink),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[payment-failed]', err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
