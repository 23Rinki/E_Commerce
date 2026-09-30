import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

interface Props {
  /** Full-bleed backdrop photo. */
  image: string;
  /** Small uppercase label above the title. */
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Extra links in the top bar, right of "Back to store". */
  topRight?: React.ReactNode;
  /** Card width — sign-in is narrow, registration is wider. */
  size?: 'md' | 'lg';
  children: React.ReactNode;
}

/** Shared frame for every auth screen: photo backdrop, brand bar, frosted-glass card. */
export default function AuthShell({ image, eyebrow, title, subtitle, topRight, size = 'md', children }: Props) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-stone-800">
      <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700" />
      <div className="absolute inset-0 bg-stone-900/55" />
      <div className="absolute inset-0 bg-gradient-to-tr from-stone-900/50 via-stone-800/40 to-stone-700/30" />

      <header className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-20 text-white">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-white grid place-items-center text-neutral-900 font-display">R</div>
            <div className="font-display text-xl sm:text-2xl tracking-tight">RNVS CommerceX</div>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-white/90 hover:text-white inline-flex items-center gap-1.5 font-medium">
              <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Back to store</span>
            </Link>
            {topRight}
          </div>
        </div>
      </header>

      <main className="relative z-10 flex items-center justify-center px-4 sm:px-6 py-8 lg:py-14" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <div className={`w-full ${size === 'lg' ? 'max-w-lg' : 'max-w-md'} rounded-[2rem] p-7 sm:p-8 lg:p-10 border border-white/20 bg-stone-700/40 backdrop-blur-2xl text-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)]`}>
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/90 font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            {eyebrow}
          </div>
          <h1 className="font-display text-4xl lg:text-5xl mt-3 leading-[1.05] text-white">{title}</h1>
          {subtitle && <p className="mt-3 text-white/85 text-sm max-w-md">{subtitle}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}

/** Pill input styling shared by the auth forms (sits on the dark glass card). */
export const authInputCls =
  'w-full h-12 rounded-full pl-11 pr-4 bg-white/15 border border-white/25 text-white placeholder:text-white/65 text-sm outline-none focus:bg-white/25 focus:ring-2 focus:ring-white/40 transition-colors';

/** Primary white pill button on the dark card. */
export const authButtonCls =
  'w-full h-12 rounded-full bg-white text-neutral-900 hover:bg-white/95 disabled:opacity-60 font-semibold inline-flex items-center justify-center group transition-colors';

export function AuthError({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="mt-5 px-4 py-3 bg-red-500/20 border border-red-400/40 text-red-100 text-sm rounded-2xl">
      {children}
    </div>
  );
}

/** Mirrors the API's password policy (8+ chars, upper, lower, digit, symbol). */
export function meetsPasswordPolicy(value: string) {
  return value.length >= 8 && /[A-Z]/.test(value) && /[a-z]/.test(value) && /[0-9]/.test(value) && /[^A-Za-z0-9]/.test(value);
}

export function PasswordStrength({ value }: { value: string }) {
  const score = [
    value.length >= 8,
    /[A-Z]/.test(value),
    /[0-9]/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ].filter(Boolean).length;
  const labels = ['Too weak', 'Weak', 'Fair', 'Strong', 'Excellent'];
  const colors = ['bg-white/25', 'bg-red-400', 'bg-amber-400', 'bg-lime-400', 'bg-emerald-400'];
  return (
    <div className="mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full ${i < score ? colors[score] : 'bg-white/15'}`} />
        ))}
      </div>
      <div className="mt-1.5 text-[11px] text-white/80">
        {value ? labels[score] : '8+ characters, mixed letters, numbers & symbols'}
      </div>
    </div>
  );
}
