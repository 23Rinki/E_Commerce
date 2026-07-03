import { NextRequest, NextResponse } from 'next/server';

// Cache per country: { "India": [...cities] }
const cache: Record<string, string[]> = {};

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim() || '';
  const country = req.nextUrl.searchParams.get('country')?.trim() || '';

  if (!query || query.length < 1) return NextResponse.json([]);

  try {
    if (country && !cache[country]) {
      const res = await fetch('https://countriesnow.space/api/v0.1/countries/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country }),
        next: { revalidate: 86400 },
      });
      const json = await res.json();
      cache[country] = (json?.data as string[]) || [];
    }

    // If no country given, do a free-text search across all cached cities
    const pool = country ? (cache[country] || []) : Object.values(cache).flat();
    const q = query.toLowerCase();
    const results = pool.filter(c => c.toLowerCase().startsWith(q)).slice(0, 8);

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
