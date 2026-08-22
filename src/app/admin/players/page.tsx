"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Player = {
  id: string;
  name: string;
  role: string;
  title: string | null;
  status: string;
  is_captain: boolean;
  is_vice_captain: boolean;
};

export default function AdminPlayersPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [role, setRole] = useState("Batsman");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        setCheckingAuth(false);
        loadPlayers();
      }
    });
  }, [router]);

  async function loadPlayers() {
    setLoading(true);
    const { data } = await supabase
      .from("players")
      .select("id, name, role, title, status, is_captain, is_vice_captain")
      .order("name", { ascending: true });
    setPlayers(data ?? []);
    setLoading(false);
  }

  async function handleAddPlayer(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Name is required.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("players").insert({
      name: name.trim(),
      role,
      title: title.trim() || null,
    });
    setSaving(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setName("");
    setRole("Batsman");
    setTitle("");
    loadPlayers();
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Remove this player?");
    if (!confirmed) return;

    await supabase.from("players").delete().eq("id", id);
    loadPlayers();
  }

  async function handleToggleStatus(id: string, current: string) {
    const next = current === "active" ? "inactive" : "active";
    await supabase.from("players").update({ status: next }).eq("id", id);
    loadPlayers();
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
        <h1 className="mt-2 font-heading text-2xl text-white">Manage Players</h1>

        <form
          onSubmit={handleAddPlayer}
          className="glass-panel mt-8 grid gap-4 rounded-sm p-6 sm:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-xs tracking-wide text-gray-400">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
              placeholder="Player name"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs tracking-wide text-gray-400">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
            >
              <option value="Batsman">Batsman</option>
              <option value="Bowler">Bowler</option>
              <option value="All-rounder">All-rounder</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs tracking-wide text-gray-400">
              Title / Nickname (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
              placeholder="e.g. The Power Hitter"
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
            {saving ? "Adding..." : "Add Player"}
          </button>
        </form>

        <div className="mt-10">
          <h2 className="mb-4 font-heading text-sm tracking-wide text-gray-400">
            CURRENT SQUAD ({players.length})
          </h2>

          {loading ? (
            <p className="text-sm text-gray-500">Loading players...</p>
          ) : (
            <div className="space-y-3">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="glass-panel flex flex-col items-start justify-between gap-3 rounded-sm p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="text-sm text-white">
                      {player.name}
                      {player.is_captain && (
                        <span className="ml-2 text-[10px] text-[var(--accent)]">(C)</span>
                      )}
                      {player.is_vice_captain && (
                        <span className="ml-2 text-[10px] text-[var(--accent)]">(VC)</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {player.role}
                      {player.title ? ` \u00B7 ${player.title}` : ""}
                      {" \u00B7 "}
                      <span className={player.status === "active" ? "text-green-400" : "text-gray-500"}>
                        {player.status}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleStatus(player.id, player.status)}
                      className="rounded-sm border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      {player.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDelete(player.id)}
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