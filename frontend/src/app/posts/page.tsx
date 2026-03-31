
"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth, useOrganization } from "@clerk/nextjs";

interface Post {
  id: string;
  userId: string;
  content: string;
  status: string;
  scheduledAt?: string;
  publishedAt?: string;
  seriesId?: string;
  theme?: string;
  createdAt: string;
  updatedAt: string;
}

export default function PostsPage() {
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const orgId = organization?.id;
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchPosts = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/posts/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [orgId, getToken]);

  useEffect(() => {
    if (orgId) fetchPosts();
  }, [orgId, fetchPosts]);



  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/posts/${orgId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          status: "draft",
        }),
      });
      if (res.ok) {
        setContent("");
        fetchPosts();
      }
    } finally {
      setLoading(false);
    }
  }

  if (!organization) {
    return <div style={{ padding: 32, color: "#94a3b8" }}>Select or create an organization to view posts.</div>;
  }

  return (
    <div style={{ padding: 32, maxWidth: 600, margin: '0 auto', background: '#181b20', borderRadius: 24, boxShadow: '0 8px 32px rgba(24,27,32,0.18)' }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24, color: '#fff' }}>Your Posts</h1>
      <form
        onSubmit={createPost}
        style={{
          marginBottom: 32,
          background: '#23262b',
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <label htmlFor="post-content" style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>Create a new post</label>
        <textarea
          id="post-content"
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            borderRadius: 8,
            border: '1px solid #2de1fc',
            padding: 12,
            fontSize: 16,
            resize: 'vertical',
            background: '#fafbfc',
            color: '#181b20',
          }}
          placeholder="Write a new post..."
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          style={{
            alignSelf: 'flex-end',
            background: '#2de1fc',
            color: '#181b20',
            border: 'none',
            borderRadius: 24,
            padding: '10px 32px',
            fontWeight: 700,
            fontSize: 16,
            cursor: loading || !content.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !content.trim() ? 0.7 : 1,
            marginTop: 8,
            transition: 'background 0.2s, opacity 0.2s',
          }}
        >
          {loading ? 'Creating...' : 'Create Post'}
        </button>
      </form>
      <h2 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16, color: '#fff' }}>Your Posts</h2>
      {loading && <div>Loading...</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {posts.length === 0 && !loading && (
          <div style={{ color: '#bfc4ca', fontStyle: 'italic' }}>No posts yet. Start by creating one above!</div>
        )}
        {posts.map(post => (
          <div
            key={post.id}
            style={{
              background: '#23262b',
              borderRadius: 10,
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 500, color: '#fff' }}>{post.content}</div>
            <div style={{ fontSize: 14, color: '#2de1fc', fontWeight: 600 }}>{post.status.toUpperCase()}</div>
            <div style={{ fontSize: 12, color: '#bfc4ca' }}>Created: {new Date(post.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
