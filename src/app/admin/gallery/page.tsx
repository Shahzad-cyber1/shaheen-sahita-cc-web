"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type GalleryItem = {
  id: string;
  image_url: string;
  caption: string | null;
  category: string;
  featured: boolean;
};

export default function AdminGalleryPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("Team");
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
      } else {
        setCheckingAuth(false);
        loadItems();
      }
    });
  }, [router]);

  async function loadItems() {
    setLoading(true);
    const { data } = await supabase
      .from("gallery")
      .select("id, image_url, caption, category, featured")
      .order("created_at", { ascending: false });
    setItems(data ?? []);
    setLoading(false);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!file) {
      setFormError("Please choose an image.");
      return;
    }

    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("gallery")
      .upload(fileName, file);

    if (uploadError) {
      setUploading(false);
      setFormError(uploadError.message);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("gallery")
      .getPublicUrl(fileName);

    const { error: insertError } = await supabase.from("gallery").insert({
      image_url: urlData.publicUrl,
      caption: caption.trim() || null,
      category,
    });

    setUploading(false);

    if (insertError) {
      setFormError(insertError.message);
      return;
    }

    setFile(null);
    setCaption("");
    loadItems();
  }

  async function handleDelete(id: string, imageUrl: string) {
    const confirmed = window.confirm("Delete this photo?");
    if (!confirmed) return;

    const fileName = imageUrl.split("/").pop();
    if (fileName) {
      await supabase.storage.from("gallery").remove([fileName]);
    }
    await supabase.from("gallery").delete().eq("id", id);
    loadItems();
  }

  async function handleToggleFeatured(id: string, current: boolean) {
    await supabase.from("gallery").update({ featured: !current }).eq("id", id);
    loadItems();
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
      <div className="mx-auto max-w-5xl">
        <a href="/admin" className="text-xs text-gray-500 hover:text-[var(--accent)] transition-colors">
          &larr; Back to Dashboard
        </a>
        <h1 className="mt-2 font-heading text-2xl text-white">Manage Gallery</h1>

        <form
          onSubmit={handleUpload}
          className="glass-panel mt-8 grid gap-4 rounded-sm p-6 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs tracking-wide text-gray-400">
              Photo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-3 py-2 text-sm text-white outline-none file:mr-3 file:rounded-sm file:border-0 file:bg-[var(--accent)] file:px-3 file:py-1 file:text-black"
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
              <option>Team</option>
              <option>Players</option>
              <option>Matches</option>
              <option>Trophies</option>
              <option>Ground</option>
              <option>Events</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs tracking-wide text-gray-400">
              Caption (optional)
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full rounded-sm border border-[var(--border-subtle)] bg-[var(--background-elevated)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
            />
          </div>

          {formError && (
            <p className="text-xs text-red-400 sm:col-span-2">{formError}</p>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="rounded-sm bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black transition-transform hover:scale-[1.02] disabled:opacity-50 sm:col-span-2"
          >
            {uploading ? "Uploading..." : "Upload Photo"}
          </button>
        </form>

        <div className="mt-10">
          <h2 className="mb-4 font-heading text-sm tracking-wide text-gray-400">
            GALLERY ({items.length})
          </h2>

          {loading ? (
            <p className="text-sm text-gray-500">Loading...</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {items.map((item) => (
                <div key={item.id} className="glass-panel overflow-hidden rounded-sm">
                  <img
                    src={item.image_url}
                    alt={item.caption ?? ""}
                    className="h-32 w-full object-cover"
                  />
                  <div className="p-3">
                    <p className="text-xs text-gray-400">{item.category}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleToggleFeatured(item.id, item.featured)}
                        className="flex-1 rounded-sm border border-[var(--border-subtle)] px-2 py-1 text-[10px] text-gray-300 transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      >
                        {item.featured ? "Unfeature" : "Feature"}
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.image_url)}
                        className="rounded-sm border border-red-900 px-2 py-1 text-[10px] text-red-400 transition-colors hover:border-red-500"
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