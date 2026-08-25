import { supabase } from "@/lib/supabase";

export const revalidate = 0;

type Delivery = {
  over_number: number;
  ball_number: number;
  runs_off_bat: number;
  extra_type: string | null;
  extra_runs: number;
  is_wicket: boolean;
  is_legal_delivery: boolean;
  striker_id: string | null;
  bowler_id: string | null;
  non_striker_id: string | null;
  striker_name: string | null;
  non_striker_name: string | null;
  bowler_name: string | null;
  created_at: string;
};

function buildCommentary(d: Delivery, strikerName: string, bowlerName: string) {
  if (d.is_wicket) return `WICKET! ${bowlerName} to ${strikerName}`;
  if (d.extra_type === "wide") return `${bowlerName} to ${strikerName}, WIDE${d.extra_runs > 1 ? `, ${d.extra_runs} runs` : ""}`;
  if (d.extra_type === "no-ball") return `${bowlerName} to ${strikerName}, NO BALL${d.extra_runs > 1 ? `, ${d.extra_runs} runs` : ""}`;
  if (d.extra_type === "bye") return `${bowlerName} to ${strikerName}, ${d.extra_runs} bye${d.extra_runs === 1 ? "" : "s"}`;
  if (d.extra_type === "leg-bye") return `${bowlerName} to ${strikerName}, ${d.extra_runs} leg bye${d.extra_runs === 1 ? "" : "s"}`;
  if (d.runs_off_bat === 6) return `${bowlerName} to ${strikerName}, SIX! Maximum!`;
  if (d.runs_off_bat === 4) return `${bowlerName} to ${strikerName}, FOUR! Boundary!`;
  if (d.runs_off_bat === 0) return `${bowlerName} to ${strikerName}, no run`;
  return `${bowlerName} to ${strikerName}, ${d.runs_off_bat} run${d.runs_off_bat === 1 ? "" : "s"}`;
}

