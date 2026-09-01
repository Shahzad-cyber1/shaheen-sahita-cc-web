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
    .select("runs_off_bat, extra_type, is_legal_delivery, is_wicket")
    .eq("striker_id", id);

  const bd = battingDeliveries ?? [];
  const totalRuns = bd
    .filter((d) => d.extra_type !== "wide")
    .reduce((sum, d) => sum + d.runs_off_bat, 0);
  const totalBallsFaced = bd.filter((d) => d.is_legal_delivery && d.extra_type !== "wide").length;
  const timesOut = bd.filter((d) => d.is_wicket).length;
  const fours = bd.filter((d) => d.runs_off_bat === 4).length;
  const sixes = bd.filter((d) => d.runs_off_bat === 6).length;
  const highestScoreQuery = bd.filter((d) => d.extra_type !== "wide");

  // Bowling deliveries: this player as bowler
  const { data: bowlingDeliveries } = await supabase
    .from("deliveries")
    .select("runs_off_bat, extra_runs, is_legal_delivery, is_wicket")
    .eq("bowler_id", id);

  const bwd = bowlingDeliveries ?? [];
  const legalBallsBowled = bwd.filter((d) => d.is_legal_delivery).length;
  const runsConceded = bwd.reduce((sum, d) => sum + d.runs_off_bat + d.extra_runs, 0);
  const wicketsTaken = bwd.filter((d) => d.is_wicket).length;

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
                <p className="text-xl text-white">{totalRuns}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Runs</p>
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
                <p className="text-xl text-white">{fours} / {sixes}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">4s / 6s</p>
              </div>
            </div>
          </div>
        )}

        {bwd.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 text-center font-heading text-sm tracking-wide text-gray-400">BOWLING</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="text-center">
                <p className="text-xl text-white">{wicketsTaken}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Wickets</p>
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
                <p className="text-xl text-white">{Math.floor(legalBallsBowled / 6)}.{legalBallsBowled % 6}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-500">Overs</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}