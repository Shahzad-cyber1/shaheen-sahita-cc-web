"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        setUser(data.user);
      }
      setLoading(false);
    });
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <p className="text-sm text-gray-500">Loading...</p>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 md:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-6">
          <div>
            <h1 className="font-heading text-2xl text-white">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Signed in as {user.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-sm border border-[var(--border-strong)] px-4 py-2 text-xs tracking-wide text-white transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            LOG OUT
          </button>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
          <div className="glass-panel rounded-sm p-6">
            <h2 className="font-heading text-sm text-white">Players</h2>
            <p className="mt-1 text-xs text-gray-500">Manage squad & profiles</p>
          </div>
          <div className="glass-panel rounded-sm p-6">
            <h2 className="font-heading text-sm text-white">Matches</h2>
            <p className="mt-1 text-xs text-gray-500">Schedule & results</p>
          </div>
          <div className="glass-panel rounded-sm p-6">
            <h2 className="font-heading text-sm text-white">News</h2>
            <p className="mt-1 text-xs text-gray-500">Publish updates</p>
          </div>
        </div>
      </div>
    </main>
  );
}