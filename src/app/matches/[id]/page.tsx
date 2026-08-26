import { supabase } from "@/lib/supabase";
import { redirect } from "next/navigation";

export const revalidate = 0;

type Delivery = {
  over_number: number;
  ball_number: number;
  runs_off_bat: number;
  extra_type: string | null;
  extra_runs: number;
  is_wicket: boolean;
  is_legal_delivery: boolean;
  wicket_type: string | null;
  striker_id: string | null;
  bowler_id: string | null;
  striker_name: string | null;
  bowler_name: string | null;
  fielder_name: string | null;
};

function computeBattingStats(deliveries: Delivery[]) {
  const stats: Record<string, { name: string; runs: number; balls: number; fours: number; sixes: number; out: string | null }> = {};

  for (const d of deliveries) {
    const key = d.striker_id ?? `opp-${d.striker_name}`;
    const name = d.striker_name ?? "Player";
    if (!stats[key]) stats[key] = { name, runs: 0, balls: 0, fours: 0, sixes: 0, out: null };

    if (d.extra_type !== "wide") {
      stats[key].runs += d.runs_off_bat;
      if (d.is_legal_delivery) stats[key].balls += 1;
      if (d.runs_off_bat === 4) stats[key].fours += 1;
      if (d.runs_off_bat === 6) stats[key].sixes += 1;
    }

    if (d.is_wicket) {
      const dismissal = d.wicket_type ?? "out";
      stats[key].out =
        dismissal === "caught" && d.fielder_name
          ? `c ${d.fielder_name} b ${d.bowler_name}`
          : dismissal === "run-out" && d.fielder_name
          ? `run out (${d.fielder_name})`
          : dismissal === "stumped" && d.fielder_name
          ? `st ${d.fielder_name} b ${d.bowler_name}`
          : dismissal === "bowled"
          ? `b ${d.bowler_name}`
          : dismissal === "lbw"
          ? `lbw b ${d.bowler_name}`
          : dismissal;
    }
  }

  return stats;
}

function computeBowlingStats(deliveries: Delivery[]) {
  const stats: Record<string, { name: string; legalBalls: number; runs: number; wickets: number }> = {};

  for (const d of deliveries) {
    const key = d.bowler_id ?? `opp-${d.bowler_name}`;
    const name = d.bowler_name ?? "Player";
    if (!stats[key]) stats[key] = { name, legalBalls: 0, runs: 0, wickets: 0 };

    if (d.is_legal_delivery) stats[key].legalBalls += 1;
    stats[key].runs += d.runs_off_bat + d.extra_runs;
    if (d.is_wicket) stats[key].wickets += 1;
  }

  return stats;
}

function oversDisplay(balls: number) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