export default async function LivePage() {
  const { data: liveMatch } = await supabase
    .from("matches")
    .select("id, opponent, match_date, venue, overs, status, opponent_players")
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

  let deliveries: Delivery[] = [];
  if (innings) {
    const { data } = await supabase
      .from("deliveries")
      .select("over_number, ball_number, runs_off_bat, extra_type, extra_runs, is_wicket, is_legal_delivery, striker_id, bowler_id, non_striker_id, striker_name, non_striker_name, bowler_name, created_at")
      .eq("innings_id", innings.id)
      .order("created_at", { ascending: true });
    deliveries = data ?? [];
  }

  // Resolve player names (own squad only; opponents are text-only so we skip lookup for them)
  const playerIds = Array.from(
    new Set(deliveries.flatMap((d) => [d.striker_id, d.bowler_id].filter(Boolean) as string[]))
  );
  let nameMap: Record<string, string> = {};
  if (playerIds.length > 0) {
    const { data: playerRows } = await supabase.from("players").select("id, name").in("id", playerIds);
    nameMap = Object.fromEntries((playerRows ?? []).map((p) => [p.id, p.name]));
  }
  function resolveName(id: string | null, savedName?: string | null) {
    if (savedName) return savedName;
    if (id) return nameMap[id] ?? "Player";
    return "Player";
  }

  // Batting stats per striker
  const battingStats: Record<string, { runs: number; balls: number; fours: number; sixes: number }> = {};
  // Bowling stats per bowler
  const bowlingStats: Record<string, { legalBalls: number; runs: number; wickets: number }> = {};

  for (const d of deliveries) {
    const sId = d.striker_id ?? `opp-${d.striker_name}`;
    if (!battingStats[sId]) battingStats[sId] = { runs: 0, balls: 0, fours: 0, sixes: 0 };
    const countsAsBall = d.is_legal_delivery;
    if (d.extra_type !== "wide") {
      battingStats[sId].runs += d.runs_off_bat;
      if (countsAsBall) battingStats[sId].balls += 1;
      if (d.runs_off_bat === 4) battingStats[sId].fours += 1;
      if (d.runs_off_bat === 6) battingStats[sId].sixes += 1;
    }

    const bId = d.bowler_id ?? `opp-${d.bowler_name}`;
    if (!bowlingStats[bId]) bowlingStats[bId] = { legalBalls: 0, runs: 0, wickets: 0 };
    if (d.is_legal_delivery) bowlingStats[bId].legalBalls += 1;
    bowlingStats[bId].runs += d.runs_off_bat + d.extra_runs;
    if (d.is_wicket) bowlingStats[bId].wickets += 1;
  }

  // Determine current striker/bowler from most recent delivery
  const lastDelivery = deliveries[deliveries.length - 1];

  let currentStrikerId = lastDelivery?.striker_id ?? `opp-${lastDelivery?.striker_name ?? "unknown"}`;
  let currentNonStrikerId = lastDelivery?.non_striker_id ?? `opp-${lastDelivery?.non_striker_name ?? "unknown2"}`;
  const currentBowlerId = lastDelivery?.bowler_id ?? `opp-${lastDelivery?.bowler_name ?? "unknown"}`;

  if (lastDelivery) {
    // Determine how many legal balls have been bowled in this last over (to detect if over just ended)
    const deliveriesInLastOver = deliveries.filter((d) => d.over_number === lastDelivery.over_number && d.is_legal_delivery);
    const overJustCompleted = deliveriesInLastOver.length === 6 && lastDelivery.is_legal_delivery;

    const oddRuns = lastDelivery.runs_off_bat % 2 === 1 && lastDelivery.extra_type !== "wide";

    if (oddRuns) {
      const temp = currentStrikerId;
      currentStrikerId = currentNonStrikerId;
      currentNonStrikerId = temp;
    }

    if (overJustCompleted) {
      const temp = currentStrikerId;
      currentStrikerId = currentNonStrikerId;
      currentNonStrikerId = temp;
    }
  }

  function oversDisplay(balls: number) {
    return `${Math.floor(balls / 6)}.${balls % 6}`;
  }

  // Group deliveries by over for the recent-overs commentary feed (last 2 overs)
  const overGroups: Record<number, Delivery[]> = {};
  for (const d of deliveries) {
    if (!overGroups[d.over_number]) overGroups[d.over_number] = [];
    overGroups[d.over_number].push(d);
  }
  const overNumbers = Object.keys(overGroups).map(Number).sort((a, b) => b - a).slice(0, 2);

  return (
    <main className="min-h-screen bg-black px-4 py-10 md:px-12">
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
          <>
            <div className="relative mt-6 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-gradient-to-b from-[var(--background-elevated)] to-black p-6 text-center">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.12),transparent_70%)]" />
              <p className="relative text-xs tracking-widest text-gray-500">{innings.batting_team.toUpperCase()}</p>
              <p className="relative mt-1 font-heading text-5xl font-bold text-gold-gradient">
                {innings.total_runs}<span className="text-white">/</span>{innings.total_wickets}
              </p>
              <p className="relative mt-1 text-sm text-gray-400">Overs: {innings.total_overs}</p>
              {target !== null && (
                <p className="relative mt-3 rounded-md border border-[var(--accent)]/30 bg-[var(--accent)]/10 py-1.5 text-xs text-[var(--accent-light)]">
                  🎯 Target {target} &middot; Need {Math.max(target - innings.total_runs, 0)} runs
                </p>
              )}
            </div>

            {/* Batter / Bowler table */}
            <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border-subtle)]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--background-elevated)] text-gray-500">
                    <th className="px-3 py-2 text-left font-normal">Batter</th>
                    <th className="px-2 py-2 text-right font-normal">R</th>
                    <th className="px-2 py-2 text-right font-normal">B</th>
                    <th className="px-2 py-2 text-right font-normal">4s</th>
                    <th className="px-2 py-2 text-right font-normal">6s</th>
                    <th className="px-2 py-2 text-right font-normal">SR</th>
                  </tr>
                </thead>
                <tbody>
                  {[currentStrikerId, currentNonStrikerId].map((id) => {
                    const stats = battingStats[id] ?? { runs: 0, balls: 0, fours: 0, sixes: 0 };
                    const nameFromDelivery = lastDelivery
                      ? id === currentStrikerId
                        ? lastDelivery.striker_name
                        : lastDelivery.non_striker_name
                      : null;
                    return (
                      <tr key={id} className="border-b border-[var(--border-subtle)] text-white">
                        <td className="px-3 py-2">
                          {resolveName(id.startsWith("opp-") ? null : id, nameFromDelivery)}
                          {id === currentStrikerId && <span className="ml-1">🏏</span>}
                        </td>
                        <td className="px-2 py-2 text-right font-semibold">{stats.runs}</td>
                        <td className="px-2 py-2 text-right text-gray-400">{stats.balls}</td>
                        <td className="px-2 py-2 text-right text-gray-400">{stats.fours}</td>
                        <td className="px-2 py-2 text-right text-gray-400">{stats.sixes}</td>
                        <td className="px-2 py-2 text-right text-gray-400">
                          {stats.balls > 0 ? ((stats.runs / stats.balls) * 100).toFixed(1) : "0.0"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] bg-[var(--background-elevated)] text-gray-500">
                    <th className="px-3 py-2 text-left font-normal">Bowler</th>
                    <th className="px-2 py-2 text-right font-normal">O</th>
                    <th className="px-2 py-2 text-right font-normal">R</th>
                    <th className="px-2 py-2 text-right font-normal">W</th>
                    <th className="px-2 py-2 text-right font-normal">ECO</th>
                  </tr>
                </thead>
                <tbody>
                  {currentBowlerId && bowlingStats[currentBowlerId] && (
                    <tr className="text-white">
                      <td className="px-3 py-2">
                       {resolveName(currentBowlerId.startsWith("opp-") ? null : currentBowlerId, lastDelivery?.bowler_name)}
                      </td>
                      <td className="px-2 py-2 text-right font-semibold">
                        {oversDisplay(bowlingStats[currentBowlerId].legalBalls)}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-400">{bowlingStats[currentBowlerId].runs}</td>
                      <td className="px-2 py-2 text-right text-gray-400">{bowlingStats[currentBowlerId].wickets}</td>
                      <td className="px-2 py-2 text-right text-gray-400">
                        {bowlingStats[currentBowlerId].legalBalls > 0
                          ? (bowlingStats[currentBowlerId].runs / (bowlingStats[currentBowlerId].legalBalls / 6)).toFixed(2)
                          : "0.00"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Ball by ball commentary */}
            <div className="mt-6 space-y-6">
              {overNumbers.map((overNum) => {
                const overDeliveries = overGroups[overNum];
                const overRuns = overDeliveries.reduce((sum, d) => sum + d.runs_off_bat + d.extra_runs, 0);
                return (
                  <div key={overNum}>
                    <div className="mb-2 flex items-center justify-between rounded-md bg-[var(--background-elevated)] px-3 py-2 text-xs text-gray-400">
                      <span>Over {overNum + 1}</span>
                      <span className="flex gap-1">
                        {overDeliveries.map((d, i) => {
                          const label = d.is_wicket ? "W" : d.extra_type ? d.extra_type[0].toUpperCase() : String(d.runs_off_bat);
                          const isBoundary = d.runs_off_bat === 4 || d.runs_off_bat === 6;
                          return (
                            <span
                              key={i}
                              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                                d.is_wicket ? "bg-red-600 text-white" : isBoundary ? "bg-[var(--accent)] text-black" : "bg-black/40 text-gray-300"
                              }`}
                            >
                              {label}
                            </span>
                          );
                        })}
                      </span>
                      <span>({overRuns} runs)</span>
                    </div>
                    <div className="space-y-3">
                      {[...overDeliveries].reverse().map((d, i) => (
                        <div key={i} className="border-b border-[var(--border-subtle)] pb-3 text-xs">
                          <p className="mb-0.5 text-gray-500">
                            {d.over_number}.{d.ball_number}
                          </p>
                          <p className={d.is_wicket ? "font-medium text-red-400" : d.runs_off_bat >= 4 ? "font-medium text-[var(--accent-light)]" : "text-gray-300"}>
                            {buildCommentary(d, resolveName(d.striker_id, d.striker_name), resolveName(d.bowler_id, d.bowler_name))}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="mt-8 text-center text-sm text-gray-500">Match starting soon.</p>
        )}
      </div>
    </main>
  );
}