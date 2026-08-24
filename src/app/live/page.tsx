import { supabase } from "@/lib/supabase";

export const revalidate = 0;

export default async function LivePage() {
  const { data: liveMatch } = await supabase
    .from("matches")
    .select("id, opponent, match_date, venue, overs, status, toss_winner, toss_decision")
    .eq("status", "live")
    .maybeSingle();

  if (!liveMatch) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-center">
        <a href="/" className="mb-8 text-xs text-gray-500 hover:text-[var(--accent)]">
          &larr; Back to Home
        </a>
        <p className="text-xs tracking-[0.3em] text-[var(--accent)]">LIVE MATCH CENTER</p>
        <p className="mt-4 font-heading text-2xl text-white">NO MATCH LIVE</p>
        <p className="mt-2 text-sm text-gray-500">Check back during our next fixture.</p>
      </main>
    );
  }

  const { data: innings } = await supabase
    .from("innings")
    .select("id, innings_number, batting_team, total_runs, total_wickets, total_overs, status")
    .eq("match_id", liveMatch.id)
    .order("innings_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  let target: number | null = null;
  if (innings?.innings_number === 2) {
    const { data: firstInnings } = await supabase
      .from("innings")
      .select("total_runs")
      .eq("match_id", liveMatch.id)
      .eq("innings_number", 1)
      .maybeSingle();
    if (firstInnings) target = firstInnings.total_runs + 1;
  }

  let recentDeliveries: { runs_off_bat: number; extra_type: string | null; is_wicket: boolean }[] = [];
  if (innings) {
    const { data } = await supabase
      .from("deliveries")
      .select("runs_off_bat, extra_type, is_wicket")
      .eq("innings_id", innings.id)
      .order("created_at", { ascending: false })
      .limit(6);
    recentDeliveries = (data ?? []).reverse();
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 md:px-12">
      <div className="mx-auto max-w-2xl">
        <a href="/" className="text-xs text-gray-500 hover:text-[var(--accent)]">
          &larr; Back to Home
        </a>

        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
          <p className="text-xs font-semibold tracking-widest text-red-500">LIVE</p>
        </div>

        <p className="mt-2 text-center text-sm text-gray-400">
          Shaheen Sahita CC vs {liveMatch.opponent}
        </p>
        <p className="text-center text-xs text-gray-600">
          {liveMatch.venue} &middot; {liveMatch.overs} overs
        </p>

        {innings ? (
          <div className="relative mt-8 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-gradient-to-b from-[var(--background-elevated)] to-black p-8 text-center">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.12),transparent_70%)]" />
            <p className="relative text-xs tracking-widest text-gray-500">
              {innings.batting_team.toUpperCase()}
            </p>
            <p className="relative mt-2 font-heading text-6xl font-bold text-gold-gradient">
              {innings.total_runs}
              <span className="text-white">/</span>
              {innings.total_wickets}
            </p>
            <p className="relative mt-2 text-base text-gray-400">
              Overs: {innings.total_overs}
            </p>
            {target !== null && (
              <p className="relative mt-4 rounded-md border border-[var(--accent)]/30 bg-[var(--accent)]/10 py-2 text-sm text-[var(--accent-light)]">
                🎯 Target {target} &middot; Need {Math.max(target - innings.total_runs, 0)} runs
              </p>
            )}

            {recentDeliveries.length > 0 && (
              <div className="relative mt-6 flex flex-wrap justify-center gap-1.5">
                {recentDeliveries.map((d, i) => {
                  const label = d.is_wicket
                    ? "W"
                    : d.extra_type
                    ? d.extra_type[0].toUpperCase()
                    : String(d.runs_off_bat);
                  const isBoundary = d.runs_off_bat === 4 || d.runs_off_bat === 6;
                  return (
                    <span
                      key={i}
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        d.is_wicket
                          ? "bg-red-600 text-white"
                          : isBoundary
                          ? "bg-[var(--accent)] text-black"
                          : "bg-black/40 text-gray-300"
                      }`}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <p className="mt-8 text-center text-sm text-gray-500">
            Match starting soon.
          </p>
        )}
      </div>
    </main>
  );
}