import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, ThumbsUp, Send, CheckCircle2, Clock, 
  Trash2, Filter, Eye, BarChart2, User, EyeOff, Plus, X 
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

  // Composer State
  const [postMode, setPostMode] = useState('discussion'); // 'discussion' | 'poll'
  const [isAnonymous, setIsAnonymous] = useState(true); // Toggle between Anonymous vs Named
  const [newPostText, setNewPostText] = useState('');
  const [newPostCategory, setNewPostCategory] = useState('General');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Filtering & Moderation State
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [replyText, setReplyText] = useState({});
  const [activeReplyId, setActiveReplyId] = useState(null);

  const [currentUserInfo, setCurrentUserInfo] = useState({
    id: '',
    name: 'Cohort Member',
    email: '',
    role: activeRole || 'student',
  });

  const categories = ['General', 'Academics', 'Infrastructure', 'Events', 'Misc'];

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
          id: user.id,
          name: profile?.full_name || userProfile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Student',
          email: profile?.email || user.email || '',
          role: profile?.role || activeRole || 'student',
        });
      }
    };
    verifyIdentity();
  }, [activeRole, userProfile]);

  const isSystemAdmin = activeRole === 'admin' || currentUserInfo.role === 'admin';
  const isCouncil = activeRole === 'council' || currentUserInfo.role === 'council';
  const canModerate = isSystemAdmin || isCouncil;

  useEffect(() => {
    fetchPosts();

    const subscription = supabase
      .channel('public:forum_posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forum_posts' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setPosts((prev) => prev.some(p => p.id === payload.new.id) ? prev : [payload.new, ...prev]);
        } else if (payload.eventType === 'DELETE') {
          setPosts((prev) => prev.filter((post) => post.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
          setPosts((prev) => prev.map((post) => post.id === payload.new.id ? payload.new : post));
        }
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('forum_posts').select('*').order('created_at', { ascending: false });
    if (!error && data) setPosts(data);
    setLoading(false);
  };

  // --- POLL OPTIONS HANDLERS ---
  const handleAddPollOption = () => { if (pollOptions.length < 5) setPollOptions([...pollOptions, '']); };
  const handleRemovePollOption = (index) => { if (pollOptions.length > 2) setPollOptions(pollOptions.filter((_, i) => i !== index)); };
  const handlePollOptionChange = (index, val) => {
    const updated = [...pollOptions];
    updated[index] = val;
    setPollOptions(updated);
  };

  // --- SUBMIT POST OR POLL ---
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    let formattedPollOptions = [];
    if (postMode === 'poll') {
      const validOpts = pollOptions.map(o => o.trim()).filter(Boolean);
      if (validOpts.length < 2) {
        alert('Please provide at least 2 valid poll options.');
        return;
      }
      formattedPollOptions = validOpts.map((text, idx) => ({ id: idx, text, votes: 0 }));
    }

    const newPost = {
      text: newPostText.trim(),
      author: isAnonymous ? 'Anonymous' : currentUserInfo.name, 
      author_name: currentUserInfo.name, 
      author_email: currentUserInfo.email,
      category: newPostCategory,
      upvotes: 0,
      upvoters: [], // Tracks single upvote
      status: 'Under Review',
      reply: null,
      is_poll: postMode === 'poll',
      poll_options: formattedPollOptions,
      poll_voters: {},
    };

    const { data, error } = await supabase.from('forum_posts').insert([newPost]).select();

    if (error) {
      alert('Failed to publish: ' + error.message);
    } else if (data) {
      setPosts((prev) => [data[0], ...prev.filter(p => p.id !== data[0].id)]);
      setNewPostText('');
      setPollOptions(['', '']);
      setPostMode('discussion');
    }
  };

  // --- SINGLE UPVOTE TRACKING ---
  const handleUpvote = async (id, currentUpvotes, currentUpvoters) => {
    const voterKey = currentUserInfo.email || currentUserInfo.id || 'guest';
    const upvotersArray = currentUpvoters || [];
    const hasUpvoted = upvotersArray.includes(voterKey);

    let newUpvoters;
    let newUpvotesCount;

    if (hasUpvoted) {
      // Remove Upvote
      newUpvoters = upvotersArray.filter(v => v !== voterKey);
      newUpvotesCount = Math.max(0, (currentUpvotes || 0) - 1);
    } else {
      // Add Upvote
      newUpvoters = [...upvotersArray, voterKey];
      newUpvotesCount = (currentUpvotes || 0) + 1;
    }

    // Optimistic UI update
    setPosts(posts.map(p => p.id === id ? { ...p, upvotes: newUpvotesCount, upvoters: newUpvoters } : p));

    await supabase
      .from('forum_posts')
      .update({ upvotes: newUpvotesCount, upvoters: newUpvoters })
      .eq('id', id);
  };

  // --- VOTE ON A POLL ---
  const handleVotePoll = async (post, optionId) => {
    const voterKey = currentUserInfo.email || currentUserInfo.id || 'guest';
    const currentVoters = post.poll_voters || {};
    const previousVote = currentVoters[voterKey];

    if (previousVote === optionId) return; // Prevent clicking the same option repeatedly

    const updatedOptions = (post.poll_options || []).map((opt) => {
      let votes = Number(opt.votes || 0);
      if (opt.id === previousVote) votes = Math.max(0, votes - 1);
      if (opt.id === optionId) votes += 1;
      return { ...opt, votes };
    });

    const updatedVoters = { ...currentVoters, [voterKey]: optionId };

    setPosts(posts.map(p => p.id === post.id ? { ...p, poll_options: updatedOptions, poll_voters: updatedVoters } : p));

    await supabase
      .from('forum_posts')
      .update({ poll_options: updatedOptions, poll_voters: updatedVoters })
      .eq('id', post.id);
  };

  const handleStatusChange = async (id, newStatus) => {
    const { error } = await supabase.from('forum_posts').update({ status: newStatus }).eq('id', id);
    if (!error) setPosts(posts.map(p => p.id === id ? { ...p, status: newStatus } : p));
  };

  const handleReplySubmit = async (id) => {
    const replyContent = replyText[id];
    if (!replyContent || !replyContent.trim()) return;
    const { error } = await supabase.from('forum_posts').update({ reply: replyContent.trim(), status: 'Resolved' }).eq('id', id);
    if (!error) {
      setPosts(posts.map(p => p.id === id ? { ...p, reply: replyContent.trim(), status: 'Resolved' } : p));
      setActiveReplyId(null);
    }
  };

  const handleDeletePost = async (id) => {
    const { error } = await supabase.from('forum_posts').delete().eq('id', id);
    if (!error) setPosts(posts.filter(p => p.id !== id));
  };

  const filteredPosts = selectedCategory === 'All' ? posts : posts.filter(p => p.category === selectedCategory);

  return (
    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">

      {/* COMPOSER CARD */}
      <div className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-500/10 pb-4 mb-4">
          
          {/* Post Mode Switcher: Discussion vs Poll */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setPostMode('discussion')}
              className={`px-3 md:px-4 py-2 rounded-xl text-[11px] md:text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                postMode === 'discussion' ? 'bg-emerald-500 text-white shadow-sm' : `${safeTheme.inputBg} ${safeTheme.textMuted} border${safeTheme.border}`
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Discussion / Idea
            </button>
            <button
              type="button"
              onClick={() => setPostMode('poll')}
              className={`px-3 md:px-4 py-2 rounded-xl text-[11px] md:text-xs font-extrabold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                postMode === 'poll' ? 'bg-emerald-500 text-white shadow-sm' : `${safeTheme.inputBg} ${safeTheme.textMuted} border${safeTheme.border}`
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" /> Create Cohort Poll
            </button>
          </div>

          {/* Identity Toggle */}
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${safeTheme.textMuted} hidden sm:block`}>Post As:</span>
            <div className={`inline-flex p-1 rounded-xl ${safeTheme.inputBg} border ${safeTheme.border}`}>
              <button
                type="button"
                onClick={() => setIsAnonymous(true)}
                className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-extrabold flex items-center gap-1.5 transition-all ${isAnonymous ? 'bg-emerald-500 text-white' : safeTheme.textMuted}`}
              >
                <EyeOff className="w-3 h-3" /> Anonymous
              </button>
              <button
                type="button"
                onClick={() => setIsAnonymous(false)}
                className={`px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-extrabold flex items-center gap-1.5 transition-all ${!isAnonymous ? 'bg-emerald-500 text-white' : safeTheme.textMuted}`}
              >
                <User className="w-3 h-3" /> {currentUserInfo.name.split(' ')[0]}
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleCreatePost} className="space-y-4">
          <textarea
            value={newPostText}
            onChange={(e) => setNewPostText(e.target.value)}
            placeholder={
              postMode === 'poll'
                ? (isAnonymous ? 'Ask your poll question anonymously...' : `Ask your poll question publicly as ${currentUserInfo.name}...`)
                : (isAnonymous ? 'Share feedback, ask a question, or report an issue... Your name will be hidden as Anonymous.' : `Posting publicly as ${currentUserInfo.name}...`)
            }
            rows="3"
            required
            className={`w-full ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-4 py-3 text-xs md:text-sm ${safeTheme.textStrong} focus:border-emerald-500 outline-none resize-none transition-all`}
          />

          {postMode === 'poll' && (
            <div className={`p-3.5 md:p-4 rounded-xl ${safeTheme.inputBg} border ${safeTheme.border} space-y-3`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] md:text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart2 className="w-3 h-3" /> Poll Options (Max 5)
                </span>
                {pollOptions.length < 5 && (
                  <button type="button" onClick={handleAddPollOption} className="text-[10px] md:text-xs font-extrabold text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add Option
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                      className={`flex-1 ${safeTheme.surface} border ${safeTheme.border} rounded-xl px-3.5 py-2 text-xs md:text-sm ${safeTheme.textStrong} outline-none focus:border-emerald-500`}
                    />
                    {pollOptions.length > 2 && (
                      <button type="button" onClick={() => handleRemovePollOption(idx)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] md:text-xs font-bold ${safeTheme.textMuted} uppercase tracking-wider`}>Category:</span>
              <select
                value={newPostCategory}
                onChange={(e) => setNewPostCategory(e.target.value)}
                className={`${safeTheme.inputBg} border ${safeTheme.border} rounded-lg px-2 md:px-3 py-1.5 md:py-2 text-[11px] md:text-xs font-bold ${safeTheme.textStrong} outline-none`}
              >
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <button type="submit" className="w-full sm:w-auto bg-[#0A8647] hover:bg-[#0c9d54] text-white text-[11px] md:text-xs font-extrabold px-6 py-3 md:py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm">
              <Send className="w-3.5 h-3.5" />
              {postMode === 'poll' ? 'Launch Poll' : 'Publish Post'}
            </button>
          </div>
        </form>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Filter className={`w-4 h-4 ${safeTheme.textMuted} mr-1 shrink-0`} />
        {['All', ...categories].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 md:px-3.5 py-1.5 rounded-full text-[11px] md:text-xs font-bold transition-all shrink-0 ${
              selectedCategory === cat ? 'bg-emerald-500 text-white shadow-sm' : `${safeTheme.surface} border${safeTheme.border} ${safeTheme.textMuted} hover:${safeTheme.textStrong}`
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Posts & Polls Feed */}
      <div className="space-y-4">
        {filteredPosts.map(post => {
          const voterKey = currentUserInfo.email || currentUserInfo.id || 'guest';
          const hasUpvoted = (post.upvoters || []).includes(voterKey);
          const userSelectedOption = post.poll_voters ? post.poll_voters[voterKey] : undefined;
          const totalPollVotes = (post.poll_options || []).reduce((acc, o) => acc + Number(o.votes || 0), 0);

          return (
            <div key={post.id} className={`${safeTheme.surface} border ${safeTheme.border} rounded-2xl p-4 md:p-6 transition-all hover:shadow-md`}>
              <div className="flex items-start justify-between gap-3 md:gap-4">
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                    <span className="px-2 md:px-2.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      {post.category}
                    </span>

                    {post.is_poll && (
                      <span className="px-2 md:px-2.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                        <BarChart2 className="w-2.5 h-2.5 md:w-3 md:h-3" /> Cohort Poll
                      </span>
                    )}

                    <span className={`px-2 md:px-2.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-bold flex items-center gap-1 ${
                      post.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {post.status === 'Resolved' ? <CheckCircle2 className="w-2.5 h-2.5 md:w-3 md:h-3" /> : <Clock className="w-2.5 h-2.5 md:w-3 md:h-3" />}
                      {post.status}
                    </span>

                    <span className={`text-[10px] md:text-xs font-bold ${post.author === 'Anonymous' ? safeTheme.textMuted : 'text-emerald-400'}`}>
                      • Posted by {post.author || 'Anonymous'}
                    </span>

                    {isSystemAdmin && post.author === 'Anonymous' && (
                      <span className="px-2 py-0.5 rounded-lg text-[9px] md:text-[10px] font-extrabold bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                        <Eye className="w-2.5 h-2.5 md:w-3 md:h-3" />
                        Admin Reveal: {post.author_email || 'Unrecorded'}
                      </span>
                    )}
                  </div>

                  <p className={`text-xs md:text-sm font-bold ${safeTheme.textStrong} leading-relaxed pt-1`}>{post.text}</p>

                  {post.is_poll && Array.isArray(post.poll_options) && post.poll_options.length > 0 && (
                    <div className="pt-2 space-y-2 max-w-xl">
                      {post.poll_options.map((opt) => {
                        const votes = Number(opt.votes || 0);
                        const pct = totalPollVotes > 0 ? Math.round((votes / totalPollVotes) * 100) : 0;
                        const isChosen = userSelectedOption === opt.id;

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleVotePoll(post, opt.id)}
                            className={`w-full relative overflow-hidden rounded-xl border text-left p-2.5 md:p-3 transition-all ${
                              isChosen ? 'border-emerald-500 bg-emerald-500/10' : `${safeTheme.border}${safeTheme.inputBg} hover:border-gray-500`
                            }`}
                          >
                            <div style={{ width: `${pct}%` }} className={`absolute inset-y-0 left-0 transition-all duration-500 ${isChosen ? 'bg-emerald-500/25' : 'bg-gray-500/15'}`} />
                            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                              <span className={`text-[11px] md:text-xs font-bold ${safeTheme.textStrong} flex items-center gap-2`}>
                                {opt.text} {isChosen && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                              </span>
                              <span className={`text-[10px] md:text-[11px] ${isChosen ? 'text-emerald-400 font-extrabold' : safeTheme.textMuted}`}>
                                {pct}% ({votes} {votes === 1 ? 'vote' : 'votes'})
                              </span>
                            </div>
                          </button>
                        );
                      })}
                      <div className={`text-[9px] md:text-[10px] font-semibold ${safeTheme.textMuted} pt-1`}>
                        Total Votes: {totalPollVotes}
                      </div>
                    </div>
                  )}
                </div>

                {/* SINGLE UPVOTE BUTTON */}
                {!post.is_poll && (
                  <button
                    onClick={() => handleUpvote(post.id, post.upvotes, post.upvoters)}
                    className={`flex flex-col items-center justify-center px-3 md:px-3.5 py-1.5 md:py-2 rounded-xl border transition-all shrink-0 ${
                      hasUpvoted ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : `${safeTheme.border} ${safeTheme.hover}${safeTheme.textMuted}`
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 md:w-4 md:h-4 ${hasUpvoted ? 'text-emerald-400 fill-emerald-500/20' : 'group-hover:text-emerald-500'} transition-colors`} />
                    <span className={`text-[10px] md:text-xs font-extrabold mt-1 ${hasUpvoted ? 'text-emerald-400' : safeTheme.textStrong}`}>{post.upvotes || 0}</span>
                  </button>
                )}
              </div>

              {post.reply && (
                <div className={`mt-4 p-3 md:p-4 rounded-xl border-l-4 border-emerald-500 ${isDark ? 'bg-emerald-500/5' : 'bg-emerald-50/70'}`}>
                  <div className="text-[10px] md:text-[11px] font-extrabold text-emerald-500 uppercase tracking-wider mb-1">Official Council Response</div>
                  <p className={`text-[11px] md:text-xs ${safeTheme.textStrong} leading-relaxed`}>{post.reply}</p>
                </div>
              )}

              {canModerate && (
                <div className="mt-4 pt-4 border-t border-gray-500/10 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={post.status}
                      onChange={(e) => handleStatusChange(post.id, e.target.value)}
                      className={`${safeTheme.inputBg} border ${safeTheme.border} rounded-lg px-2 py-1.5 text-[10px] md:text-xs font-bold ${safeTheme.textStrong} outline-none`}
                    >
                      <option value="Under Review">Under Review</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                    <button onClick={() => setActiveReplyId(activeReplyId === post.id ? null : post.id)} className={`text-[10px] md:text-xs font-bold px-2.5 py-1.5 rounded-lg border ${safeTheme.border} ${safeTheme.hover} ${safeTheme.textStrong}`}>
                      {post.reply ? 'Edit Reply' : 'Write Reply'}
                    </button>
                  </div>
                  <button onClick={() => handleDeletePost(post.id)} className="text-[10px] md:text-xs font-bold text-red-500 hover:bg-red-500/10 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>

                  {activeReplyId === post.id && (
                    <div className="w-full mt-2 flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Type official response..."
                        value={replyText[post.id] || ''}
                        onChange={(e) => setReplyText({ ...replyText, [post.id]: e.target.value })}
                        className={`flex-1 ${safeTheme.inputBg} border ${safeTheme.border} rounded-xl px-3 py-2 text-xs ${safeTheme.textStrong} outline-none focus:border-emerald-500`}
                      />
                      <button onClick={() => handleReplySubmit(post.id)} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] md:text-xs font-bold px-4 py-2 rounded-xl transition-all">
                        Publish
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}