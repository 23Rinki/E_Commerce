import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-3xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-neutral-900 font-semibold text-sm mb-6 hover:text-neutral-950 transition-colors">
            <ShoppingBag size={16} />
            RNVS CommerceX
          </Link>
          <h1 className="font-display tracking-tight text-3xl text-neutral-900">Terms and Conditions</h1>
          <p className="text-sm text-neutral-500 mt-2">RNVS Inovative AI LLP · Bangalore, Karnataka · Effective: June 2026</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-neutral-100 p-8 space-y-6 text-sm text-neutral-700 leading-relaxed">

          <section>
            <h2 className="font-display tracking-tight text-base text-neutral-900 mb-2">1. Who We Are</h2>
            <p>RNVS Inovative AI LLP ("we", "us", "the platform") operates CommerceX — a software platform that allows sellers ("vendors") to run their own online store.</p>
          </section>

          <section>
            <h2 className="font-display tracking-tight text-base text-neutral-900 mb-2">2. What You Get as a Vendor</h2>
            <p>Your own dedicated online store, a private database, tools to manage products, orders, employees, inventory and receipts, and customer support.</p>
          </section>

          <section>
            <h2 className="font-display tracking-tight text-base text-neutral-900 mb-2">3. Pricing and Payments</h2>
            <p>There is no joining fee. We charge a monthly hosting and website maintenance fee, billed in advance (you pay at the start of each month, before that month begins). Cancel anytime.</p>
            <p className="mt-2"><strong>Commission: none for now.</strong> You keep 100% of what you sell. This may change as the platform grows; if we ever introduce a commission, we will notify you at least 15 days in advance (see Updates below).</p>
          </section>

          <section>
            <h2 className="font-display tracking-tight text-base text-neutral-900 mb-2">4. Our Access to Your Sales Data</h2>
            <p>By registering, you agree that RNVS Inovative AI LLP can view your store's sales figures, order counts, and revenue data — only for monitoring platform health and complying with Indian tax laws (GST TCS). We do not sell your data or share it with other vendors.</p>
          </section>

          <section>
            <h2 className="font-display tracking-tight text-base text-neutral-900 mb-2">5. GST TCS</h2>
            <p>As required under Section 52 of the CGST Act 2017, we collect <strong>1% TCS</strong> on your sales and deposit it with the government on your behalf. You receive credit for this in your own GST return.</p>
          </section>

          <section>
            <h2 className="font-display tracking-tight text-base text-neutral-900 mb-2">6. Your Responsibilities</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Sell only legal products.</li>
              <li>Provide accurate descriptions and pricing.</li>
              <li>Fulfil orders promptly.</li>
              <li>Keep your login secure.</li>
              <li>Do not misuse the platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display tracking-tight text-base text-neutral-900 mb-2">7. What We Will Never Do</h2>
            <p>We will never share your business data with competitors, access your store without permission, or charge hidden fees.</p>
          </section>

          <section>
            <h2 className="font-display tracking-tight text-base text-neutral-900 mb-2">8. Termination</h2>
            <p>We can suspend your store if you violate these terms, sell prohibited products, or fail to pay for more than 30 days. You can close your store anytime — your data will be deleted within 30 days.</p>
          </section>

          <section>
            <h2 className="font-display tracking-tight text-base text-neutral-900 mb-2">9. Vendor Strikes and Suspension</h2>
            <p>Every time we confirm a genuine violation — by rejecting a flagged product or upholding a customer complaint — it counts as a strike against your account. If you reach the strike limit, your account loses trusted status, and every product you list afterwards will require manual approval before it goes live. For severe violations, such as listing anything illegal, we may suspend your account immediately without waiting for multiple strikes.</p>
          </section>

          <section>
            <h2 className="font-display tracking-tight text-base text-neutral-900 mb-2">10. Disputes</h2>
            <p>Disputes are governed by Indian law. Jurisdiction: Bangalore, Karnataka.</p>
          </section>

          <section>
            <h2 className="font-display tracking-tight text-base text-neutral-900 mb-2">11. Updates</h2>
            <p>We will notify you by email at least 15 days before any changes to these terms.</p>
          </section>

          <p className="text-xs text-neutral-400 pt-4 border-t border-neutral-100">
            Contact: contact@rnvsai.com · RNVS Inovative AI LLP · UDYAM-KR-03-0611765
          </p>
        </div>

        {/* Privacy Policy — shown on the same page as Terms */}
        <div className="mt-10">
          <h1 className="font-display tracking-tight text-3xl text-neutral-900">Privacy Policy</h1>
          <p className="text-sm text-neutral-500 mt-2 mb-8">RNVS Inovative AI LLP · Bangalore, Karnataka · Effective: June 2026</p>

          <div className="bg-white rounded-2xl border border-neutral-100 p-8 space-y-6 text-sm text-neutral-700 leading-relaxed">

            <section>
              <h2 className="font-display tracking-tight text-base text-neutral-900 mb-2">1. What Information We Collect</h2>
              <p>Your full name, email, phone number, business details (store name, GST, PAN, Udyam number), bank account details, sales data (orders, revenue, products), and login activity.</p>
            </section>

            <section>
              <h2 className="font-display tracking-tight text-base text-neutral-900 mb-2">2. Why We Collect This</h2>
              <p>To create and manage your store, process payouts, comply with Indian tax laws (GST TCS under Section 52 of CGST Act 2017), send important updates, and provide customer support.</p>
            </section>

            <section>
              <h2 className="font-display tracking-tight text-base text-neutral-900 mb-2">3. Who We Share Your Data With</h2>
              <p>We do not sell your data. We may share it only with:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Government authorities if required by Indian law.</li>
                <li>Our payment partner to process your payments and payouts.</li>
                <li>Our trusted technology partners who help us run the platform and store your data securely.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display tracking-tight text-base text-neutral-900 mb-2">4. Your Sales Data</h2>
              <p>Your store data is in your own private database — no other vendor can see it. RNVS Inovative AI LLP can view your sales data only for the purposes stated above.</p>
            </section>

            <section>
              <h2 className="font-display tracking-tight text-base text-neutral-900 mb-2">5. How Long We Keep Your Data</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>While your store is active: all data is kept.</li>
                <li>After closure: deleted within 30 days.</li>
                <li>GST and financial records: kept for 7 years as required by Indian law.</li>
              </ul>
            </section>

            <section>
              <h2 className="font-display tracking-tight text-base text-neutral-900 mb-2">6. Your Rights</h2>
              <p>You can request a copy of your data, request corrections, or request deletion when you close your store. Email: <a href="mailto:contact@rnvsai.com" className="text-neutral-900 hover:underline">contact@rnvsai.com</a></p>
            </section>

            <section>
              <h2 className="font-display tracking-tight text-base text-neutral-900 mb-2">7. Data Security</h2>
              <p>Encrypted database connections, secure login with session expiry, and fully isolated store database per vendor.</p>
            </section>

            <section>
              <h2 className="font-display tracking-tight text-base text-neutral-900 mb-2">8. Cookies</h2>
              <p>We use only essential cookies to keep you logged in. No tracking or advertising cookies.</p>
            </section>

            <section>
              <h2 className="font-display tracking-tight text-base text-neutral-900 mb-2">9. Changes</h2>
              <p>We will notify you by email at least 15 days before any changes take effect.</p>
            </section>

            <p className="text-xs text-neutral-400 pt-4 border-t border-neutral-100">
              Contact: contact@rnvsai.com · RNVS Inovative AI LLP · UDYAM-KR-03-0611765
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-4 text-sm">
          <Link href="/sell" className="text-neutral-400 hover:text-neutral-600 transition-colors">
            Back to Seller Registration
          </Link>
        </div>
      </div>
    </div>
  );
}