export default async function MatchScorecardPage({ params }: { params: { id: string } }) {
  const { data: match } = await supabase
    .from("matches")
    .select("id, opponent, match_date, venue, overs, status, result, toss_winner, toss_decision")
    .eq("id", params.id)
    .maybeSingle();

  if (!match) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-center">
        <p className="text-sm text-gray-500">Match not found.</p>
      </main>
    );
  }

  if (match.status === "live") {
    redirect("/live");
  }

  const { data: inningsList } = await supabase
    .from("innings")
    .select("id, innings_number, batting_team, total_runs, total_wickets, total_overs, status")
    .eq("match_id", match.id)
    .order("innings_number", { ascending: true });

  const innings = inningsList ?? [];

  const inningsWithDeliveries = await Promise.all(
    innings.map(async (inn) => {
      const { data } = await supabase
        .from("deliveries")
        .select(
          "over_number, ball_number, runs_off_bat, extra_type, extra_runs, is_wicket, is_legal_delivery, wicket_type, striker_id, bowler_id, striker_name, bowler_name, fielder_name"
        )
        .eq("innings_id", inn.id)
        .order("created_at", { ascending: true });
      return { ...inn, deliveries: (data ?? []) as Delivery[] };
    })
  );

  return (
    <main className="min-h-screen bg-black px-4 py-10 md:px-12">
      <div className="mx-auto max-w-3xl">
        <a href="/" className="text-xs text-gray-500 hover:text-[var(--accent)]">
          &larr; Back to Home
        </a>

        <p className="mt-4 text-center text-xs tracking-[0.3em] text-[var(--accent)]">MATCH SCORECARD</p>
        <p className="mt-2 text-center text-sm text-gray-400">
          Shaheen Sahita CC vs {match.opponent}
        </p>
        <p className="text-center text-xs text-gray-600">
          {match.venue} &middot; {match.overs} overs &middot;{" "}
          {new Date(match.match_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </p>

        {match.toss_winner && (
          <p className="mt-2 text-center text-xs text-gray-500">
            Toss: {match.toss_winner} chose to {match.toss_decision?.toLowerCase()}
          </p>
        )}

        {match.result && (
          <div className="mx-auto mt-6 max-w-lg rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 py-3 text-center">
            <p className="text-sm font-medium text-[var(--accent-light)]">{match.result}</p>
          </div>
        )}

        {inningsWithDeliveries.length === 0 && (
          <p className="mt-10 text-center text-sm text-gray-500">No scorecard available for this match.</p>
        )}

        {inningsWithDeliveries.map((inn) => {
          const battingStats = computeBattingStats(inn.deliveries);
          const bowlingStats = computeBowlingStats(inn.deliveries);
          const extrasTotal = inn.deliveries.reduce((sum, d) => sum + d.extra_runs, 0);

          return (
            <div key={inn.id} className="mt-10">
              <div className="rounded-lg border border-[var(--border-strong)] bg-[var(--background-elevated)] px-4 py-3 text-center">
                <p className="text-xs tracking-widest text-gray-500">{inn.batting_team.toUpperCase()}</p>
                <p className="mt-1 font-heading text-3xl font-bold text-gold-gradient">
                  {inn.total_runs}<span className="text-white">/</span>{inn.total_wickets}
                  <span className="ml-2 text-base text-gray-400">({inn.total_overs} ov)</span>
                </p>
              </div>

              <div className="mt-3 overflow-hidden rounded-lg border border-[var(--border-subtle)]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] bg-[var(--background-elevated)] text-gray-500">
                      <th className="px-3 py-2 text-left font-normal">Batter</th>
                      <th className="px-2 py-2 text-left font-normal"></th>
                      <th className="px-2 py-2 text-right font-normal">R</th>
                      <th className="px-2 py-2 text-right font-normal">B</th>
                      <th className="px-2 py-2 text-right font-normal">4s</th>
                      <th className="px-2 py-2 text-right font-normal">6s</th>
                      <th className="px-2 py-2 text-right font-normal">SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(battingStats).map((b, i) => (
                      <tr key={i} className="border-b border-[var(--border-subtle)] text-white">
                        <td className="px-3 py-2">{b.name}</td>
                        <td className="px-2 py-2 text-gray-500">{b.out ?? "not out"}</td>
                        <td className="px-2 py-2 text-right font-semibold">{b.runs}</td>
                        <td className="px-2 py-2 text-right text-gray-400">{b.balls}</td>
                        <td className="px-2 py-2 text-right text-gray-400">{b.fours}</td>
                        <td className="px-2 py-2 text-right text-gray-400">{b.sixes}</td>
                        <td className="px-2 py-2 text-right text-gray-400">
                          {b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : "0.0"}
                        </td>
                      </tr>
                    ))}
                    <tr className="text-gray-400">
                      <td colSpan={2} className="px-3 py-2">Extras</td>
                      <td className="px-2 py-2 text-right" colSpan={5}>{extrasTotal}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-3 overflow-hidden rounded-lg border border-[var(--border-subtle)]">
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
                    {Object.values(bowlingStats).map((b, i) => (
                      <tr key={i} className="border-b border-[var(--border-subtle)] text-white">
                        <td className="px-3 py-2">{b.name}</td>
                        <td className="px-2 py-2 text-right font-semibold">{oversDisplay(b.legalBalls)}</td>
                        <td className="px-2 py-2 text-right text-gray-400">{b.runs}</td>
                        <td className="px-2 py-2 text-right text-gray-400">{b.wickets}</td>
                        <td className="px-2 py-2 text-right text-gray-400">
                          {b.legalBalls > 0 ? (b.runs / (b.legalBalls / 6)).toFixed(2) : "0.00"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}