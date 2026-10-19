import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, ThumbsUp, Send, CheckCircle2, 
  Clock, Trash2, Sparkles, Filter, Eye 
} from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function AnonymousForum({ theme, activeRole, userProfile }) {
  const safeTheme = theme || {
    bg: 'bg-[#0a0a0a]',
    surface: 'bg-[#121212]',
    border: 'border-[#262626]',
    textStrong: 'text-white',
    textMuted: 'text-gray-400',
    inputBg: 'bg-[#1a1a1a]',
    hover: 'hover:bg-[#1f1f1f]',
  };

  const isDark = safeTheme.bg.includes('0a0a0a');

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostText, setNewPostText] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('General');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [replyText, setReplyText] = useState({});
  const [activeReplyId, setActiveReplyId] = useState(null);

  // Direct internal identity state so it works even if parent props aren't passed
  const [currentUserInfo, setCurrentUserInfo] = useState({
    name: 'Cohort Member',
    email: '',
    role: activeRole || 'student',
  });

  const categories = ['General', 'Academics', 'Infrastructure', 'Hostel & Mess', 'Events'];

  // Verify the logged-in user directly from Supabase Auth + Profiles
  useEffect(() => {
    const verifyIdentity = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email, role, sub_role')
          .eq('id', user.id)
          .single();

        setCurrentUserInfo({
          name: profile?.full_name || userProfile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student',
          email: profile?.email || user.email || '',
          role: profile?.role || activeRole || 'student',
        });
      }
    };

    verifyIdentity();
  }, [activeRole, userProfile]);

  // Determine permissions: ONLY System Admin can see real identity
  const isSystemAdmin = 
    activeRole === 'admin' || 
    userProfile?.role === 'admin' || 
    currentUserInfo.role === 'admin' ||
    currentUserInfo.email === 'chirag.26020@ssb.scaler.com';

  const isCouncil = 
    activeRole === 'council' || 
    userProfile?.role === 'council' || 
    currentUserInfo.role === 'council';

  const canModerate = isSystemAdmin || isCouncil;

  // Fetch posts and listen for live Realtime updates
  useEffect(() => {
    fetchPosts();

    const subscription = supabase
      .channel('public:forum_posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_posts' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setPosts((prev) => {
            if (prev.some(p => p.id === payload.new.id)) return prev;
            return [payload.new, ...prev];
          });
        } else if (payload.eventType === 'DELETE') {
          setPosts((prev) => prev.filter((post) => post.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
          setPosts((prev) => prev.map((post) => post.id === payload.new.id ? payload.new : post));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
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

    // Grab fresh auth user at post time so identity is always recorded accurately
    const { data: { user } } = await supabase.auth.getUser();
    const realEmail = currentUserInfo.email || user?.email || 'unknown@ssb.scaler.com';
    const realName = currentUserInfo.name || user?.user_metadata?.full_name || realEmail.split('@')[0];

    const newPost = {
      text: newPostText.trim(),
      author: 'Anonymous', // Shown to students & council
      author_name: realName, // Hidden in DB for System Admin only
      author_email: realEmail, // Hidden in DB for System Admin only
      category: newPostCategory,
      upvotes: 1,
      status: 'Under Review',
      reply: null
    };

    const { data, error } = await supabase
      .from('forum_posts')
      .insert([newPost])
      .select();

    if (error) {
      alert('Failed to submit post: ' + error.message);
      return;
    }

    if (data && data.length > 0) {
      setPosts((prev) => [data[0], ...prev.filter(p => p.id !== data[0].id)]);
      setNewPostText('');
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
      .update({ reply: replyContent.trim(), status: 'Resolved' })
      .eq('id', id);

    if (!error) {
      setPosts(posts.map(p => p.id === id ? { ...p, reply: replyContent.trim(), status: 'Resolved' } : p));
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
          <span className="text-sm font-bold text-emerald-500 tracking-wider uppercase">
            Student Voice & Townhall
          </span>
        </div>
        {loading && <span className={`text-xs font-semibold animate-pulse ${safeTheme.textMuted}`}>Syncing with cloud...</span>}
      </div>

      {/* Ask Question Form */}
      <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-6 shadow-sm`}>
        <h3 className={`text-base font-extrabold ${safeTheme.textStrong} mb-4 flex items-center gap-2`}>
          <MessageSquare className="w-4 h-4 text-emerald-500" /> Voice a Concern Anonymously
        </h3>
        <form onSubmit={handleCreatePost} className="space-y-4">
          <textarea
            value={newPostText}
            onChange={(e) => setNewPostText(e.target.value)}
            placeholder="Share feedback, ask a question, or report an issue... Your identity is hidden from the cohort."
            rows="3"
            required
            className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-4 py-3 text-sm ${safeTheme.textStrong} focus:border-emerald-500 outline-none resize-none transition-all`}
          />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${safeTheme.textMuted} uppercase tracking-wider`}>Category:</span>
              <select
                value={newPostCategory}
                onChange={(e) => setNewPostCategory(e.target.value)}
                className={`${safeTheme.inputBg} border ${safeTheme.border} rounded-lg px-3 py-2 text-xs font-bold ${safeTheme.textStrong} outline-none`}
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
        <Filter className={`w-4 h-4 ${safeTheme.textMuted} mr-1 shrink-0`} />
        {['All', ...categories].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              selectedCategory === cat
                ? 'bg-emerald-500 text-white shadow-sm'
                : `${safeTheme.surface} border${safeTheme.border} ${safeTheme.textMuted} hover:${safeTheme.textStrong}`
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.map(post => (
          <div key={post.id} className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-6 transition-all hover:shadow-md`}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2.5 flex-1">
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
                  <span className={`text-xs ${safeTheme.textMuted}`}>• Posted by {post.author || 'Anonymous'}</span>

                  {/* SYSTEM ADMIN AUDIT BADGE (Hidden from Students, Club Leads, and Council) */}
                  {isSystemAdmin && (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-purple-400" />
                      <span>
                        Admin Reveal: {post.author_name ? `${post.author_name} (${post.author_email})` : (post.author_email || 'Unrecorded Author')}
                      </span>
                    </span>
                  )}
                </div>

                <p className={`text-sm font-medium ${safeTheme.textStrong} leading-relaxed pt-1`}>{post.text}</p>
              </div>

              {/* Upvote Button */}
              <button
                onClick={() => handleUpvote(post.id, post.upvotes)}
                className={`flex flex-col items-center justify-center px-3.5 py-2 rounded-xl border ${safeTheme.border} ${safeTheme.hover} transition-all group shrink-0`}
              >
                <ThumbsUp className={`w-4 h-4 ${safeTheme.textMuted} group-hover:text-emerald-500 transition-colors`} />
                <span className={`text-xs font-extrabold ${safeTheme.textStrong} mt-1`}>{post.upvotes || 0}</span>
              </button>
            </div>

            {/* Official Reply Display */}
            {post.reply && (
              <div className={`mt-4 p-4 rounded-xl border-l-4 border-emerald-500 ${isDark ? 'bg-emerald-500/5' : 'bg-emerald-50/70'}`}>
                <div className="text-[11px] font-extrabold text-emerald-500 uppercase tracking-wider mb-1">
                  Official Council Response
                </div>
                <p className={`text-xs ${safeTheme.textStrong} leading-relaxed`}>{post.reply}</p>
              </div>
            )}

            {/* Admin / Council Moderation Controls */}
            {canModerate && (
              <div className="mt-4 pt-4 border-t border-gray-500/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <select
                    value={post.status}
                    onChange={(e) => handleStatusChange(post.id, e.target.value)}
                    className={`${safeTheme.inputBg} border ${safeTheme.border} rounded-lg px-2.5 py-1.5 text-xs font-bold ${safeTheme.textStrong} outline-none`}
                  >
                    <option value="Under Review">Under Review</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                  <button
                    onClick={() => setActiveReplyId(activeReplyId === post.id ? null : post.id)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${safeTheme.border} ${safeTheme.hover} ${safeTheme.textStrong}`}
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
                      className={`flex-1 ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3.5 py-2 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500`}
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