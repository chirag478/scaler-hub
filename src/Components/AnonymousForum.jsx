import React, { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, Send, ShieldAlert, CheckCircle2, Clock, Trash2, Sparkles, Filter, UserCheck } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function AnonymousForum({ theme, activeRole, userProfile }) {
  const isAdmin = activeRole === 'admin';
  const isCouncil = activeRole === 'council';
  const canModerate = isAdmin || isCouncil;
  const isDark = theme.bg.includes('0a0a0a');

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostText, setNewPostText] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('General');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [replyText, setReplyText] = useState({});
  const [activeReplyId, setActiveReplyId] = useState(null);

  const categories = ['General', 'Academics', 'Infrastructure', 'Hostel & Mess', 'Events'];

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('forum_posts')
      .select('*')
      .order('upvotes', { ascending: false });

    if (!error && data) {
      setPosts(data);
    }
    setLoading(false);
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    // Get current session user email directly to ensure author tracking never fails
    const { data: { user } } = await supabase.auth.getUser();
    const posterEmail = userProfile?.email || user?.email || 'unknown@scaler.com';

    const newPost = {
      text: newPostText,
      author: 'Anonymous',
      author_email: posterEmail, // Captured securely for Admin view
      category: newPostCategory,
      upvotes: 1,
      status: 'Under Review',
      reply: null
    };

    const { data, error } = await supabase
      .from('forum_posts')
      .insert([newPost])
      .select();

    if (!error && data) {
      setPosts([data[0], ...posts]);
      setNewPostText('');
    } else if (error) {
      alert("Error posting: " + error.message);
    }
  };

  const handleUpvote = async (id, currentUpvotes) => {
    const updatedUpvotes = (currentUpvotes || 0) + 1;
    const { error } = await supabase
      .from('forum_posts')
      .update({ upvotes: updatedUpvotes })
      .eq('id', id);

    if (!error) {
      setPosts(posts.map(p => p.id === id ? { ...p, upvotes: updatedUpvotes } : p));
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    const { error } = await supabase
      .from('forum_posts')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      setPosts(posts.map(p => p.id === id ? { ...p, status: newStatus } : p));
    }
  };

  const handleReplySubmit = async (id) => {
    const replyContent = replyText[id];
    if (!replyContent || !replyContent.trim()) return;

    const { error } = await supabase
      .from('forum_posts')
      .update({ reply: replyContent, status: 'Resolved' })
      .eq('id', id);

    if (!error) {
      setPosts(posts.map(p => p.id === id ? { ...p, reply: replyContent, status: 'Resolved' } : p));
      setActiveReplyId(null);
    }
  };

  const handleDeletePost = async (id) => {
    const { error } = await supabase
      .from('forum_posts')
      .delete()
      .eq('id', id);

    if (!error) {
      setPosts(posts.filter(p => p.id !== id));
    }
  };

  const filteredPosts = selectedCategory === 'All' 
    ? posts 
    : posts.filter(p => p.category === selectedCategory);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-bold text-emerald-500 tracking-wider uppercase">Student Voice & Townhall</span>
        </div>
        {loading && <span className={`text-xs font-semibold animate-pulse ${theme.textMuted}`}>Syncing with cloud...</span>}
      </div>

      {/* Ask Question Form */}
      <div className={`${theme.surface} border ${theme.border} rounded-2xl p-6 shadow-sm`}>
        <h3 className={`text-base font-extrabold ${theme.textStrong} mb-4 flex items-center gap-2`}>
          <MessageSquare className="w-4 h-4 text-emerald-500" /> Voice a Concern Anonymously
        </h3>
        <form onSubmit={handleCreatePost} className="space-y-4">
          <textarea
            value={newPostText}
            onChange={(e) => setNewPostText(e.target.value)}
            placeholder="Share feedback, ask a question, or report an issue... Your identity is hidden from students."
            rows="3"
            required
            className={`w-full ${theme.inputBg} border ${theme.border} rounded-xl px-4 py-3 text-sm ${theme.textStrong} focus:border-emerald-500 outline-none resize-none transition-all`}
          />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${theme.textMuted} uppercase tracking-wider`}>Category:</span>
              <select
                value={newPostCategory}
                onChange={(e) => setNewPostCategory(e.target.value)}
                className={`${theme.inputBg} border ${theme.border} rounded-lg px-3 py-2 text-xs font-bold ${theme.textStrong} outline-none`}
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <button type="submit" className="bg-[#0A8647] hover:bg-[#0c9d54] text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-sm hover:-translate-y-0.5">
              <Send className="w-3.5 h-3.5" /> Post Anonymously
            </button>
          </div>
        </form>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className={`w-4 h-4 ${theme.textMuted} mr-1 shrink-0`} />
        {['All', ...categories].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              selectedCategory === cat
                ? 'bg-emerald-500 text-white shadow-sm'
                : `${theme.surface} border${theme.border} ${theme.textMuted} hover:${theme.textStrong}`
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.map(post => (
          <div key={post.id} className={`${theme.surface} border ${theme.border} rounded-2xl p-6 transition-all hover:shadow-md`}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {post.category}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                    post.status === 'Resolved' 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {post.status === 'Resolved' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {post.status}
                  </span>
                  
                  {/* ADMIN-ONLY REAL AUTHOR REVEAL */}
                  {isAdmin && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                      <UserCheck className="w-3 h-3" /> Author: {post.author_email || 'Unknown'}
                    </span>
                  )}

                  <span className={`text-xs ${theme.textMuted}`}>• Posted by {post.author}</span>
                </div>
                <p className={`text-sm font-medium ${theme.textStrong} leading-relaxed pt-1`}>{post.text}</p>
              </div>

              {/* Upvote Button */}
              <button
                onClick={() => handleUpvote(post.id, post.upvotes)}
                className={`flex flex-col items-center justify-center px-3.5 py-2 rounded-xl border ${theme.border} ${theme.hover} transition-all group shrink-0`}
              >
                <ThumbsUp className={`w-4 h-4 ${theme.textMuted} group-hover:text-emerald-500 transition-colors`} />
                <span className={`text-xs font-extrabold ${theme.textStrong} mt-1`}>{post.upvotes || 0}</span>
              </button>
            </div>

            {/* Official Reply Display */}
            {post.reply && (
              <div className={`mt-4 p-4 rounded-xl border-l-4 border-emerald-500 ${isDark ? 'bg-emerald-500/5' : 'bg-emerald-50/70'}`}>
                <div className="text-[11px] font-extrabold text-emerald-500 uppercase tracking-wider mb-1">
                  Official Council Response
                </div>
                <p className={`text-xs ${theme.textStrong} leading-relaxed`}>{post.reply}</p>
              </div>
            )}

            {/* Admin / Council Moderation Controls */}
            {canModerate && (
              <div className="mt-4 pt-4 border-t border-gray-500/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <select
                    value={post.status}
                    onChange={(e) => handleStatusChange(post.id, e.target.value)}
                    className={`${theme.inputBg} border ${theme.border} rounded-lg px-2.5 py-1.5 text-xs font-bold ${theme.textStrong} outline-none`}
                  >
                    <option value="Under Review">Under Review</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                  <button
                    onClick={() => setActiveReplyId(activeReplyId === post.id ? null : post.id)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${theme.border} ${theme.hover} ${theme.textStrong}`}
                  >
                    {post.reply ? 'Edit Reply' : 'Write Official Reply'}
                  </button>
                </div>

                <button
                  onClick={() => handleDeletePost(post.id)}
                  className="text-xs font-bold text-red-500 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>

                {activeReplyId === post.id && (
                  <div className="w-full mt-2 flex gap-2">
                    <input
                      type="text"
                      placeholder="Type official council response..."
                      value={replyText[post.id] || ''}
                      onChange={(e) => setReplyText({ ...replyText, [post.id]: e.target.value })}
                      className={`flex-1 ${theme.inputBg} border ${theme.border} rounded-xl px-3.5 py-2 text-xs ${theme.textStrong} outline-none focus:border-emerald-500`}
                    />
                    <button
                      onClick={() => handleReplySubmit(post.id)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
                    >
                      Publish Reply
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}