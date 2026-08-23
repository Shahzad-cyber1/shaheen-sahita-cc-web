"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Player = {
  id: string;
  name: string;
  role: string;
};

type MatchDetail = {
  id: string;
  opponent: string;
  match_date: string;
  toss_winner: string | null;
  toss_decision: string | null;
  playing_xi: string[] | null;
};

export default function MatchSetupPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedXI, setSelectedXI] = useState<string[]>([]);
  const [tossWinner, setTossWinner] = useState("");
  const [tossDecision, setTossDecision] = useState("Bat");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        setCheckingAuth(false);
        loadData();
      }
    });
  }, [router, matchId]);

  async function loadData() {
    const { data: matchData } = await supabase
      .from("matches")
      .select("id, opponent, match_date, toss_winner, toss_decision, playing_xi")
      .eq("id", matchId)
      .single();

    if (matchData) {
      setMatch(matchData);
      setTossWinner(matchData.toss_winner ?? "");
      setTossDecision(matchData.toss_decision ?? "Bat");
      setSelectedXI(matchData.playing_xi ?? []);
    }

    const { data: playerData } = await supabase
      .from("players")
      .select("id, name, role")
      .eq("status", "active")
      .order("name", { ascending: true });

    setPlayers(playerData ?? []);
  }

  function togglePlayer(id: string) {
    setSelectedXI((prev) => {
      if (prev.includes(id)) {
        return prev.filter((p) => p !== id);
      }
      if (prev.length >= 11) {
        return prev;
      }
      return [...prev, id];
    });
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("matches")
      .update({
        toss_winner: tossWinner || null,
        toss_decision: tossDecision,
        playing_xi: selectedXI,
      })
      .eq("id", matchId);

    setSaving(false);

    if (error) {
      setMessage("Error: " + error.message);
      return;
    }

    setMessage("Saved successfully.");
  }

  if (checkingAuth || !match) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-sm text-gray-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 md:px-12">
      <div className="mx-auto max-w-3xl">
        <a href="/admin/matches" className="text-xs text-gray-500 hover:text-[var(--accent)] transition-colors">
          &larr; Back to Matches
        </a>
        <h1 className="mt-2 font-heading text-2xl text-white">
          Match Setup &mdash; vs {match.opponent}
        </h1>
        <p className="mt-1 text-xs text-gray-500">{match.match_date}</p>

        <div className="glass-panel mt-8 rounded-sm p-6">
          <h2 className="font-heading text-sm text-white">Toss</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs tracking-wide text-gray-400">
                Toss Winner
              </label>
              <select
                value={tossWinner}
                onChange={(e) => setTossWinner(e.target.value)}
                className="w-full rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
              >
                <option value="">Select winner</option>
                <option value="Shaheen Sahita CC">Shaheen Sahita CC</option>
                <option value={match.opponent}>{match.opponent}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs tracking-wide text-gray-400">
                Decision
              </label>
              <select
                value={tossDecision}
                onChange={(e) => setTossDecision(e.target.value)}
                className="w-full rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
              >
                <option value="Bat">Bat</option>
                <option value="Bowl">Bowl</option>
              </select>
            </div>
          </div>
        </div>

        <div className="glass-panel mt-6 rounded-sm p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-sm text-white">Playing XI</h2>
            <span className="text-xs text-gray-500">{selectedXI.length} / 11 selected</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {players.map((player) => {
              const isSelected = selectedXI.includes(player.id);
              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => togglePlayer(player.id)}
                  className={`rounded-sm border px-3 py-2 text-left text-xs transition-colors ${
                    isSelected
                      ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]"
                      : "border-[var(--border-subtle)] text-gray-300 hover:border-[var(--border-strong)]"
                  }`}
                >
                  {player.name}
                  <span className="block text-[10px] text-gray-500">{player.role}</span>
                </button>
              );
            })}
          </div>
        </div>

        {message && (
          <p className={`mt-4 text-xs ${message.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
            {message}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-6 w-full rounded-sm bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-black transition-transform hover:scale-[1.01] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Match Setup"}
        </button>
      </div>
    </main>
  );
}