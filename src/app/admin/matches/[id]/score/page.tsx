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
  const [determinedFirstBattingTeam, setDeterminedFirstBattingTeam] = useState<"us" | "opponent" | null>(null);
  const [matchComplete, setMatchComplete] = useState(false);
  const [bowlerLockedForOver, setBowlerLockedForOver] = useState(false);
  const [innings, setInnings] = useState<Innings | null>(null);

  const [striker, setStriker] = useState("");
  const [nonStriker, setNonStriker] = useState("");
  const [bowler, setBowler] = useState("");

  const [currentOver, setCurrentOver] = useState(0);
  const [currentBall, setCurrentBall] = useState(0);
  const [recentBalls, setRecentBalls] = useState<string[]>([]);
  const [lastDeliveryId, setLastDeliveryId] = useState<string | null>(null);
  const [pendingRestore, setPendingRestore] = useState<{
    strikerId: string | null;
    strikerName: string | null;
    nonStrikerId: string | null;
    nonStrikerName: string | null;
    bowlerId: string | null;
    bowlerName: string | null;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadPlayers = useCallback(async () => {
    const { data: matchData } = await supabase
      .from("matches")
      .select("playing_xi, opponent_players, opponent, overs, toss_winner, toss_decision")
      .eq("id", matchId)
      .single();

    if (matchData?.overs) {
      setMaxOvers(matchData.overs);
    }

    if (matchData?.opponent) {
      setOpponentName(matchData.opponent);
    }

    if (matchData?.toss_winner && matchData?.toss_decision) {
      const winnerIsUs = matchData.toss_winner === "Shaheen Sahita CC";
      const battingFirst: "us" | "opponent" =
        (winnerIsUs && matchData.toss_decision === "Bat") ||
        (!winnerIsUs && matchData.toss_decision === "Bowl")
          ? "us"
          : "opponent";
      setDeterminedFirstBattingTeam(battingFirst);
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
  }, [matchId]);

  const loadInnings = useCallback(async () => {
    const { data: matchStatus } = await supabase
      .from("matches")
      .select("status, result")
      .eq("id", matchId)
      .single();

    if (matchStatus?.status === "completed") {
      setMatchComplete(true);
      setMessage(matchStatus.result ?? "Match complete.");
      return;
    }

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

      const { data: lastDeliveries } = await supabase
        .from("deliveries")
        .select("over_number, ball_number, striker_id, non_striker_id, bowler_id, striker_name, non_striker_name, bowler_name")
        .eq("innings_id", inProgress.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (lastDeliveries && lastDeliveries.length > 0) {
        const last = lastDeliveries[0];

        const { data: lastLegal } = await supabase
          .from("deliveries")
          .select("over_number, ball_number")
          .eq("innings_id", inProgress.id)
          .eq("is_legal_delivery", true)
          .order("over_number", { ascending: false })
          .order("ball_number", { ascending: false })
          .limit(1);

        if (lastLegal && lastLegal.length > 0) {
          setCurrentOver(lastLegal[0].over_number);
          setCurrentBall(lastLegal[0].ball_number);
        }

        setPendingRestore({
          strikerId: last.striker_id,
          strikerName: last.striker_name,
          nonStrikerId: last.non_striker_id,
          nonStrikerName: last.non_striker_name,
          bowlerId: last.bowler_id,
          bowlerName: last.bowler_name,
        });
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
  }, [router, matchId, loadPlayers, loadInnings]);

  useEffect(() => {
    if (!pendingRestore || players.length === 0) return;

    function resolveValue(id: string | null, name: string | null): string {
      if (id) return id;
      if (name) {
        const match = players.find((p) => p.name === name);
        if (match) return match.id;
      }
      return "";
    }

    setStriker(resolveValue(pendingRestore.strikerId, pendingRestore.strikerName));
    setNonStriker(resolveValue(pendingRestore.nonStrikerId, pendingRestore.nonStrikerName));
    setBowler(resolveValue(pendingRestore.bowlerId, pendingRestore.bowlerName));
    setPendingRestore(null);
  }, [pendingRestore, players]);

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

    const strikerPlayer = players.find((p) => p.id === striker);
    const nonStrikerPlayer = players.find((p) => p.id === nonStriker);
    const bowlerPlayer = players.find((p) => p.id === bowler);

    const { data: insertedDelivery, error } = await supabase
      .from("deliveries")
      .insert({
        innings_id: innings.id,
        over_number: currentOver,
        ball_number: options.isLegal ? nextBall : currentBall + 1,
        striker_id: striker.startsWith("opp-") ? null : striker,
        non_striker_id: nonStriker.startsWith("opp-") ? null : nonStriker,
        bowler_id: bowler.startsWith("opp-") ? null : bowler,
        striker_name: strikerPlayer?.name ?? null,
        non_striker_name: nonStrikerPlayer?.name ?? null,
        bowler_name: bowlerPlayer?.name ?? null,
        runs_off_bat: options.runsOffBat ?? 0,
        extra_type: options.extraType ?? null,
        extra_runs: options.extraRuns ?? 0,
        is_wicket: options.isWicket ?? false,
        wicket_type: options.wicketType ?? null,
        is_legal_delivery: options.isLegal,
      })
      .select()
      .single();

    if (error) {
      setSaving(false);
      setMessage("Error: " + error.message);
      return;
    }

    if (insertedDelivery) {
      setLastDeliveryId(insertedDelivery.id);
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
        setBowlerLockedForOver(false);

        if (newOverCount >= maxOvers) {
          inningsEnded = true;
        }
      } else {
        setCurrentBall(nextBall);
      }
    }

    const totalRunsSoFar = innings.total_runs + (options.runsOffBat ?? 0) + (options.extraRuns ?? 0);
    if (innings.innings_number === 2 && target !== null && totalRunsSoFar >= target) {
      inningsEnded = true;
    }

    const wicketsSoFar = innings.total_wickets + (options.isWicket ? 1 : 0);
    if (wicketsSoFar >= 10) {
      inningsEnded = true;
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
      if (innings.innings_number === 1) {
        setFirstInningsScore(newTotalRuns);
        setTarget(newTotalRuns + 1);
        setInningsNumber(2);
        setMessage(`First innings complete: ${newTotalRuns}/${newWickets}.`);
      } else {
        const chasingTeam = innings.batting_team;
        const defendingTeam = firstInningsBattingTeam === "us" ? "Shaheen Sahita CC" : (opponentName || "Opponent");

        let resultText = "";
        if (target !== null && newTotalRuns >= target) {
          const wicketsLeft = 10 - newWickets;
          resultText = `${chasingTeam} won by ${wicketsLeft} wicket${wicketsLeft === 1 ? "" : "s"}!`;
        } else if (newWickets >= 10) {
          const runsShort = (target ?? 0) - newTotalRuns - 1;
          resultText = `${defendingTeam} won by ${runsShort} run${runsShort === 1 ? "" : "s"}!`;
        } else {
          const runsShort = (target ?? 0) - newTotalRuns - 1;
          resultText = runsShort >= 0
            ? `${defendingTeam} won by ${runsShort} run${runsShort === 1 ? "" : "s"}!`
            : `${chasingTeam} won!`;
        }

        setMessage(resultText);
        setMatchComplete(true);

        await supabase
          .from("matches")
          .update({ status: "completed", result: resultText })
          .eq("id", matchId);
      }
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

  function promptNewBowler(isInjuryChange = false) {
    const bowlingTeamPlayers = innings?.batting_team === "Shaheen Sahita CC" ? opponentTeamPlayers : ownTeamPlayers;
    const availableBowlers = bowlingTeamPlayers.filter((p) => p.id !== bowler);

    if (availableBowlers.length === 0) return;

    setBowler("");

    let newBowler = null;
    while (!newBowler) {
      const names = availableBowlers.map((p, i) => `${i + 1}. ${p.name}`).join("\n");
      const promptText = isInjuryChange
        ? `Injury / mid-over change. Select the replacement bowler.\n${names}`
        : `Over complete. You MUST select the next bowler.\n${names}`;
      const choice = window.prompt(promptText);

      if (choice === null) {
        continue;
      }

      const index = parseInt(choice, 10) - 1;
      newBowler = availableBowlers[index];

      if (!newBowler) {
        window.alert("Invalid selection. Please choose a valid number.");
      }
    }

    if (isInjuryChange) {
      setBowlerLockedForOver(true);
    }

    setBowler(newBowler.id);
  }

  async function handleUndo() {
    if (!lastDeliveryId || !innings) {
      setMessage("Nothing to undo.");
      return;
    }

    const confirmed = window.confirm("Undo the last delivery? This cannot be reversed.");
    if (!confirmed) return;

    const { data: deliveryToUndo } = await supabase
      .from("deliveries")
      .select("*")
      .eq("id", lastDeliveryId)
      .single();

    if (!deliveryToUndo) {
      setMessage("Could not find last delivery.");
      return;
    }

    setSaving(true);

    await supabase.from("deliveries").delete().eq("id", lastDeliveryId);

    const runsToRemove = deliveryToUndo.runs_off_bat + deliveryToUndo.extra_runs;
    const newTotalRuns = Math.max(innings.total_runs - runsToRemove, 0);
    const newWickets = deliveryToUndo.is_wicket
      ? Math.max(innings.total_wickets - 1, 0)
      : innings.total_wickets;

    if (deliveryToUndo.is_legal_delivery) {
      if (currentBall === 0) {
        setCurrentOver(Math.max(currentOver - 1, 0));
        setCurrentBall(5);
      } else {
        setCurrentBall(currentBall - 1);
      }
    }

    const newOversDisplay =
      currentBall === 0 && deliveryToUndo.is_legal_delivery
        ? Math.max(currentOver - 1, 0) + 5 / 10
        : currentOver + Math.max(currentBall - (deliveryToUndo.is_legal_delivery ? 1 : 0), 0) / 10;

    await supabase
      .from("innings")
      .update({
        total_runs: newTotalRuns,
        total_wickets: newWickets,
        total_overs: newOversDisplay,
      })
      .eq("id", innings.id);

    setInnings({
      ...innings,
      total_runs: newTotalRuns,
      total_wickets: newWickets,
      total_overs: newOversDisplay,
    });

    setRecentBalls((prev) => prev.slice(0, -1));
    setLastDeliveryId(null);
    setMessage("Last delivery undone.");
    setSaving(false);
  }

  function handleExtraWithRuns(type: "wide" | "no-ball" | "bye" | "leg-bye") {
    const labels: Record<string, string> = {
      wide: "Wide",
      "no-ball": "No Ball",
      bye: "Bye",
      "leg-bye": "Leg Bye",
    };

    const input = window.prompt(
      `${labels[type]}: how many runs were run (in addition to the 1 for the ${labels[type].toLowerCase()})? Enter 0 if none.`,
      "0"
    );

    if (input === null) return;

    const extraRunsTaken = parseInt(input, 10);
    if (isNaN(extraRunsTaken) || extraRunsTaken < 0) {
      window.alert("Invalid number.");
      return;
    }

    if (type === "wide" || type === "no-ball") {
      recordDelivery({
        extraType: type,
        extraRuns: 1 + extraRunsTaken,
        isLegal: false,
      });
    } else {
      recordDelivery({
        extraType: type,
        extraRuns: extraRunsTaken === 0 ? 1 : extraRunsTaken,
        isLegal: true,
      });
    }
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

  async function handleDeclareInnings() {
    if (!innings) return;

    const confirmed = window.confirm(
      `Declare/end this innings now at ${innings.total_runs}/${innings.total_wickets}?`
    );
    if (!confirmed) return;

    setSaving(true);

    if (innings.innings_number === 1) {
      setFirstInningsScore(innings.total_runs);
      setTarget(innings.total_runs + 1);
      setInningsNumber(2);
      setMessage(`First innings declared: ${innings.total_runs}/${innings.total_wickets}.`);

      await supabase
        .from("innings")
        .update({ status: "completed" })
        .eq("id", innings.id);
    } else {
      const chasingTeam = innings.batting_team;
      const defendingTeam = firstInningsBattingTeam === "us" ? "Shaheen Sahita CC" : (opponentName || "Opponent");

      let resultText = "";
      if (target !== null && innings.total_runs >= target) {
        const wicketsLeft = 10 - innings.total_wickets;
        resultText = `${chasingTeam} won by ${wicketsLeft} wicket${wicketsLeft === 1 ? "" : "s"}!`;
      } else {
        const runsShort = (target ?? 0) - innings.total_runs - 1;
        resultText = runsShort >= 0
          ? `${defendingTeam} won by ${runsShort} run${runsShort === 1 ? "" : "s"}!`
          : `${chasingTeam} won!`;
      }

      setMessage(resultText);
      setMatchComplete(true);

      await supabase
        .from("innings")
        .update({ status: "completed" })
        .eq("id", innings.id);

      await supabase
        .from("matches")
        .update({ status: "completed", result: resultText })
        .eq("id", matchId);
    }

    setInnings(null);
    setSaving(false);
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-sm text-gray-500">Loading...</p>
      </main>
    );
  }

  if (matchComplete) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6">
        <div className="text-center">
          <p className="text-xs tracking-widest text-[var(--accent)]">MATCH COMPLETE</p>
          <p className="mt-3 font-heading text-2xl text-white">{message}</p>
          <a href="/admin/matches" className="mt-6 inline-block rounded-sm border border-[var(--border-strong)] px-6 py-2.5 text-sm text-white">Back to Matches</a>
        </div>
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

    if (!determinedFirstBattingTeam) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-black px-6">
          <div className="text-center">
            <p className="text-sm text-gray-400">
              Toss information is missing for this match.
            </p>
            <a href={`/admin/matches/${matchId}`} className="mt-4 inline-block rounded-sm bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-black">Go to Match Setup</a>
          </div>
        </main>
      );
    }

    const battingTeamLabel =
      determinedFirstBattingTeam === "us" ? "Shaheen Sahita CC" : (opponentName || "Opponent");

    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6">
        <div className="text-center">
          <p className="text-sm text-gray-400">Based on the toss:</p>
          <p className="mt-1 font-heading text-2xl text-white">
            {battingTeamLabel} bats first
          </p>
          <button
            onClick={() => handleStartInnings(determinedFirstBattingTeam)}
            className="mt-6 rounded-sm bg-[var(--accent)] px-6 py-2.5 text-sm font-medium text-black"
          >
            Start Innings
          </button>
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

        <div className="relative mt-3 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-gradient-to-b from-[var(--background-elevated)] to-black p-5 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.12),transparent_70%)]" />
          <p className="relative text-xs tracking-widest text-gray-500">{innings.batting_team.toUpperCase()}</p>
          <p className="relative mt-1 font-heading text-5xl font-bold text-gold-gradient">
            {innings.total_runs}<span className="text-white">/</span>{innings.total_wickets}
          </p>
          <p className="relative mt-1 text-sm text-gray-400">
            Overs {currentOver}.{currentBall} <span className="text-gray-600">/ {maxOvers}</span>
          </p>
          {target !== null && innings.innings_number === 2 && (
            <p className="relative mt-3 rounded-md border border-[var(--accent)]/30 bg-[var(--accent)]/10 py-1.5 text-xs text-[var(--accent-light)]">
              🎯 Target {target} &middot; Need {Math.max(target - innings.total_runs, 0)} runs
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

        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
          {recentBalls.map((b, i) => {
            const isWicket = b === "W";
            const isBoundary = b === "4" || b === "6";
            const isExtra = ["W", "N", "B", "L"].includes(b) && !isWicket;
            return (
              <span
                key={i}
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  isWicket
                    ? "bg-red-600 text-white"
                    : isBoundary
                    ? "bg-[var(--accent)] text-black"
                    : isExtra
                    ? "border border-[var(--border-strong)] bg-[var(--background-elevated)] text-gray-300"
                    : "bg-[var(--background-elevated)] text-gray-400"
                }`}
              >
                {b}
              </span>
            );
          })}
          {lastDeliveryId && (
            <button
              onClick={handleUndo}
              disabled={saving}
              className="ml-2 rounded-md border border-[var(--border-strong)] px-2.5 py-1.5 text-[10px] font-medium text-white transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
            >
              ↺ UNDO
            </button>
          )}
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2.5">
          {[0, 1, 2, 3, 4, 6].map((run) => {
            const isBoundary = run === 4 || run === 6;
            return (
              <button
                key={run}
                disabled={saving}
                onClick={() => recordDelivery({ runsOffBat: run, isLegal: true })}
                className={`relative overflow-hidden rounded-lg py-5 text-2xl font-bold transition-all active:scale-90 disabled:opacity-40 ${
                  isBoundary
                    ? "bg-gradient-to-br from-[var(--accent-light)] to-[var(--accent-dark)] text-black shadow-[0_0_20px_rgba(212,175,55,0.35)]"
                    : "border border-[var(--border-subtle)] bg-[var(--background-elevated)] text-white hover:border-[var(--border-strong)]"
                }`}
              >
                {run}
                {run === 6 && <span className="absolute right-2 top-1 text-[9px] opacity-70">MAX</span>}
                {run === 4 && <span className="absolute right-2 top-1 text-[9px] opacity-70">FOUR</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <button
            disabled={saving}
            onClick={() => handleExtraWithRuns("wide")}
            className="rounded-lg border border-cyan-700 bg-cyan-950/40 py-3 text-xs font-semibold text-cyan-300 transition-all active:scale-90 disabled:opacity-40"
          >
            WD
          </button>
          <button
            disabled={saving}
            onClick={() => handleExtraWithRuns("no-ball")}
            className="rounded-lg border border-orange-800 bg-orange-950/40 py-3 text-xs font-semibold text-orange-300 transition-all active:scale-90 disabled:opacity-40"
          >
            NB
          </button>
          <button
            disabled={saving}
            onClick={() => handleExtraWithRuns("bye")}
            className="rounded-lg border border-purple-800 bg-purple-950/40 py-3 text-xs font-semibold text-purple-300 transition-all active:scale-90 disabled:opacity-40"
          >
            BYE
          </button>
          <button
            disabled={saving}
            onClick={() => handleExtraWithRuns("leg-bye")}
            className="rounded-lg border border-teal-800 bg-teal-950/40 py-3 text-xs font-semibold text-teal-300 transition-all active:scale-90 disabled:opacity-40"
          >
            LB
          </button>
        </div>

        <button
          disabled={saving || innings.total_wickets >= 10}
          onClick={handleWicket}
          className="mt-3 w-full rounded-lg bg-gradient-to-r from-red-700 to-red-600 py-4 text-base font-bold tracking-widest text-white shadow-[0_0_25px_rgba(220,38,38,0.4)] transition-all active:scale-95 disabled:opacity-40 disabled:shadow-none"
        >
          {innings.total_wickets >= 10 ? "ALL OUT" : "🏏 WICKET"}
        </button>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => promptNewBowler(true)}
            disabled={saving || bowlerLockedForOver}
            className="flex-1 rounded-sm border border-[var(--border-subtle)] py-2 text-xs text-gray-300 disabled:opacity-50"
          >
            {bowlerLockedForOver ? "Bowler Set for Over" : "Injury / Change Bowler"}
          </button>
          <button
            onClick={handleDeclareInnings}
            disabled={saving}
            className="flex-1 rounded-sm border border-[var(--border-subtle)] py-2 text-xs text-gray-300 disabled:opacity-50"
          >
            Declare Innings
          </button>
        </div>

        {message && <p className="mt-3 text-center text-xs text-red-400">{message}</p>}
      </div>
    </main>
  );
}