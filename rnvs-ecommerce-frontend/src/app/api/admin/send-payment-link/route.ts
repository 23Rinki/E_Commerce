import { NextRequest, NextResponse } from 'next/server';
import { sendMail } from '@/lib/server/mailer';

function paymentLinkEmailHtml(vendorName: string, storeName: string, amount: number, description: string, paymentLink: string) {
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
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#111827;">Subscription Payment Due</h1>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        Hi ${vendorName}, your subscription payment for <strong>${storeName}</strong> is ready.
      </p>
      <div style="background:#fff8f0;border:2px solid #fed7aa;border-radius:10px;padding:20px;margin-bottom:24px;text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#9a3412;text-transform:uppercase;">Amount Due</p>
        <p style="margin:0;font-size:32px;font-weight:900;color:#1a1a2e;">&#x20B9;${amount.toLocaleString('en-IN')}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">${description}</p>
      </div>
      <a href="${paymentLink}"
        style="display:block;text-align:center;background:#f97316;color:#fff;font-weight:700;font-size:16px;padding:14px 28px;border-radius:10px;text-decoration:none;margin-bottom:16px;">
        Pay Now &rarr;
      </a>
      <p style="margin:0;text-align:center;font-size:12px;color:#9ca3af;">
        This link expires in 7 days. If you have any questions, reply to this email.
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
    const { vendorEmail, vendorName, storeName, amount, description } = await req.json();

    if (!vendorEmail || !amount) {
      return NextResponse.json({ success: false, error: 'vendorEmail and amount are required' }, { status: 400 });
    }

    // Create Razorpay payment link
    const authHeader = 'Basic ' + Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString('base64');

    const expireBy = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days

    const rzpRes = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // paise
        currency: 'INR',
        description: description || 'RNVS CommerceX Subscription',
        customer: { email: vendorEmail, name: vendorName || storeName || '' },
        notify: { email: false }, // we send our own email below
        reminder_enable: true,
        expire_by: expireBy,
      }),
    });

    if (!rzpRes.ok) {
      const err = await rzpRes.text();
      console.error('[send-payment-link] Razorpay error:', err);
      return NextResponse.json({ success: false, error: `Razorpay error: ${err}` }, { status: 500 });
    }

    const rzpData = await rzpRes.json();
    const paymentLink: string = rzpData.short_url;

    // Send email to vendor
    const desc = description || 'Monthly subscription';
    await sendMail({
      to: vendorEmail,
      subject: `Payment required — ₹${amount.toLocaleString('en-IN')} — RNVS CommerceX`,
      html: paymentLinkEmailHtml(vendorName || 'Seller', storeName || 'Your Store', amount, desc, paymentLink),
    });

    // WhatsApp-ready message for admin to copy
    const whatsappText =
      `Hi ${vendorName || 'there'}, your RNVS CommerceX subscription payment of ₹${amount.toLocaleString('en-IN')} is due for ${desc}. Please pay here: ${paymentLink}`;

    return NextResponse.json({ success: true, paymentLink, whatsappText });
  } catch (err: any) {
    console.error('[send-payment-link]', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
