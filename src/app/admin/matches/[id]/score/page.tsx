"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Player = { id: string; name: string };

type Innings = {
  id: string;
  innings_number: number;
  batting_team: string;
  total_runs: number;
  total_wickets: number;
  total_overs: number;
  status: string;
};

export default function ScorePage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [ownTeamPlayers, setOwnTeamPlayers] = useState<Player[]>([]);
  const [opponentTeamPlayers, setOpponentTeamPlayers] = useState<Player[]>([]);
  const [maxOvers, setMaxOvers] = useState(8);
  const [opponentName, setOpponentName] = useState("");
  const [inningsNumber, setInningsNumber] = useState(1);
  const [target, setTarget] = useState<number | null>(null);
  const [firstInningsScore, setFirstInningsScore] = useState<number | null>(null);
  const [firstInningsBattingTeam, setFirstInningsBattingTeam] = useState<"us" | "opponent">("us");
  const [innings, setInnings] = useState<Innings | null>(null);

  const [striker, setStriker] = useState("");
  const [nonStriker, setNonStriker] = useState("");
  const [bowler, setBowler] = useState("");

  const [currentOver, setCurrentOver] = useState(0);
  const [currentBall, setCurrentBall] = useState(0);
  const [recentBalls, setRecentBalls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        setCheckingAuth(false);
        loadPlayers();
        loadInnings();
      }
    });
  }, [router, matchId]);

  async function loadPlayers() {
    const { data: matchData } = await supabase
      .from("matches")
      .select("playing_xi, opponent_players, opponent, overs")
      .eq("id", matchId)
      .single();

    if (matchData?.overs) {
      setMaxOvers(matchData.overs);
    }

    if (matchData?.opponent) {
      setOpponentName(matchData.opponent);
    }

    const ownPlayers: Player[] = [];

    if (matchData?.playing_xi?.length) {
      const { data } = await supabase
        .from("players")
        .select("id, name")
        .in("id", matchData.playing_xi);
      if (data) ownPlayers.push(...data);
    }

    const opponentPlayers: Player[] = (matchData?.opponent_players ?? []).map(
      (name: string, index: number) => ({
        id: `opp-${index}-${name}`,
        name: `${name} (Opp)`,
      })
    );

    setOwnTeamPlayers(ownPlayers);
    setOpponentTeamPlayers(opponentPlayers);
    setPlayers([...ownPlayers, ...opponentPlayers]);
  }

  const loadInnings = useCallback(async () => {
    const { data: inProgress } = await supabase
      .from("innings")
      .select("id, innings_number, batting_team, total_runs, total_wickets, total_overs, status")
      .eq("match_id", matchId)
      .eq("status", "in_progress")
      .order("innings_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (inProgress) {
      setInnings(inProgress);
      setInningsNumber(inProgress.innings_number);

      const { data: deliveries } = await supabase
        .from("deliveries")
        .select("over_number, ball_number")
        .eq("innings_id", inProgress.id)
        .eq("is_legal_delivery", true)
        .order("over_number", { ascending: false })
        .order("ball_number", { ascending: false })
        .limit(1);

      if (deliveries && deliveries.length > 0) {
        setCurrentOver(deliveries[0].over_number);
        setCurrentBall(deliveries[0].ball_number);
      }

      if (inProgress.innings_number === 2) {
        const { data: firstInnings } = await supabase
          .from("innings")
          .select("total_runs")
          .eq("match_id", matchId)
          .eq("innings_number", 1)
          .maybeSingle();

        if (firstInnings) {
          setFirstInningsScore(firstInnings.total_runs);
          setTarget(firstInnings.total_runs + 1);
        }
      }
      return;
    }

    const { data: completedFirst } = await supabase
      .from("innings")
      .select("id, innings_number, batting_team, total_runs, total_wickets, total_overs, status")
      .eq("match_id", matchId)
      .eq("status", "completed")
      .eq("innings_number", 1)
      .maybeSingle();

    if (completedFirst) {
      setFirstInningsScore(completedFirst.total_runs);
      setTarget(completedFirst.total_runs + 1);
      setInningsNumber(2);
    }

    setInnings(null);
  }, [matchId]);

  async function handleStartInnings(battingTeam: "us" | "opponent") {
    if (inningsNumber === 1) {
      setFirstInningsBattingTeam(battingTeam);
    }

    const { data, error } = await supabase
      .from("innings")
      .insert({
        match_id: matchId,
        innings_number: inningsNumber,
        batting_team: battingTeam === "us" ? "Shaheen Sahita CC" : (opponentName || "Opponent"),
      })
      .select()
      .single();

    if (error) {
      setMessage("Error: " + error.message);
      return;
    }

    setCurrentOver(0);
    setCurrentBall(0);
    setRecentBalls([]);
    setStriker("");
    setNonStriker("");
    setBowler("");
    setMessage("");
    setInnings(data);
  }

  async function recordDelivery(options: {
    runsOffBat?: number;
    extraType?: string;
    extraRuns?: number;
    isWicket?: boolean;
    wicketType?: string;
    isLegal: boolean;
  }) {
    if (!innings || !striker || !nonStriker || !bowler) {
      setMessage("Select striker, non-striker, and bowler first.");
      return;
    }

    setSaving(true);
    setMessage("");

    const nextBall = options.isLegal ? currentBall + 1 : currentBall;
    const isOverComplete = options.isLegal && nextBall === 6;

    const { error } = await supabase.from("deliveries").insert({
      innings_id: innings.id,
      over_number: currentOver,
      ball_number: options.isLegal ? nextBall : currentBall + 1,
      striker_id: striker.startsWith("opp-") ? null : striker,
      non_striker_id: nonStriker.startsWith("opp-") ? null : nonStriker,
      bowler_id: bowler.startsWith("opp-") ? null : bowler,
      runs_off_bat: options.runsOffBat ?? 0,
      extra_type: options.extraType ?? null,
      extra_runs: options.extraRuns ?? 0,
      is_wicket: options.isWicket ?? false,
      wicket_type: options.wicketType ?? null,
      is_legal_delivery: options.isLegal,
    });

    if (error) {
      setSaving(false);
      setMessage("Error: " + error.message);
      return;
    }

    const totalRuns = (options.runsOffBat ?? 0) + (options.extraRuns ?? 0);
    const newTotalRuns = innings.total_runs + totalRuns;
    const newWickets = innings.total_wickets + (options.isWicket ? 1 : 0);

    let inningsEnded = false;

    if (options.isLegal) {
      if (isOverComplete) {
        const newOverCount = currentOver + 1;
        setCurrentOver(newOverCount);
        setCurrentBall(0);

        if (newOverCount >= maxOvers) {
          inningsEnded = true;
        }
      } else {
        setCurrentBall(nextBall);
      }
    }

    const ballLabel = options.isWicket
      ? "W"
      : options.extraType
      ? options.extraType.toUpperCase()[0]
      : String(options.runsOffBat ?? 0);
    setRecentBalls((prev) => [...prev.slice(-9), ballLabel]);

    const oversDisplay = options.isLegal
      ? isOverComplete
        ? currentOver + 1
        : currentOver + nextBall / 10
      : currentOver + currentBall / 10;

    await supabase
      .from("innings")
      .update({
        total_runs: newTotalRuns,
        total_wickets: newWickets,
        total_overs: oversDisplay,
        status: inningsEnded ? "completed" : "in_progress",
      })
      .eq("id", innings.id);

    if (inningsEnded) {
      setMessage(`Innings complete: ${maxOvers} overs reached.`);
      setInnings(null);
      setSaving(false);
      return;
    }

    setInnings({
      ...innings,
      total_runs: newTotalRuns,
      total_wickets: newWickets,
      total_overs: oversDisplay,
    });

    let finalStriker = striker;
    let finalNonStriker = nonStriker;

    if ((options.runsOffBat ?? 0) % 2 === 1) {
      finalStriker = nonStriker;
      finalNonStriker = striker;
    }

    if (options.isLegal && isOverComplete) {
      const temp = finalStriker;
      finalStriker = finalNonStriker;
      finalNonStriker = temp;
    }

    setStriker(finalStriker);
    setNonStriker(finalNonStriker);

    if (options.isLegal && isOverComplete) {
      promptNewBowler();
    }

    setSaving(false);
  }

  function promptNewBowler() {
    const bowlingTeamPlayers = innings?.batting_team === "Shaheen Sahita CC" ? opponentTeamPlayers : ownTeamPlayers;
    const availableBowlers = bowlingTeamPlayers.filter((p) => p.id !== bowler);

    if (availableBowlers.length === 0) return;

    setBowler("");

    let newBowler = null;
    while (!newBowler) {
      const names = availableBowlers.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
      const choice = window.prompt(
        `Over complete. You MUST select the next bowler.\n${names}`
      );

      if (choice === null) {
        continue;
      }

      const index = parseInt(choice, 10) - 1;
      newBowler = availableBowlers[index];

      if (!newBowler) {
        window.alert("Invalid selection. Please choose a valid number.");
      }
    }

    setBowler(newBowler.id);
  }
  
  async function handleWicket() {
    if (innings && innings.total_wickets >= 10) {
      setMessage("Innings is all out.");
      return;
    }

    const battingTeamPlayers = innings?.batting_team === "Shaheen Sahita CC" ? ownTeamPlayers : opponentTeamPlayers;
    const availableBatters = battingTeamPlayers.filter(
      (p) => p.id !== striker && p.id !== nonStriker
    );

    if (availableBatters.length === 0) {
      setMessage("No more batters available.");
      return;
    }

    const names = availableBatters.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
    const choice = window.prompt(
      `Who is the new batter? Enter a number:\n${names}`
    );

    if (!choice) return;

    const index = parseInt(choice, 10) - 1;
    const newBatter = availableBatters[index];

    if (!newBatter) {
      setMessage("Invalid selection.");
      return;
    }

    await recordDelivery({ isWicket: true, wicketType: "bowled", isLegal: true });

    setStriker(newBatter.id);
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-sm text-gray-500">Loading...</p>
      </main>
    );
  }

  if (!innings) {
    if (inningsNumber === 2 && firstInningsScore !== null) {
      const secondBattingTeam = firstInningsBattingTeam === "us" ? "opponent" : "us";
      return (
        <main className="flex min-h-screen items-center justify-center bg-black px-6">
          <div className="text-center">
            <p className="text-sm text-gray-400">First innings complete.</p>
            <p className="mt-1 font-heading text-2xl text-white">
              Target: {target}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {secondBattingTeam === "us" ? "Shaheen Sahita CC" : opponentName} needs {target} to win
            </p>
            <button
              onClick={() => handleStartInnings(secondBattingTeam)}
              className="mt-6 rounded-sm bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-black"
            >
              Start Second Innings
            </button>
            {message && <p className="mt-3 text-xs text-red-400">{message}</p>}
          </div>
        </main>
      );
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6">
        <div className="text-center">
          <p className="mb-4 text-sm text-gray-400">Who is batting first?</p>
          <div className="flex gap-3">
            <button
              onClick={() => handleStartInnings("us")}
              className="rounded-sm bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-black"
            >
              Shaheen Sahita CC
            </button>
            <button
              onClick={() => handleStartInnings("opponent")}
              className="rounded-sm border border-[var(--border-strong)] px-6 py-2.5 text-sm text-white"
            >
              {opponentName || "Opponent"}
            </button>
          </div>
          {message && <p className="mt-3 text-xs text-red-400">{message}</p>}
        </div>
      </main>
    );
  }

  const battingPlayers = innings.batting_team === "Shaheen Sahita CC" ? ownTeamPlayers : opponentTeamPlayers;
  const bowlingPlayers = innings.batting_team === "Shaheen Sahita CC" ? opponentTeamPlayers : ownTeamPlayers;

  const strikerName = battingPlayers.find((p) => p.id === striker)?.name ?? "Select";
  const nonStrikerName = battingPlayers.find((p) => p.id === nonStriker)?.name ?? "Select";
  const bowlerName = bowlingPlayers.find((p) => p.id === bowler)?.name ?? "Select";

  return (
    <main className="min-h-screen bg-black px-4 py-6">
      <div className="mx-auto max-w-md">
        <a href="/admin/matches" className="text-xs text-gray-500">
          &larr; Back
        </a>

        <div className="glass-panel mt-3 rounded-sm p-4 text-center">
          <p className="font-heading text-4xl text-white">
            {innings.total_runs}/{innings.total_wickets}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Overs: {currentOver}.{currentBall}
          </p>
          {target !== null && innings.innings_number === 2 && (
            <p className="mt-2 text-xs text-[var(--accent)]">
              Target: {target} &middot; Need {Math.max(target - innings.total_runs, 0)} runs
            </p>
          )}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <select value={striker} onChange={(e) => setStriker(e.target.value)} className="rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-2 py-2 text-white">
            <option value="">Striker</option>
            {battingPlayers.filter((p) => p.id !== nonStriker).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={nonStriker} onChange={(e) => setNonStriker(e.target.value)} className="rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-2 py-2 text-white">
            <option value="">Non-Striker</option>
            {battingPlayers.filter((p) => p.id !== striker).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={bowler} onChange={(e) => setBowler(e.target.value)} className="rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-2 py-2 text-white">
            <option value="">Bowler</option>
            {bowlingPlayers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <p className="mt-2 text-center text-xs text-gray-500">
          {strikerName}* &amp; {nonStrikerName} &middot; {bowlerName} bowling
        </p>

        <div className="mt-3 flex flex-wrap justify-center gap-1">
          {recentBalls.map((b, i) => (
            <span key={i} className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--background-elevated)] text-[10px] text-white">
              {b}
            </span>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {[0, 1, 2, 3, 4, 6].map((run) => (
            <button
              key={run}
              disabled={saving}
              onClick={() => recordDelivery({ runsOffBat: run, isLegal: true })}
              className="rounded-sm bg-[var(--background-elevated)] py-4 text-xl font-semibold text-white active:scale-95 disabled:opacity-50"
            >
              {run}
            </button>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            disabled={saving}
            onClick={() => recordDelivery({ extraType: "wide", extraRuns: 1, isLegal: false })}
            className="rounded-sm border border-[var(--border-strong)] py-3 text-sm text-white disabled:opacity-50"
          >
            WIDE
          </button>
          <button
            disabled={saving}
            onClick={() => recordDelivery({ extraType: "no-ball", extraRuns: 1, isLegal: false })}
            className="rounded-sm border border-[var(--border-strong)] py-3 text-sm text-white disabled:opacity-50"
          >
            NO BALL
          </button>
          <button
            disabled={saving}
            onClick={() => recordDelivery({ extraType: "bye", extraRuns: 1, isLegal: true })}
            className="rounded-sm border border-[var(--border-strong)] py-3 text-sm text-white disabled:opacity-50"
          >
            BYE
          </button>
          <button
            disabled={saving}
            onClick={() => recordDelivery({ extraType: "leg-bye", extraRuns: 1, isLegal: true })}
            className="rounded-sm border border-[var(--border-strong)] py-3 text-sm text-white disabled:opacity-50"
          >
            LEG BYE
          </button>
        </div>

        <button
          disabled={saving || innings.total_wickets >= 10}
          onClick={handleWicket}
          className="mt-3 w-full rounded-sm bg-red-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {innings.total_wickets >= 10 ? "ALL OUT" : "WICKET"}
        </button>

        {message && <p className="mt-3 text-center text-xs text-red-400">{message}</p>}
      </div>
    </main>
  );
}