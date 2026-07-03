import { Truck, ShieldCheck, RotateCcw, Headphones } from 'lucide-react';

const ITEMS = [
  {
    Icon:    Truck,
    iconBg:  '#f0fdf4',
    iconColor: '#22c55e',
    title:   'Free Delivery',
    sub:     'On all orders above ₹1,000',
  },
  {
    Icon:    ShieldCheck,
    iconBg:  '#eff6ff',
    iconColor: '#3b82f6',
    title:   'Secure Payments',
    sub:     '100% protected checkout',
  },
  {
    Icon:    RotateCcw,
    iconBg:  '#fff7ed',
    iconColor: '#f97316',
    title:   'Easy Returns',
    sub:     '7-day hassle-free returns',
  },
  {
    Icon:    Headphones,
    iconBg:  '#faf5ff',
    iconColor: '#a855f7',
    title:   '24/7 Support',
    sub:     'Always here to help you',
  },
];

export default function TrustSection() {
  return (
    <section className="bg-white border-t border-b border-gray-100 py-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {ITEMS.map(({ Icon, iconBg, iconColor, title, sub }) => (
            <div key={title} className="flex items-center gap-4">
              {/* Icon container */}
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: iconBg }}
              >
                <Icon size={22} style={{ color: iconColor }} />
              </div>
              {/* Text */}
              <div>
                <h4 className="text-sm font-bold text-slate-800">{title}</h4>
                <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
