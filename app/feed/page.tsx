"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import Pagination from "@/app/components/Pagination";
import BlockButton from "@/app/components/BlockButton";
import { isIOSNative } from "@/lib/native";

type ReactionSummary = {
  emoji: string;
  count: number;
  names: string[];
};

type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    role: string;
    avatar_url: string | null;
  };
  likes_count: number;
  comments_count: number;
  user_liked: boolean;
  user_reactions: string[];
  reactions_summary: ReactionSummary[];
  comments: Comment[];
  allCommentsLoaded: boolean;
};

type Comment = {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string | null;
  };
};

const REACTIONS = ["👍", "❤️", "😂", "😮", "👏", "🔥"];

function Avatar({ src, name, size = "w-12 h-12", textSize = "text-lg" }: { src?: string | null; name?: string; size?: string; textSize?: string }) {
  if (src) {
    const px = size.includes("w-8") ? 32 : 48;
    return (
      <Image
        src={src}
        alt={name || ""}
        width={px}
        height={px}
        className={`${size} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white font-bold ${textSize} flex-shrink-0`}>
      {name?.charAt(0) || "?"}
    </div>
  );
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [totalPosts, setTotalPosts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; profile?: { full_name?: string; role?: string; avatar_url?: string | null } } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reactionsPopup, setReactionsPopup] = useState<{ postId: string; emoji: string; names: string[] } | null>(null);
  const [feedQuota, setFeedQuota] = useState<{ remaining: number | null; limit: number; subscription: string } | null>(null);
  const [reportingPost, setReportingPost] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string>("spam");
  const [reportComment, setReportComment] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportedPostIds, setReportedPostIds] = useState<Set<string>>(new Set());
  // App Store: na iOS žádné navádění k nákupu (3.1.1) — skryjeme Premium upsell.
  const [isIos, setIsIos] = useState(false);
  useEffect(() => setIsIos(isIOSNative()), []);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    loadPosts(currentPage);
  }, [currentPage]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role, avatar_url")
        .eq("id", user.id)
        .single();
      setCurrentUser({ ...user, profile: profile || undefined });
      loadFeedQuota(user.id);
    }
  };

  const loadFeedQuota = async (userId: string) => {
    const { data, error } = await supabase
      .from("v_my_feed_quota")
      .select("subscription_type, monthly_post_limit, posts_remaining")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return;
    const row = data as {
      subscription_type: string | null;
      monthly_post_limit: number | null;
      posts_remaining: number | null;
    };
    setFeedQuota({
      remaining: row.posts_remaining,
      limit: row.monthly_post_limit ?? 3,
      subscription: row.subscription_type || "free",
    });
  };

  const loadPosts = async (page: number) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    // App Store 1.2 — skryj příspěvky autorů, které jsem zablokoval.
    let blockedIds: string[] = [];
    if (user) {
      const { data: blk } = await supabase
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", user.id);
      blockedIds = (blk ?? []).map((b) => b.blocked_id as string);
    }

    const from = (page - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data: postsData, count } = await supabase
      .from("posts")
      .select(`
        *,
        profiles:user_id (full_name, role, avatar_url),
        post_likes (user_id, profiles:user_id (full_name)),
        post_comments (id, content, created_at, profiles:user_id (full_name, avatar_url)),
        post_reactions (user_id, emoji, profiles:user_id (full_name))
      `, { count: "exact" })
      .eq("moderation_status", "approved")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (count !== null) setTotalPosts(count);

    if (postsData) {
      type PostRow = Record<string, unknown> & {
        user_id?: string;
        post_likes?: { user_id: string; profiles?: { full_name: string } | null }[];
        post_comments?: { id: string; content: string; created_at: string; profiles: { full_name: string; avatar_url: string | null } }[];
        post_reactions?: { user_id: string; emoji: string; profiles?: { full_name: string } | null }[];
      };

      const visiblePosts = blockedIds.length
        ? (postsData as PostRow[]).filter((p) => !blockedIds.includes(p.user_id as string))
        : (postsData as PostRow[]);

      const postsWithDetails = visiblePosts.map((post: PostRow) => {
        const likes = post.post_likes || [];
        const comments = post.post_comments || [];
        const reactions = post.post_reactions || [];

        // Merge likes as 👍 reactions for backwards compat
        const allReactions = [
          ...reactions.map(r => ({ user_id: r.user_id, emoji: r.emoji, name: r.profiles?.full_name || "" })),
          ...likes.filter(l => !reactions.some(r => r.user_id === l.user_id)).map(l => ({ user_id: l.user_id, emoji: "👍", name: l.profiles?.full_name || "" })),
        ];
        // Dedupe: one reaction per user (keep last)
        const uniqueReactions = Object.values(
          allReactions.reduce<Record<string, { user_id: string; emoji: string; name: string }>>((acc, r) => {
            acc[r.user_id] = r;
            return acc;
          }, {})
        );

        // Build per-emoji name lists for tooltips
        const reactionNames = uniqueReactions.reduce<Record<string, string[]>>((acc, r) => {
          if (!acc[r.emoji]) acc[r.emoji] = [];
          if (r.name) acc[r.emoji].push(r.name);
          return acc;
        }, {});

        return {
          ...post,
          likes_count: uniqueReactions.length,
          comments_count: comments.length,
          user_liked: user ? uniqueReactions.some((r) => r.user_id === user.id) : false,
          user_reactions: user
            ? uniqueReactions.filter((r) => r.user_id === user.id).map((r) => r.emoji)
            : [],
          reactions_summary: Object.entries(
            uniqueReactions.reduce<Record<string, number>>((acc, r) => {
              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
              return acc;
            }, {})
          ).map(([emoji, count]) => ({ emoji, count, names: reactionNames[emoji] || [] }))
            .sort((a, b) => b.count - a.count),
          comments: comments
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .slice(0, 3),
          allCommentsLoaded: comments.length <= 3,
          post_likes: undefined,
          post_comments: undefined,
          post_reactions: undefined,
        };
      });

      setPosts(postsWithDetails as unknown as Post[]);
    }
    setLoading(false);
  };

  const loadAllComments = async (postId: string) => {
    const { data } = await supabase
      .from("post_comments")
      .select("id, content, created_at, profiles:user_id (full_name, avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (data) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, comments: data as unknown as Comment[], allCommentsLoaded: true }
            : p
        )
      );
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert('Povolené formáty: JPG, PNG, WebP');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Maximální velikost souboru je 5 MB');
        return;
      }
      setNewPostImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePost = async () => {
    if (!currentUser || (!newPostContent.trim() && !newPostImage)) return;

    setPosting(true);
    let imageUrl = null;

    if (newPostImage) {
      const fileExt = newPostImage.name.split(".").pop();
      const fileName = `${currentUser.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("posts")
        .upload(fileName, newPostImage);

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from("posts")
          .getPublicUrl(fileName);
        imageUrl = publicUrl;
      }
    }

    // C.F3 — AI moderace před publikací (CZ blocklist + OpenAI)
    let moderationStatus: "approved" | "pending" = "approved";
    let moderationFlags: unknown = null;
    try {
      const modRes = await fetch("/api/moderation/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newPostContent.trim(), kind: "feed" }),
      });
      if (modRes.ok) {
        const mod = await modRes.json();
        if (mod.flagged) {
          alert("Příspěvek nelze publikovat — obsahuje obsah, který porušuje pravidla komunity.");
          setPosting(false);
          return;
        }
        if (mod.failOpen) {
          // OpenAI nedostupné → do admin fronty místo přímé publikace
          moderationStatus = "pending";
          moderationFlags = { failOpen: true, reason: mod.error || "moderation_unavailable" };
        }
      } else {
        moderationStatus = "pending";
        moderationFlags = { failOpen: true, http: modRes.status };
      }
    } catch {
      moderationStatus = "pending";
      moderationFlags = { failOpen: true, reason: "network_error" };
    }

    const { error } = await supabase.from("posts").insert({
      user_id: currentUser.id,
      content: newPostContent.trim(),
      image_url: imageUrl,
      moderation_status: moderationStatus,
      moderation_flags: moderationFlags,
      moderation_checked_at: new Date().toISOString(),
    });

    if (error) {
      const msg = error.message || "";
      if (msg.includes("Vyčerpali jste") || msg.includes("free_feed_posts_per_month")) {
        alert(
          msg.includes("Vyčerpali")
            ? msg
            : "Vyčerpali jste bezplatné příspěvky pro tento měsíc. Aktivujte Premium pro neomezené přidávání.",
        );
      } else {
        alert("Nepodařilo se publikovat příspěvek.");
      }
      loadFeedQuota(currentUser.id);
      setPosting(false);
      return;
    }

    setNewPostContent("");
    setNewPostImage(null);
    setImagePreview(null);
    setPosting(false);
    loadFeedQuota(currentUser.id);
    if (currentPage === 1) loadPosts(1);
    else setCurrentPage(1);
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Opravdu chcete smazat příspěvek?")) return;

    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) {
      alert("Nepodařilo se smazat příspěvek.");
      return;
    }
    loadPosts(currentPage);
  };

  const handleEditPost = async (postId: string) => {
    if (!editContent.trim()) return;

    const { error } = await supabase
      .from("posts")
      .update({ content: editContent.trim() })
      .eq("id", postId);

    if (error) {
      alert("Nepodařilo se upravit příspěvek.");
      return;
    }

    setEditingPost(null);
    setEditContent("");
    loadPosts(currentPage);
  };

  const handleReportSubmit = async () => {
    if (!reportingPost || !currentUser) return;
    setReportSubmitting(true);
    const { error } = await supabase.from("post_reports").insert({
      post_id: reportingPost,
      reporter_id: currentUser.id,
      reason: reportReason,
      comment: reportComment.trim() || null,
    });
    setReportSubmitting(false);
    if (error) {
      if (error.code === "23505") {
        alert("Tento příspěvek jste již nahlásili.");
      } else {
        alert(`Nepodařilo se odeslat hlášení: ${error.message}`);
        return;
      }
    }
    setReportedPostIds((prev) => new Set([...prev, reportingPost]));
    setReportingPost(null);
    setReportReason("spam");
    setReportComment("");
  };

  const handleReaction = async (postId: string, emoji: string) => {
    if (!currentUser) return;

    const post = posts.find(p => p.id === postId);
    const currentReaction = post?.user_reactions[0]; // user can only have one reaction

    // Remove existing reaction (from both tables for backwards compat)
    await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", currentUser.id);
    await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", currentUser.id);

    // If clicking same reaction = remove (toggle off). Otherwise set new one.
    if (currentReaction !== emoji) {
      await supabase.from("post_reactions").insert({
        post_id: postId,
        user_id: currentUser.id,
        emoji,
      });
    }

    setShowReactions(null);
    loadPosts(currentPage);
  };

  const handleComment = async (postId: string) => {
    const comment = newComments[postId]?.trim();
    if (!currentUser || !comment) return;

    const { error } = await supabase.from("post_comments").insert({
      post_id: postId,
      user_id: currentUser.id,
      content: comment,
    });

    if (error) {
      alert("Nepodařilo se odeslat komentář.");
      return;
    }

    setNewComments((prev) => ({ ...prev, [postId]: "" }));
    loadPosts(currentPage);
  };

  const timeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "právě teď";
    if (diffMins < 60) return `před ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `před ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `před ${diffDays}d`;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />

      <div className="pt-24 pb-12">
        <div className="max-w-2xl mx-auto px-4">

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Feed</h1>
            <p className="text-gray-600 mt-2">Sdílejte své projekty a inspirujte ostatní</p>
          </div>

          {/* New Post */}
          {currentUser ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              {feedQuota && feedQuota.remaining !== null && (
                <div
                  className={`mb-4 -mt-1 rounded-lg px-3 py-2 text-sm border ${
                    feedQuota.remaining === 0
                      ? "bg-orange-50 border-orange-200 text-orange-800"
                      : "bg-gray-50 border-gray-200 text-gray-600"
                  }`}
                >
                  {feedQuota.remaining === 0 ? (
                    <>
                      Free limit vyčerpán ({feedQuota.limit} příspěvků / 30 dní).{" "}
                      {!isIos && (
                        <Link href="/predplatne" className="text-cyan-700 font-semibold underline">
                          Aktivovat Premium pro neomezené příspěvky →
                        </Link>
                      )}
                    </>
                  ) : (
                    <>
                      Zbývá <strong>{feedQuota.remaining}</strong> z {feedQuota.limit} bezplatných
                      příspěvků v tomto měsíci.
                    </>
                  )}
                </div>
              )}
              <div className="flex gap-4">
                <Avatar src={currentUser.profile?.avatar_url} name={currentUser.profile?.full_name} />
                <div className="flex-1">
                  <textarea
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="Co je nového? Sdílejte svůj projekt..."
                    className="w-full border-0 resize-none focus:ring-0 text-gray-700 placeholder-gray-400 text-lg"
                    rows={3}
                    disabled={feedQuota?.remaining === 0}
                  />

                  {imagePreview && (
                    <div className="relative mt-3">
                      <img src={imagePreview} alt="Preview" className="rounded-xl max-h-64 object-cover" />
                      <button
                        onClick={() => { setNewPostImage(null); setImagePreview(null); }}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div className="flex gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                      >
                        📷 Fotka
                      </button>
                    </div>
                    <button
                      onClick={handlePost}
                      disabled={
                        posting ||
                        (!newPostContent.trim() && !newPostImage) ||
                        feedQuota?.remaining === 0
                      }
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-2 rounded-xl font-semibold disabled:opacity-50 hover:shadow-lg transition-all"
                    >
                      {posting ? "Publikuji..." : "Publikovat"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 text-center">
              <p className="text-gray-600 mb-4">Pro přidávání příspěvků se musíte přihlásit</p>
              <Link href="/auth/login" className="text-cyan-600 font-semibold hover:text-cyan-700">
                Přihlásit se →
              </Link>
            </div>
          )}

          {/* Posts */}
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Zatím žádné příspěvky</h3>
              <p className="text-gray-600">Buďte první, kdo něco sdílí!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Post Header */}
                  <div className="p-6 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Link href={`/fachman/${post.user_id}`} className="cursor-pointer hover:opacity-80 transition-opacity">
                          <Avatar src={post.profiles?.avatar_url} name={post.profiles?.full_name} />
                        </Link>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link href={`/fachman/${post.user_id}`} className="font-semibold text-gray-900 hover:opacity-80 transition-opacity">
                              {post.profiles?.full_name}
                            </Link>
                            {post.profiles?.role === "provider" && (
                              <span className="bg-cyan-100 text-cyan-700 text-xs px-2 py-0.5 rounded-full">Fachman</span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">{timeAgo(post.created_at)}</span>
                        </div>
                      </div>

                      {/* Own post actions */}
                      {currentUser?.id === post.user_id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingPost(post.id);
                              setEditContent(post.content);
                            }}
                            className="p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors text-sm"
                            title="Upravit"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                            title="Smazat"
                          >
                            🗑️
                          </button>
                        </div>
                      ) : currentUser ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => !reportedPostIds.has(post.id) && setReportingPost(post.id)}
                            disabled={reportedPostIds.has(post.id)}
                            className={`p-2 rounded-lg transition-colors text-sm ${
                              reportedPostIds.has(post.id)
                                ? "text-gray-300 cursor-not-allowed"
                                : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                            }`}
                            title={reportedPostIds.has(post.id) ? "Již nahlášeno" : "Nahlásit příspěvek"}
                            aria-label="Nahlásit příspěvek"
                          >
                            🚩
                          </button>
                          {/* App Store 1.2 — blokování autora příspěvku */}
                          <BlockButton targetUserId={post.user_id} targetName={post.profiles?.full_name} />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Content - editable or static */}
                  {editingPost === post.id ? (
                    <div className="px-6 pb-4">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                        rows={4}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleEditPost(post.id)}
                          className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-semibold hover:bg-cyan-600 transition-colors text-sm"
                        >
                          Uložit
                        </button>
                        <button
                          onClick={() => { setEditingPost(null); setEditContent(""); }}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl font-semibold transition-colors text-sm"
                        >
                          Zrušit
                        </button>
                      </div>
                    </div>
                  ) : post.content ? (
                    <div className="px-6 pb-4">
                      <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
                    </div>
                  ) : null}

                  {/* Image */}
                  {post.image_url && (
                    <div className="px-6 pb-4">
                      <Image
                        src={post.image_url}
                        alt=""
                        width={1200}
                        height={1200}
                        sizes="(max-width: 672px) 100vw, 672px"
                        className="w-full h-auto rounded-xl object-contain max-h-[600px]"
                      />
                    </div>
                  )}

                  {/* Stats + Reaction summary */}
                  <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center gap-3">
                      {post.reactions_summary.length > 0 && (
                        <div className="flex items-center gap-2">
                          {post.reactions_summary.slice(0, 3).map((r) => (
                            <span
                              key={r.emoji}
                              className="relative group/tip cursor-pointer"
                              onClick={() => r.names.length > 0 && setReactionsPopup({ postId: post.id, emoji: r.emoji, names: r.names })}
                            >
                              <span className="text-base">{r.emoji} {r.count > 1 ? r.count : ""}</span>
                              {r.names.length > 0 && (
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap opacity-0 invisible md:group-hover/tip:opacity-100 md:group-hover/tip:visible transition-all z-20 pointer-events-none">
                                  {r.names.slice(0, 5).join(", ")}{r.names.length > 5 ? ` a ${r.names.length - 5} dalších` : ""}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                      {post.likes_count > 0 && <span>{post.likes_count} líbí se</span>}
                    </div>
                    <span
                      onClick={() => setOpenComments(openComments === post.id ? null : post.id)}
                      className="cursor-pointer hover:underline"
                    >
                      {post.comments_count} komentářů
                    </span>
                  </div>

                  {/* Actions — FB-style: one reaction per user */}
                  <div className="px-6 py-3 border-t border-gray-100 flex items-center gap-2">
                    {/* Like / Reaction button with hover + click picker */}
                    <div className="relative flex-1 group/react">
                      <button
                        onClick={() => {
                          if (!currentUser) return;
                          // On mobile: toggle picker. On desktop: quick like.
                          if (showReactions === post.id) {
                            setShowReactions(null);
                          } else {
                            setShowReactions(post.id);
                          }
                        }}
                        onDoubleClick={() => currentUser && handleReaction(post.id, "👍")}
                        className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl transition-colors ${
                          post.user_liked ? "text-cyan-600 bg-cyan-50" : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {post.user_reactions[0] || (post.user_liked ? "👍" : "🤍")} {post.user_reactions[0] ? "Reagováno" : "Líbí se"}
                      </button>
                      {/* Hover + click picker */}
                      <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-full shadow-lg border border-gray-100 px-2 py-1 flex gap-1 transition-all z-10 ${
                        showReactions === post.id ? "opacity-100 visible" : "opacity-0 invisible md:group-hover/react:opacity-100 md:group-hover/react:visible"
                      }`}>
                        {REACTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(post.id, emoji)}
                            className={`w-10 h-10 rounded-full hover:bg-gray-100 text-xl transition-transform hover:scale-125 ${
                              post.user_reactions.includes(emoji) ? "bg-cyan-100 scale-110" : ""
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => setOpenComments(openComments === post.id ? null : post.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      💬 Komentář
                    </button>
                  </div>

                  {/* Comments Section */}
                  {openComments === post.id && (
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                      {post.comments.length > 0 && (
                        <div className="space-y-3 mb-4">
                          {post.comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                              <Avatar src={comment.profiles?.avatar_url} name={comment.profiles?.full_name} size="w-8 h-8" textSize="text-sm" />
                              <div className="flex-1 bg-white rounded-xl px-4 py-2">
                                <span className="font-semibold text-sm text-gray-900">{comment.profiles?.full_name}</span>
                                <p className="text-sm text-gray-700">{comment.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Show more comments */}
                      {!post.allCommentsLoaded && post.comments_count > 3 && (
                        <button
                          onClick={() => loadAllComments(post.id)}
                          className="text-cyan-600 text-sm font-semibold hover:text-cyan-700 mb-4 block"
                        >
                          Zobrazit všech {post.comments_count} komentářů
                        </button>
                      )}

                      {currentUser && (
                        <div className="flex gap-3">
                          <Avatar src={currentUser.profile?.avatar_url} name={currentUser.profile?.full_name} size="w-8 h-8" textSize="text-sm" />
                          <div className="flex-1 flex gap-2">
                            <input
                              type="text"
                              value={newComments[post.id] || ""}
                              onChange={(e) => setNewComments((prev) => ({ ...prev, [post.id]: e.target.value }))}
                              placeholder="Napište komentář..."
                              className="flex-1 bg-white rounded-xl px-4 py-2 border border-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                              onKeyDown={(e) => e.key === "Enter" && handleComment(post.id)}
                            />
                            <button
                              onClick={() => handleComment(post.id)}
                              className="bg-cyan-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-cyan-600"
                            >
                              →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {totalPosts > ITEMS_PER_PAGE && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalPosts / ITEMS_PER_PAGE)}
              onPageChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}
        </div>
      </div>

      {/* Reactions popup - works on mobile + desktop */}
      {reactionsPopup && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
          onClick={() => setReactionsPopup(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-xl">{reactionsPopup.emoji}</span> Reakce ({reactionsPopup.names.length})
              </h3>
              <button
                onClick={() => setReactionsPopup(null)}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto">
              {reactionsPopup.names.map((name, i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {name.charAt(0)}
                  </div>
                  <span className="text-gray-900 text-sm font-medium">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Report post modal */}
      {reportingPost && (
        <div
          className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4"
          onClick={() => !reportSubmitting && setReportingPost(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span>🚩</span> Nahlásit příspěvek
              </h3>
              <button
                onClick={() => setReportingPost(null)}
                disabled={reportSubmitting}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Vyberte důvod hlášení. Příspěvek prozkoumá náš tým.
              </p>
              <div className="space-y-2">
                {[
                  { value: "spam", label: "Spam / reklama" },
                  { value: "inappropriate", label: "Nevhodný obsah / vulgarity" },
                  { value: "fraud", label: "Podvod / scam" },
                  { value: "fake", label: "Falešné informace" },
                  { value: "other", label: "Jiný důvod" },
                ].map((r) => (
                  <label key={r.value} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded-lg">
                    <input
                      type="radio"
                      name="report-reason"
                      value={r.value}
                      checked={reportReason === r.value}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="text-cyan-600"
                    />
                    <span className="text-sm text-gray-900">{r.label}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Doplňující informace (volitelné)
                </label>
                <textarea
                  value={reportComment}
                  onChange={(e) => setReportComment(e.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="Např. konkrétní problém, kontext…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 resize-none text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">{reportComment.length}/500</p>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex gap-2 justify-end">
              <button
                onClick={() => setReportingPost(null)}
                disabled={reportSubmitting}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-semibold text-sm disabled:opacity-50"
              >
                Zrušit
              </button>
              <button
                onClick={handleReportSubmit}
                disabled={reportSubmitting}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-semibold text-sm disabled:opacity-50"
              >
                {reportSubmitting ? "Odesílám…" : "Odeslat hlášení"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
