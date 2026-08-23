"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Match = {
  id: string;
  opponent: string;
  match_date: string;
  venue: string | null;
  overs: number;
  status: string;
  result: string | null;
};

export default function AdminMatchesPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const [opponent, setOpponent] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [venue, setVenue] = useState("Al Mahendar Cricket Ground");
  const [overs, setOvers] = useState(8);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        setCheckingAuth(false);
        loadMatches();
      }
    });
  }, [router]);

  async function loadMatches() {
    setLoading(true);
    const { data } = await supabase
      .from("matches")
      .select("id, opponent, match_date, venue, overs, status, result")
      .order("match_date", { ascending: true });
    setMatches(data ?? []);
    setLoading(false);
  }

  async function handleAddMatch(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!opponent.trim() || !matchDate) {
      setFormError("Opponent and date are required.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("matches").insert({
      opponent: opponent.trim(),
      match_date: matchDate,
      venue: venue.trim() || null,
      overs,
    });
    setSaving(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setOpponent("");
    setMatchDate("");
    loadMatches();
  }

  async function handleStatusChange(id: string, status: string) {
    await supabase.from("matches").update({ status }).eq("id", id);
    loadMatches();
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this match?");
    if (!confirmed) return;
    await supabase.from("matches").delete().eq("id", id);
    loadMatches();
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-sm text-gray-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 md:px-12">
      <div className="mx-auto max-w-4xl">
        <a href="/admin" className="text-xs text-gray-500 hover:text-[var(--accent)] transition-colors">
          &larr; Back to Dashboard
        </a>
        <h1 className="mt-2 font-heading text-2xl text-white">Manage Matches</h1>

        <form
          onSubmit={handleAddMatch}
          className="glass-panel mt-8 grid gap-4 rounded-sm p-6 sm:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-xs tracking-wide text-gray-400">
              Opponent
            </label>
            <input
              type="text"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              className="w-full rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
              placeholder="Opponent team name"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs tracking-wide text-gray-400">
              Match Date
            </label>
            <input
              type="date"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              className="w-full rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs tracking-wide text-gray-400">
              Venue
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="w-full rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs tracking-wide text-gray-400">
              Overs
            </label>
            <input
              type="number"
              value={overs}
              onChange={(e) => setOvers(Number(e.target.value))}
              className="w-full rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
            />
          </div>

          {formError && (
            <p className="text-xs text-red-400 sm:col-span-2">{formError}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-sm bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black transition-transform hover:scale-[1.02] disabled:opacity-50 sm:col-span-2"
          >
            {saving ? "Adding..." : "Add Match"}
          </button>
        </form>

        <div className="mt-10">
          <h2 className="mb-4 font-heading text-sm tracking-wide text-gray-400">
            ALL MATCHES ({matches.length})
          </h2>

          {loading ? (
            <p className="text-sm text-gray-500">Loading matches...</p>
          ) : (
            <div className="space-y-3">
              {matches.map((match) => (
                <div
                  key={match.id}
                  className="glass-panel flex flex-col items-start justify-between gap-3 rounded-sm p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="text-sm text-white">vs {match.opponent}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {match.match_date} {match.venue ? `\u00B7 ${match.venue}` : ""} \u00B7 {match.overs} overs
                    </p>
                  </div>
                    <div className="flex items-center gap-2">
                                          <a href={`/admin/matches/${match.id}`} className="rounded-sm border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">Setup</a>

                    <select
                      value={match.status}
                      onChange={(e) => handleStatusChange(match.id, e.target.value)}
                      className="rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-2 py-1.5 text-xs text-white outline-none"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="live">Live</option>
                      <option value="completed">Completed</option>
                      <option value="postponed">Postponed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <button
                      onClick={() => handleDelete(match.id)}
                      className="rounded-sm border border-red-900 px-3 py-1.5 text-xs text-red-400 transition-colors hover:border-red-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}