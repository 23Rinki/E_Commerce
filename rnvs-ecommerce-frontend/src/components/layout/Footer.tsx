import Link from 'next/link';
import { ArrowRight, Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';

const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: 'Shop',
    links: [
      ['All Products', '/products'],
      ['Your Cart', '/cart'],
      ['Wishlist', '/account/wishlist'],
      ['Sell on RNVS', '/sell'],
    ],
  },
  {
    title: 'Help',
    links: [
      ['Your Account', '/account'],
      ['Track an Order', '/account/orders'],
      ['Saved Addresses', '/account/addresses'],
      ['Terms & Privacy', '/terms'],
    ],
  },
];

const SOCIALS = [
  { Icon: Instagram, label: 'Instagram' },
  { Icon: Facebook,  label: 'Facebook' },
  { Icon: Twitter,   label: 'Twitter' },
  { Icon: Youtube,   label: 'YouTube' },
];

export default function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-100">
      <div className="max-w-7xl mx-auto px-4 py-14 lg:py-20">
        <div className="grid grid-cols-2 lg:grid-cols-12 gap-10">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-5">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-neutral-900 grid place-items-center text-white font-display text-sm">R</div>
              <div className="font-display text-xl tracking-tight text-neutral-900">RNVS CommerceX</div>
            </Link>
            <p className="mt-4 text-sm text-neutral-500 leading-relaxed max-w-sm">
              Quality products from trusted vendors, at prices you&apos;ll love. Powered by RNVS Inovative AI LLP.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex items-center rounded-full bg-neutral-900 text-white hover:bg-neutral-800 h-11 px-6 text-sm font-medium transition-colors"
            >
              Start shopping <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title} className="lg:col-span-2">
              <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">{col.title}</div>
              <ul className="mt-5 space-y-3">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-neutral-700 hover:text-neutral-950 transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact */}
          <div className="col-span-2 lg:col-span-3">
            <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">Contact</div>
            <ul className="mt-5 space-y-3 text-sm text-neutral-700">
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 text-neutral-400 flex-shrink-0" />
                Bengaluru, Karnataka, India
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                +91 1234567890
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                support@rnvsecommerce.com
              </li>
            </ul>
            <div className="mt-6 flex gap-2">
              {SOCIALS.map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="h-10 w-10 grid place-items-center rounded-full border border-neutral-200 text-neutral-700 hover:bg-neutral-900 hover:text-white hover:border-neutral-900 transition-colors"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-neutral-100">
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-neutral-500">© {new Date().getFullYear()} RNVS Inovative AI LLP. All rights reserved.</p>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-neutral-500">
            <span>Secure payments</span>
            {['UPI', 'Cards', 'COD'].map((m) => (
              <span key={m} className="px-2.5 py-1 rounded-full border border-neutral-200 text-neutral-700 normal-case tracking-normal">{m}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
