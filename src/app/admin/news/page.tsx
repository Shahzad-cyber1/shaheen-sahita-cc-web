"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type NewsItem = {
  id: string;
  title: string;
  content: string;
  category: string;
  published: boolean;
  created_at: string;
};

export default function AdminNewsPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [articles, setArticles] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Club News");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        setCheckingAuth(false);
        loadArticles();
      }
    });
  }, [router]);

  async function loadArticles() {
    setLoading(true);
    const { data } = await supabase
      .from("news")
      .select("id, title, content, category, published, created_at")
      .order("created_at", { ascending: false });
    setArticles(data ?? []);
    setLoading(false);
  }

  async function handleAddArticle(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!title.trim() || !content.trim()) {
      setFormError("Title and content are required.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("news").insert({
      title: title.trim(),
      content: content.trim(),
      category,
    });
    setSaving(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setTitle("");
    setContent("");
    loadArticles();
  }

  async function handleTogglePublish(id: string, current: boolean) {
    await supabase.from("news").update({ published: !current }).eq("id", id);
    loadArticles();
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this article?");
    if (!confirmed) return;
    await supabase.from("news").delete().eq("id", id);
    loadArticles();
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
        <h1 className="mt-2 font-heading text-2xl text-white">Manage News</h1>

        <form
          onSubmit={handleAddArticle}
          className="glass-panel mt-8 grid gap-4 rounded-sm p-6"
        >
          <div>
            <label className="mb-1 block text-xs tracking-wide text-gray-400">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
              placeholder="Article title"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs tracking-wide text-gray-400">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
            >
              <option>Match Results</option>
              <option>Tournament</option>
              <option>Team News</option>
              <option>Player Achievement</option>
              <option>Club News</option>
              <option>Announcements</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs tracking-wide text-gray-400">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="w-full rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
              placeholder="Write the article..."
            />
          </div>

          {formError && <p className="text-xs text-red-400">{formError}</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded-sm bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black transition-transform hover:scale-[1.02] disabled:opacity-50"
          >
            {saving ? "Publishing..." : "Publish Article"}
          </button>
        </form>

        <div className="mt-10">
          <h2 className="mb-4 font-heading text-sm tracking-wide text-gray-400">
            ALL ARTICLES ({articles.length})
          </h2>

          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <div className="space-y-3">
              {articles.map((article) => (
                <div key={article.id} className="glass-panel rounded-sm p-4">
                  <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-sm text-white">{article.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {article.category} &middot;{" "}
                        <span className={article.published ? "text-green-400" : "text-gray-500"}>
                          {article.published ? "Published" : "Unpublished"}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTogglePublish(article.id, article.published)}
                        className="rounded-sm border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      >
                        {article.published ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        onClick={() => handleDelete(article.id)}
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