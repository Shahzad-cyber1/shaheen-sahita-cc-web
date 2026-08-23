"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Tournament = {
  id: string;
  name: string;
  year: number;
  status: string;
  final_result: string | null;
};

export default function AdminTournamentsPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        setCheckingAuth(false);
        loadTournaments();
      }
    });
  }, [router]);

  async function loadTournaments() {
    setLoading(true);
    const { data } = await supabase
      .from("tournaments")
      .select("id, name, year, status, final_result")
      .order("year", { ascending: false });
    setTournaments(data ?? []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Tournament name is required.");
      return;
    }

    setSaving(true);

    if (editingId) {
      const { error } = await supabase
        .from("tournaments")
        .update({ name: name.trim(), year })
        .eq("id", editingId);
      setSaving(false);
      if (error) {
        setFormError(error.message);
        return;
      }
    } else {
      const { error } = await supabase.from("tournaments").insert({
        name: name.trim(),
        year,
      });
      setSaving(false);
      if (error) {
        setFormError(error.message);
        return;
      }
    }

    setName("");
    setYear(new Date().getFullYear());
    setEditingId(null);
    loadTournaments();
  }

  function handleEditClick(t: Tournament) {
    setEditingId(t.id);
    setName(t.name);
    setYear(t.year);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setName("");
    setYear(new Date().getFullYear());
  }

  async function handleStatusChange(id: string, status: string) {
    await supabase.from("tournaments").update({ status }).eq("id", id);
    loadTournaments();
  }

  async function handleResultChange(id: string, final_result: string) {
    await supabase
      .from("tournaments")
      .update({ final_result: final_result || null })
      .eq("id", id);
    loadTournaments();
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this tournament?");
    if (!confirmed) return;
    await supabase.from("tournaments").delete().eq("id", id);
    loadTournaments();
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
        <h1 className="mt-2 font-heading text-2xl text-white">Manage Tournaments</h1>

        <form
          onSubmit={handleSubmit}
          className="glass-panel mt-8 grid gap-4 rounded-sm p-6 sm:grid-cols-2"
        >
          <div>
            <label className="mb-1 block text-xs tracking-wide text-gray-400">
              Tournament Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs tracking-wide text-gray-400">
              Year
            </label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
            />
          </div>

          {formError && (
            <p className="text-xs text-red-400 sm:col-span-2">{formError}</p>
          )}

          <div className="flex gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-sm bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black transition-transform hover:scale-[1.02] disabled:opacity-50"
            >
              {saving ? "Saving..." : editingId ? "Save Changes" : "Add Tournament"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded-sm border border-[var(--border-strong)] px-4 py-2 text-sm text-white transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="mt-10">
          <h2 className="mb-4 font-heading text-sm tracking-wide text-gray-400">
            ALL TOURNAMENTS ({tournaments.length})
          </h2>

          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <div className="space-y-3">
              {tournaments.map((t) => (
                <div key={t.id} className="glass-panel rounded-sm p-4">
                  <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-sm text-white">
                        {t.name} <span className="text-gray-500">({t.year})</span>
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Status: {t.status}
                        {t.final_result ? ` \u00B7 ${t.final_result}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value)}
                        className="rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-2 py-1.5 text-xs text-white outline-none"
                      >
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                      </select>
                      <select
                        value={t.final_result ?? ""}
                        onChange={(e) => handleResultChange(t.id, e.target.value)}
                        className="rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-2 py-1.5 text-xs text-white outline-none"
                      >
                        <option value="">No result yet</option>
                        <option value="Champions">Champions</option>
                        <option value="Finalist">Finalist</option>
                        <option value="Semi-Finalist">Semi-Finalist</option>
                        <option value="Quarter-Finalist">Quarter-Finalist</option>
                        <option value="Super 8">Super 8</option>
                        <option value="Group Stage">Group Stage</option>
                      </select>
                      <button
                        onClick={() => handleEditClick(t)}
                        className="rounded-sm border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="rounded-sm border border-red-900 px-3 py-1.5 text-xs text-red-400 transition-colors hover:border-red-500"
                      >
                        Delete
                      </button>
                    </div>
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