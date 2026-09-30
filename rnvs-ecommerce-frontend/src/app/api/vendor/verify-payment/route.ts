import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sendMail } from '@/lib/server/mailer';
import { BACKEND_URL } from '@/lib/server/backend';

function successEmailHtml(vendorName: string, storeName: string, paymentId: string, plan: string) {
  const isYearly = plan === 'yearly';
  const amountText = isYearly ? '₹49,990 (annual plan — 2 months free)' : '₹2,999 (introductory offer)';
  const planLabel = isYearly ? 'Annual Plan — active for 1 year' : 'Monthly Plan — first 3 months at ₹2,999';

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
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#111827;">Payment Successful!</h1>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">
        Hi ${vendorName}, your subscription payment has been confirmed.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#16a34a;text-transform:uppercase;">Payment Details</p>
        <p style="margin:4px 0;font-size:14px;color:#166534;"><strong>Store:</strong> ${storeName}</p>
        <p style="margin:4px 0;font-size:14px;color:#166534;"><strong>Plan:</strong> ${planLabel}</p>
        <p style="margin:4px 0;font-size:14px;color:#166534;"><strong>Amount:</strong> &#x20B9;${amountText}</p>
        <p style="margin:4px 0;font-size:13px;color:#166534;"><strong>Payment ID:</strong> ${paymentId}</p>
      </div>
      <p style="margin:0 0 8px;color:#374151;font-size:14px;">Your seller account is now <strong>Active</strong>. You can:</p>
      <ul style="margin:8px 0 24px;padding-left:20px;color:#374151;font-size:14px;line-height:1.8;">
        <li>Add products to your store</li>
        <li>Manage orders and inventory</li>
        <li>Customize your store branding</li>
        <li>Track sales and analytics</li>
      </ul>
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/vendor/dashboard"
        style="display:inline-block;background:#f97316;color:#fff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">
        Go to Seller Dashboard &rarr;
      </a>
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
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      vendorToken,
      vendorEmail,
      vendorName,
      storeName,
      plan,
    } = await req.json();

    // Verify Razorpay signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      return NextResponse.json({ success: false, error: 'Payment verification failed' }, { status: 400 });
    }

    // Mark vendor as paid in backend — passes subscription type so the scheduler knows monthly vs yearly
    const markRes = await fetch(`${BACKEND_URL}/api/auth/mark-vendor-paid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${vendorToken}`,
      },
      body: JSON.stringify({
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        subscriptionType: plan === 'yearly' ? 'Yearly' : 'Monthly',
      }),
    });

    if (!markRes.ok) {
      console.error('[verify-payment] backend mark-paid failed', await markRes.text());
    }

    // Send success email
    await sendMail({
      to: vendorEmail,
      subject: 'Payment Successful — Your Store is Now Active!',
      html: successEmailHtml(vendorName ?? 'Seller', storeName ?? 'Your Store', razorpay_payment_id, plan ?? 'monthly'),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[verify-payment]', err);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
