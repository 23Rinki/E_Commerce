import { NextRequest, NextResponse } from 'next/server';
import { sendMail } from '@/lib/server/mailer';

function paymentLinkHtml(vendorName: string, storeName: string, paymentLink: string) {
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
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Activate Your Store</h1>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        Hi ${vendorName}, your seller account for <strong>${storeName}</strong> has been created!
        One last step &mdash; pay your first month's subscription to go live.
      </p>
      <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#ea580c;text-transform:uppercase;">Introductory Offer</p>
        <p style="margin:0;font-size:36px;font-weight:900;color:#c2410c;">&#x20B9;2,999<span style="font-size:16px;font-weight:600;">/month</span></p>
        <p style="margin:4px 0 0;font-size:12px;color:#9a3412;">First 3 months · then &#x20B9;4,999/month · cancel anytime</p>
      </div>
      <ul style="margin:8px 0 24px;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">
        <li>Dedicated store database &mdash; fully isolated from other sellers</li>
        <li>Unlimited product listings</li>
        <li>Order management &amp; analytics dashboard</li>
        <li>Custom branding, employee management &amp; ongoing support</li>
      </ul>
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${paymentLink}"
          style="display:inline-block;background:#f97316;color:#fff;font-weight:700;font-size:16px;padding:16px 40px;border-radius:10px;text-decoration:none;">
          Pay &#x20B9;2,999 &amp; Activate Store &rarr;
        </a>
      </div>
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        Secure payment powered by Razorpay. Link valid for 7 days.
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const paymentLink = `${appUrl}/vendor/payment`;

    await sendMail({
      to: vendorEmail,
      subject: 'One Last Step — Activate Your Store at ₹2,999/month',
      html: paymentLinkHtml(vendorName ?? 'Seller', storeName ?? 'Your Store', paymentLink),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[send-payment-email]', err);
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
}
