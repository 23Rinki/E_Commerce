import { NextRequest, NextResponse } from 'next/server';

const cache: Record<string, string[]> = {};

export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country')?.trim() || 'India';

  try {
    if (!cache[country]) {
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/states', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country }),
        next: { revalidate: 86400 },
      });
      const json = await res.json();
      cache[country] = ((json?.data?.states as { name: string }[]) || []).map(s => s.name);
    }

    return NextResponse.json(cache[country] || []);
  } catch {
    return NextResponse.json([]);
  }
}
