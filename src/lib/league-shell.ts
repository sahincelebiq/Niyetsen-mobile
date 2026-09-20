/**
 * Lig kabuğu — `/league` 404 veya eksik `members` ekranı düşürmez.
 */

export type LeagueShell<M = unknown> = {
  opted_in: boolean;
  alias: string | null;
  my_rank: number | null;
  members: M[];
};

export const EMPTY_LEAGUE: LeagueShell = {
  opted_in: false,
  alias: null,
  my_rank: null,
  members: [],
};

export function normalizeLeague<M>(
  raw: Partial<LeagueShell<M>> | null | undefined,
): LeagueShell<M> {
  return {
    opted_in: Boolean(raw?.opted_in),
    alias: raw?.alias ?? null,
    my_rank: typeof raw?.my_rank === 'number' ? raw.my_rank : null,
    members: Array.isArray(raw?.members) ? raw.members : [],
  };
}

export function leagueLoadOutcome(status: number | null | undefined): {
  keepShell: true;
  showError: boolean;
  unavailable: boolean;
} {
  const missing = status === 404;
  return { keepShell: true, showError: !missing, unavailable: missing };
}
