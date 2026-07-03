import Link from 'next/link';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-gray-300">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <div className="inline-flex flex-col items-center bg-white/10 border border-white/15 rounded-xl px-4 py-2">
                <span className="text-white font-black text-lg tracking-widest leading-none">RNVS</span>
                <span className="text-white/60 text-[8px] font-semibold tracking-[0.2em] uppercase leading-none mt-0.5">Inovative AI</span>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-4 leading-relaxed">
              Your one-stop destination for quality products. Powered by RNVS Inovative AI LLP.
            </p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                <a key={i} href="#" className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition-colors">
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Quick Links</h3>
            <ul className="space-y-2.5">
              {[
                ['Home', '/'],
                ['All Products', '/'],
                ['My Orders', '/account/orders'],
                ['Wishlist', '/account/wishlist'],
                ['Cart', '/cart'],
              ].map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-sm text-gray-400 hover:text-orange-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer service */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Customer Service</h3>
            <ul className="space-y-2.5">
              {[
                ['Help Center', '#'],
                ['Track Order', '/account/orders'],
                ['Returns & Refunds', '#'],
                ['Shipping Policy', '#'],
                ['Privacy Policy', '#'],
              ].map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-sm text-gray-400 hover:text-orange-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <MapPin size={15} className="text-orange-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-400">Bengaluru, Karnataka, India</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={15} className="text-orange-400 flex-shrink-0" />
                <span className="text-sm text-gray-400">+91 1234567890</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={15} className="text-orange-400 flex-shrink-0" />
                <span className="text-sm text-gray-400">support@rnvsecommerce.com</span>
              </li>
            </ul>
            <div className="mt-4 p-3 bg-slate-800 rounded-lg">
              <p className="text-xs text-gray-400">Payment methods accepted:</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {['Stripe', 'PayPal', 'COD'].map((m) => (
                  <span key={m} className="text-[10px] bg-slate-700 text-gray-300 px-2 py-1 rounded font-medium">{m}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-500">© 2026 RNVS Inovative AI LLP. All rights reserved.</p>
          <p className="text-xs text-gray-500">Made with ❤️ in India</p>
        </div>
      </div>
    </footer>
  );
}
