import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import "./FeedPage.css";

function FeedPage({ currentUser }) {
  const [posts, setPosts] = useState([]);
  const [globalPosts, setGlobalPosts] = useState([]);
  const [feedType, setFeedType] = useState("following");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [content, setContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkPreview, setLinkPreview] = useState(null);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [commentsCache, setCommentsCache] = useState({});
  const location = useLocation();
  const navigate = useNavigate();

  const canPost = useMemo(() => {
    return content.trim() || linkUrl.trim() || mediaFiles.length > 0;
  }, [content, linkUrl, mediaFiles]);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/social/feed/?type=following`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setPosts(data.posts || []);
        setFeedType(data.feed_type || "following");
      }
      const globalRes = await fetch(`${API_BASE}/social/feed/?type=global`, {
        credentials: "include",
      });
      const globalData = await globalRes.json();
      if (globalRes.ok) {
        setGlobalPosts(globalData.posts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  useEffect(() => {
    if (!posts.length && !globalPosts.length) return;
    const params = new URLSearchParams(location.search);
    const postId = params.get("post");
    if (!postId) return;
    const el = document.getElementById(`post-${postId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("feed-post-highlight");
      setTimeout(() => el.classList.remove("feed-post-highlight"), 2000);
      navigate("/feed", { replace: true });
    }
  }, [location.search, posts, globalPosts, navigate]);

  useEffect(() => {
    if (!linkUrl.trim()) {
      setLinkPreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/social/link-preview/?url=${encodeURIComponent(linkUrl)}`,
          { credentials: "include" }
        );
        const data = await res.json();
        if (res.ok) {
          setLinkPreview(data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [linkUrl]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!canPost || creating) return;
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append("content", content);
      formData.append("link_url", linkUrl);
      formData.append("link_title", linkPreview?.title || "");
      formData.append("link_description", linkPreview?.description || "");
      formData.append("link_image_url", linkPreview?.image_url || "");
      mediaFiles.forEach((file) => formData.append("media", file));

      const res = await fetch(`${API_BASE}/social/posts/`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setPosts((prev) => [data.post, ...prev]);
        setContent("");
        setLinkUrl("");
        setLinkPreview(null);
        setMediaFiles([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const updatePostById = (postId, updater) => {
    setPosts((prev) => prev.map((p) => (p.id === postId ? updater(p) : p)));
    setGlobalPosts((prev) => prev.map((p) => (p.id === postId ? updater(p) : p)));
  };

  const toggleLike = async (postId) => {
    const res = await fetch(`${API_BASE}/social/posts/${postId}/like/`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) return;
    updatePostById(postId, (p) => ({
      ...p,
      liked: data.liked,
      likes_count: data.likes_count,
    }));
  };

  const toggleRepost = async (postId) => {
    const res = await fetch(`${API_BASE}/social/posts/${postId}/repost/`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok) return;
    updatePostById(postId, (p) => ({
      ...p,
      reposted: data.reposted,
      reposts_count: data.reposts_count,
    }));
  };

  const loadComments = async (postId) => {
    const res = await fetch(`${API_BASE}/social/posts/${postId}/comments/`, {
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) return;
    setCommentsCache((prev) => ({ ...prev, [postId]: data.comments || [] }));
  };

  const toggleComments = (postId) => {
    setExpandedComments((prev) => {
      const next = { ...prev, [postId]: !prev[postId] };
      if (next[postId] && !commentsCache[postId]) {
        loadComments(postId);
      }
      return next;
    });
  };

  const addComment = async (postId) => {
    const draft = (commentDrafts[postId] || "").trim();
    if (!draft) return;
    const res = await fetch(`${API_BASE}/social/posts/${postId}/comments/`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft }),
    });
    const data = await res.json();
    if (!res.ok) return;
    setCommentsCache((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), data.comment],
    }));
    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    updatePostById(postId, (p) => ({
      ...p,
      comments_count: (p.comments_count || 0) + 1,
    }));
  };

  return (
    <div className="feed-page">
      <div className="container feed-layout">
        <aside className="feed-sidebar">
          <div className="feed-card">
              <div className="feed-user">
                <div className="feed-avatar">
                {currentUser?.profile_photo ? (
                  <img src={currentUser.profile_photo} alt="Profile" />
                ) : (
                  currentUser?.first_name?.[0]?.toUpperCase() ||
                  currentUser?.email?.[0]?.toUpperCase() ||
                  "U"
                )}
                </div>
                <div>
                <div className="feed-user-name">
                  {currentUser?.first_name || currentUser?.email || "Guest"}
                </div>
                <div className="feed-user-sub">
                  {currentUser?.email || "Sign in to post"}
                </div>
              </div>
            </div>
            <div className="feed-sidebar-meta">
              <span>Feed mode</span>
              <strong>{feedType === "following" ? "Following" : "Global"}</strong>
            </div>
          </div>
        </aside>

        <main className="feed-main">
          <div className="feed-tabs">
            <button
              type="button"
              className={`feed-tab ${feedType === "following" ? "active" : ""}`}
              onClick={() => setFeedType("following")}
            >
              Following
            </button>
            <button
              type="button"
              className={`feed-tab ${feedType === "global" ? "active" : ""}`}
              onClick={() => setFeedType("global")}
            >
              Global
            </button>
          </div>
          <form className="feed-card feed-compose" onSubmit={handleCreatePost}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share an update..."
              rows={3}
            />
            <div className="feed-compose-row">
              <input
                type="url"
                placeholder="Add a link (optional)"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <label className="feed-file">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => setMediaFiles(Array.from(e.target.files || []))}
                />
                Add media
              </label>
            </div>
            {linkPreview?.url && (
              <div className="feed-link-preview">
                {linkPreview.image_url && (
                  <img src={linkPreview.image_url} alt={linkPreview.title} />
                )}
                <div>
                  <strong>{linkPreview.title || linkPreview.url}</strong>
                  {linkPreview.description && <p>{linkPreview.description}</p>}
                  <span>{linkPreview.url}</span>
                </div>
              </div>
            )}
            {mediaFiles.length > 0 && (
              <div className="feed-media-selected">
                {mediaFiles.map((file) => (
                  <span key={file.name}>{file.name}</span>
                ))}
              </div>
            )}
            <div className="feed-compose-actions">
              <button className="btn btn--primary" type="submit" disabled={!canPost || creating}>
                {creating ? "Posting..." : "Post"}
              </button>
            </div>
          </form>

          {loading ? (
            <div className="feed-card feed-empty">Loading feed...</div>
          ) : posts.length === 0 ? (
            <div className="feed-card feed-empty">No posts yet.</div>
          ) : (
            (feedType === "global" ? globalPosts : posts).map((post) => (
              <article className="feed-card feed-post" id={`post-${post.id}`} key={post.id}>
                <div className="feed-post-header">
                  <Link className="feed-author" to={`/profile/${post.author.id}`}>
                    <div className="feed-avatar small">
                      {post.author.avatar ? (
                        <img src={post.author.avatar} alt={post.author.name} />
                      ) : (
                        post.author.name?.[0]?.toUpperCase() || "U"
                      )}
                    </div>
                    <div>
                      <div className="feed-post-author">{post.author.name}</div>
                      <div className="feed-post-meta">
                        {new Date(post.created_at).toLocaleString()}
                      </div>
                    </div>
                  </Link>
                </div>

                {post.is_repost && post.repost_of && (
                  <div className="feed-repost">
                    <div className="feed-repost-label">Reposted</div>
                    <div className="feed-repost-card">
                      <strong>{post.repost_of.author.name}</strong>
                      <p>{post.repost_of.content}</p>
                    </div>
                  </div>
                )}

                {post.content && <p className="feed-post-text">{post.content}</p>}

                {post.media?.length > 0 && (
                  <div className="feed-media-grid">
                    {post.media.map((m) =>
                      m.type === "image" ? (
                        <img key={m.id} src={m.url} alt="post media" />
                      ) : (
                        <video key={m.id} src={m.url} controls />
                      )
                    )}
                  </div>
                )}

                {post.link && (
                  <a className="feed-link-preview" href={post.link.url} target="_blank" rel="noreferrer">
                    {post.link.image_url && <img src={post.link.image_url} alt={post.link.title} />}
                    <div>
                      <strong>{post.link.title || post.link.url}</strong>
                      {post.link.description && <p>{post.link.description}</p>}
                      <span>{post.link.url}</span>
                    </div>
                  </a>
                )}

                <div className="feed-post-stats">
                  <span>{post.likes_count || 0} Likes</span>
                  <span>{post.comments_count || 0} Comments</span>
                  <span>{post.reposts_count || 0} Shares</span>
                </div>

                <div className="feed-post-actions">
                  <button type="button" onClick={() => toggleLike(post.id)}>
                    {post.liked ? "Liked" : "Like"}
                  </button>
                  <button type="button" onClick={() => toggleComments(post.id)}>
                    Comment
                  </button>
                  <button type="button" onClick={() => toggleRepost(post.id)}>
                    {post.reposted ? "Reposted" : "Repost"}
                  </button>
                </div>

                {expandedComments[post.id] && (
                  <div className="feed-comments">
                    <div className="feed-comments-list">
                      {(commentsCache[post.id] || []).map((c) => (
                        <div className="feed-comment" key={c.id}>
                          <div className="feed-comment-avatar">
                            {c.author.avatar ? (
                              <img src={c.author.avatar} alt={c.author.name} />
                            ) : (
                              c.author.name?.[0]?.toUpperCase() || "U"
                            )}
                          </div>
                          <div className="feed-comment-body">
                            <strong>{c.author.name}</strong>
                            <span>{c.content}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="feed-comment-form">
                      <input
                        type="text"
                        placeholder="Write a comment..."
                        value={commentDrafts[post.id] || ""}
                        onChange={(e) =>
                          setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                      />
                      <button type="button" onClick={() => addComment(post.id)}>
                        Send
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))
          )}

          {feedType === "following" && globalPosts.length > 0 && (
            <div className="feed-global">
              <div className="feed-global-header">
                <h3>Global Discovery</h3>
                <button type="button" onClick={() => setFeedType("global")}>
                  See all global posts
                </button>
              </div>
              <div className="feed-global-list">
                {globalPosts.slice(0, 3).map((post) => (
                  <article className="feed-card feed-post" id={`post-${post.id}`} key={`global-${post.id}`}>
                    <div className="feed-post-header">
                      <Link className="feed-author" to={`/profile/${post.author.id}`}>
                        <div className="feed-avatar small">
                          {post.author.avatar ? (
                            <img src={post.author.avatar} alt={post.author.name} />
                          ) : (
                            post.author.name?.[0]?.toUpperCase() || "U"
                          )}
                        </div>
                        <div>
                          <div className="feed-post-author">{post.author.name}</div>
                          <div className="feed-post-meta">
                            {new Date(post.created_at).toLocaleString()}
                          </div>
                        </div>
                      </Link>
                    </div>
                    {post.content && <p className="feed-post-text">{post.content}</p>}
                  </article>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default FeedPage;
