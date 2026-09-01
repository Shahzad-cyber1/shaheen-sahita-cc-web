import { supabase } from "@/lib/supabase";

export const revalidate = 0;

export default async function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { data: player } = await supabase
    .from("players")
    .select("id, name, role, title, batting_style, bowling_style, biography, status, is_captain, is_vice_captain")
    .eq("id", id)
    .maybeSingle();

  if (!player) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-center">
        <p className="text-sm text-gray-500">Player not found.</p>
      </main>
    );
  }

  // Batting deliveries: this player as striker
  const { data: battingDeliveries } = await supabase
    .from("deliveries")
    .select("innings_id, runs_off_bat, extra_type, is_legal_delivery, is_wicket")
    .eq("striker_id", id);

  const bd = battingDeliveries ?? [];
  const totalRuns = bd
    .filter((d) => d.extra_type !== "wide")
    .reduce((sum, d) => sum + d.runs_off_bat, 0);
  const totalBallsFaced = bd.filter((d) => d.is_legal_delivery && d.extra_type !== "wide").length;
  const timesOut = bd.filter((d) => d.is_wicket).length;
  const fours = bd.filter((d) => d.runs_off_bat === 4).length;
  const sixes = bd.filter((d) => d.runs_off_bat === 6).length;

  // Per-innings batting totals (for highest score, 50s, 100s, not-outs)
  const battingInningsMap: Record<string, { runs: number; dismissed: boolean }> = {};
  for (const d of bd) {
    if (!battingInningsMap[d.innings_id]) battingInningsMap[d.innings_id] = { runs: 0, dismissed: false };
    if (d.extra_type !== "wide") battingInningsMap[d.innings_id].runs += d.runs_off_bat;
    if (d.is_wicket) battingInningsMap[d.innings_id].dismissed = true;
  }
  const battingInningsList = Object.values(battingInningsMap);
  const inningsBatted = battingInningsList.length;
  const notOuts = battingInningsList.filter((i) => !i.dismissed).length;
  const highestScore = battingInningsList.length > 0 ? Math.max(...battingInningsList.map((i) => i.runs)) : 0;
  const highestScoreNotOut = battingInningsList.find((i) => i.runs === highestScore)?.dismissed === false;
  const fifties = battingInningsList.filter((i) => i.runs >= 50 && i.runs < 100).length;
  const hundreds = battingInningsList.filter((i) => i.runs >= 100).length;

  // Bowling deliveries: this player as bowler
  const { data: bowlingDeliveries } = await supabase
    .from("deliveries")
    .select("innings_id, over_number, runs_off_bat, extra_runs, extra_type, is_legal_delivery, is_wicket")
    .eq("bowler_id", id);

  const bwd = bowlingDeliveries ?? [];
  const legalBallsBowled = bwd.filter((d) => d.is_legal_delivery).length;
  const runsConceded = bwd.reduce((sum, d) => sum + d.runs_off_bat + d.extra_runs, 0);
  const wicketsTaken = bwd.filter((d) => d.is_wicket).length;

  // Per-over bowling figures (for best bowling figures and maidens)
  const bowlingOverMap: Record<string, { runs: number; wickets: number; legalBalls: number }> = {};
  for (const d of bwd) {
    const overKey = `${d.innings_id}-${d.over_number}`;
    if (!bowlingOverMap[overKey]) bowlingOverMap[overKey] = { runs: 0, wickets: 0, legalBalls: 0 };
    bowlingOverMap[overKey].runs += d.runs_off_bat + d.extra_runs;
    if (d.is_wicket) bowlingOverMap[overKey].wickets += 1;
    if (d.is_legal_delivery) bowlingOverMap[overKey].legalBalls += 1;
  }
  const maidens = Object.values(bowlingOverMap).filter((o) => o.runs === 0 && o.legalBalls === 6).length;

  // Per-innings bowling figures (for best bowling figures W/R)
  const bowlingInningsMap: Record<string, { runs: number; wickets: number }> = {};
  for (const d of bwd) {
    if (!bowlingInningsMap[d.innings_id]) bowlingInningsMap[d.innings_id] = { runs: 0, wickets: 0 };
    bowlingInningsMap[d.innings_id].runs += d.runs_off_bat + d.extra_runs;
    if (d.is_wicket) bowlingInningsMap[d.innings_id].wickets += 1;
  }
  const bowlingInningsList = Object.values(bowlingInningsMap);
  const bestBowling = bowlingInningsList.reduce(
    (best, cur) => {
      if (cur.wickets > best.wickets || (cur.wickets === best.wickets && cur.runs < best.runs)) return cur;
      return best;
    },
    { runs: 0, wickets: -1 }
  );
  const bestBowlingDisplay = bestBowling.wickets >= 0 ? `${bestBowling.wickets}/${bestBowling.runs}` : "N/A";

  // Fielding stats: catches, run outs, stumpings (as fielder)
  const { data: fieldingDeliveries } = await supabase
    .from("deliveries")
    .select("wicket_type")
    .eq("fielder_id", id);

  const fd = fieldingDeliveries ?? [];
  const catches = fd.filter((d) => d.wicket_type === "caught").length;
  const runOuts = fd.filter((d) => d.wicket_type === "run-out").length;
  const stumpings = fd.filter((d) => d.wicket_type === "stumped").length;

  // Distinct matches played (via innings -> matches)
  const { data: strikerInnings } = await supabase
    .from("deliveries")
    .select("innings_id")
    .or(`striker_id.eq.${id},bowler_id.eq.${id}`);

  const uniqueInningsIds = Array.from(new Set((strikerInnings ?? []).map((d) => d.innings_id)));
  let matchesPlayed = 0;
  if (uniqueInningsIds.length > 0) {
    const { data: inningsRows } = await supabase
      .from("innings")
      .select("match_id")
      .in("id", uniqueInningsIds);
    matchesPlayed = new Set((inningsRows ?? []).map((r) => r.match_id)).size;
  }

  const battingAverage = timesOut > 0 ? (totalRuns / timesOut).toFixed(2) : totalRuns > 0 ? totalRuns.toFixed(2) : "N/A";
  const strikeRate = totalBallsFaced > 0 ? ((totalRuns / totalBallsFaced) * 100).toFixed(2) : "N/A";
  const economy = legalBallsBowled > 0 ? (runsConceded / (legalBallsBowled / 6)).toFixed(2) : "N/A";
  const bowlingAverage = wicketsTaken > 0 ? (runsConceded / wicketsTaken).toFixed(2) : "N/A";

  const hasBattedOrBowled = bd.length > 0 || bwd.length > 0;

  return (
    <main className="min-h-screen bg-black px-6 py-12 md:px-12">
      <div className="mx-auto max-w-3xl">
        <a href="/#first-team" className="text-xs text-gray-500 hover:text-[var(--accent)]">
          &larr; Back to First Team
        </a>

        <div className="mt-6 text-center">
          {(player.is_captain || player.is_vice_captain) && (
            <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--accent)] font-heading text-xs text-[var(--accent)]">
              {player.is_captain ? "C" : "VC"}
            </span>
          )}
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-black/40 font-heading text-3xl text-gray-500">
            {player.name.split(" ").map((n: string) => n[0]).slice(0, 2).join("")}
          </div>
          <h1 className="mt-4 font-heading text-3xl text-white">{player.name}</h1>
          <p className="mt-1 text-sm text-gray-400">{player.role}</p>
          {player.title && (
            <p className="mt-1 text-sm text-[var(--accent-light)]">{player.title}</p>
          )}
        </div>

        {player.biography && (
          <p className="mx-auto mt-8 max-w-xl text-center text-sm leading-relaxed text-gray-400">
            {player.biography}
          </p>
        )}

        <div className="mt-10 grid grid-cols-3 gap-4 sm:grid-cols-3">
          <div className="glass-panel rounded-sm p-4 text-center">
            <p className="font-heading text-2xl text-gold-gradient">{matchesPlayed}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Matches</p>
          </div>
          <div className="glass-panel rounded-sm p-4 text-center">
            <p className="font-heading text-2xl text-gold-gradient">{totalRuns}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Runs</p>
          </div>
          <div className="glass-panel rounded-sm p-4 text-center">
            <p className="font-heading text-2xl text-gold-gradient">{wicketsTaken}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Wickets</p>
          </div>
        </div>

        {!hasBattedOrBowled && (
          <p className="mt-8 text-center text-sm text-gray-500">
            No official statistics recorded yet.
          </p>
        )}

        {bd.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-center font-heading text-sm tracking-wide text-gray-400">BATTING</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="text-center">
                <p className="text-xl text-white">{inningsBatted}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Innings</p>
              </div>
              <div className="text-center">
                <p className="text-xl text-white">{totalRuns}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Runs</p>
              </div>
              <div className="text-center">
                <p className="text-xl text-white">
                  {highestScore}{highestScoreNotOut ? "*" : ""}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Highest</p>
              </div>
              <div className="text-center">
                <p className="text-xl text-white">{battingAverage}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Average</p>
              </div>
              <div className="text-center">
                <p className="text-xl text-white">{strikeRate}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Strike Rate</p>
              </div>
              <div className="text-center">
                <p className="text-xl text-white">{notOuts}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Not Outs</p>
              </div>
              <div className="text-center">
                <p className="text-xl text-white">{fifties}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">50s</p>
              </div>
              <div className="text-center">
                <p className="text-xl text-white">{hundreds}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">100s</p>
              </div>
              <div className="text-center">
                <p className="text-xl text-white">{fours}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">4s</p>
              </div>
              <div className="text-center">
                <p className="text-xl text-white">{sixes}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">6s</p>
              </div>
            </div>
          </div>
        )}

        {bwd.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-center font-heading text-sm tracking-wide text-gray-400">BOWLING</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="text-center">
                <p className="text-xl text-white">{Math.floor(legalBallsBowled / 6)}.{legalBallsBowled % 6}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Overs</p>
              </div>
              <div className="text-center">
                <p className="text-xl text-white">{wicketsTaken}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Wickets</p>
              </div>
              <div className="text-center">
                <p className="text-xl text-white">{bestBowlingDisplay}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Best Figures</p>
              </div>
              <div className="text-center">
                <p className="text-xl text-white">{bowlingAverage}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Average</p>
              </div>
              <div className="text-center">
                <p className="text-xl text-white">{economy}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Economy</p>
              </div>
              <div className="text-center">
                <p className="text-xl text-white">{maidens}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Maidens</p>
              </div>
              <div className="text-center">
                <p className="text-xl text-white">{runsConceded}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Runs Conceded</p>
              </div>
            </div>
          </div>
        )}

        {(catches > 0 || runOuts > 0 || stumpings > 0) && (
          <div className="mt-10">
            <h2 className="mb-4 text-center font-heading text-sm tracking-wide text-gray-400">FIELDING</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xl text-white">{catches}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Catches</p>
              </div>
              <div className="text-center">
                <p className="text-xl text-white">{runOuts}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Run Outs</p>
              </div>
              <div className="text-center">
                <p className="text-xl text-white">{stumpings}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Stumpings</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}