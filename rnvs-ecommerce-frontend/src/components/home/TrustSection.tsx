import { Truck, ShieldCheck, RotateCcw, Headphones } from 'lucide-react';

const ITEMS = [
  { Icon: Truck,       title: 'Free Delivery',    sub: 'On all orders above ₹1,000' },
  { Icon: ShieldCheck, title: 'Secure Payments',   sub: '100% protected checkout' },
  { Icon: RotateCcw,   title: 'Easy Returns',      sub: '7-day hassle-free returns' },
  { Icon: Headphones,  title: '24/7 Support',      sub: 'Always here to help you' },
];

export default function TrustSection() {
  return (
    <section className="border-y border-neutral-100 bg-white">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 lg:grid-cols-4 gap-6 py-8">
        {ITEMS.map(({ Icon, title, sub }) => (
          <div key={title} className="flex items-center gap-4">
            <div className="h-11 w-11 rounded-full bg-neutral-50 grid place-items-center text-neutral-900 flex-shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-neutral-900">{title}</div>
              <div className="text-xs text-neutral-500">{sub}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
