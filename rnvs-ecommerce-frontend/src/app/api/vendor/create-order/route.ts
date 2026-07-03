import Razorpay from 'razorpay';
import { NextRequest, NextResponse } from 'next/server';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const { vendorEmail, storeName, plan } = await req.json();

    // Monthly: ₹2,999 (intro offer) | Yearly: ₹49,990 (2 months free)
    const amount = plan === 'yearly' ? 4999000 : 299900;

    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `vendor-sub-${Date.now()}`,
      notes: { vendorEmail: vendorEmail ?? '', storeName: storeName ?? '', plan: plan ?? 'monthly' },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err: any) {
    console.error('[create-order]', err);
    return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 });
  }
}
