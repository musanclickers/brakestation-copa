const BASE = 'https://api.football-data.org/v4';

export type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  stage: string;
  matchday: number | null;
  group: string | null;
  homeTeam: { id: number | null; name: string | null };
  awayTeam: { id: number | null; name: string | null };
  score: {
    fullTime: { home: number | null; away: number | null };
    winner: string | null;
  };
  venue?: string;
};

export async function fetchWorldCupMatches(apiKey: string, season: number): Promise<FootballDataMatch[]> {
  const res = await fetch(`${BASE}/competitions/WC/matches?season=${season}`, {
    headers: {
      'X-Auth-Token': apiKey,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`football-data.org failed: ${res.status} ${await res.text().catch(() => '')}`);
  }

  const data = await res.json();
  if (!Array.isArray(data.matches)) {
    throw new Error('football-data.org response.matches is not an array');
  }
  return data.matches;
}
