import React, { useState } from 'react';
import { MessageSquare, ThumbsUp, ShieldAlert, Send, TrendingUp, Clock, Lock, Sparkles, Quote, CornerDownRight } from 'lucide-react';

export default function AnonymousForum({ theme, activeRole }) {
  const isAdmin = activeRole === 'admin';
  const canReply = activeRole === 'admin' || activeRole === 'council';

  const [posts, setPosts] = useState([
    { id: 1, text: "Can we get an update on the library WiFi? It drops every evening.", realAuthor: "Alex S.", isAnonymous: true, upvotes: 42, status: "Under Review", time: "2 hours ago", reply: "We have contacted IT, expecting resolution by Friday." },
    { id: 2, text: "The new beanbags in the study hall are great, thanks council!", realAuthor: "Priya M.", isAnonymous: true, upvotes: 18, status: "Resolved", time: "1 day ago", reply: "" },
    { id: 3, text: "Need more vegetarian options in the late-night canteen menu.", realAuthor: "Rahul T.", isAnonymous: false, upvotes: 5, status: "Pending", time: "3 hours ago", reply: "" }
  ]);
  
  const [newPost, setNewPost] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [sortBy, setSortBy] = useState('popular'); 
  const [replyInputs, setReplyInputs] = useState({});

  const handlePostSubmit = (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    setPosts([{
      id: Date.now(), text: newPost, realAuthor: "Current User", isAnonymous: isAnonymous, upvotes: 0, status: "Pending", time: "Just now", reply: ""
    }, ...posts]);
    setNewPost('');
  };

  const handleUpvote = (id) => setPosts(posts.map(p => p.id === id ? { ...p, upvotes: p.upvotes + 1 } : p));

  const handleReplySubmit = (id) => {
    const replyText = replyInputs[id];
    if (!replyText?.trim()) return;
    setPosts(posts.map(p => p.id === id ? { ...p, reply: replyText, status: 'Resolved' } : p));
    setReplyInputs({ ...replyInputs, [id]: '' });
  };

  const sortedPosts = [...posts].sort((a, b) => sortBy === 'popular' ? b.upvotes - a.upvotes : b.id - a.id);
  const isDark = theme.bg.includes('0a0a0a');

  const getStatusStyle = (status) => {
    switch(status) {
      case 'Resolved': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'Under Review': return 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30';
      default: return 'text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-emerald-500" />
        <span className="text-sm font-bold text-emerald-500 tracking-wider uppercase">Community Forum</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Input Form */}
        <div className={`lg:col-span-1 ${theme.surface} border ${theme.border} rounded-2xl p-6 h-fit shadow-sm hover:shadow-md transition-all duration-300`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20`}>
              <ShieldAlert className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className={`text-base font-extrabold ${theme.textStrong}`}>Submit Feedback</h3>
          </div>

          <form onSubmit={handlePostSubmit} className="space-y-5">
            <textarea 
              value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder="What should the council address next?" rows="5"
              className={`w-full ${theme.inputBg} border ${theme.border} rounded-xl px-4 py-3 text-sm ${theme.textStrong} focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none resize-none transition-all leading-relaxed`} 
            />
            
            <div className={`flex items-center justify-between p-3 rounded-xl border ${theme.border} ${isDark ? 'bg-black/20' : 'bg-gray-50'}`}>
              <label className={`flex items-center gap-3 text-xs font-extrabold cursor-pointer ${theme.textStrong} uppercase tracking-wider`}>
                <input type="checkbox" checked={isAnonymous} onChange={(e) => setIsAnonymous(e.target.checked)} className="rounded border-gray-500 text-emerald-500 focus:ring-emerald-500 bg-transparent w-4 h-4" />
                Post Anonymously
              </label>
            </div>

            <button type="submit" className="w-full bg-[#0A8647] hover:bg-[#0c9d54] text-white font-bold py-3 rounded-xl transition-all shadow-sm shadow-emerald-900/20 flex items-center justify-center gap-2 hover:-translate-y-0.5">
              <Send className="w-4 h-4" /> Publish Post
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Community Board */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end pb-4 border-b border-gray-500/10 gap-4 sm:gap-0">
            <div>
              <h3 className={`text-2xl font-extrabold ${theme.textStrong} tracking-tight`}>Community Board</h3>
              <p className={`text-sm ${theme.textMuted} mt-1.5`}>Raise issues, ask questions, and vote on what matters.</p>
            </div>
            <div className={`flex bg-gray-500/5 border ${theme.border} p-1 rounded-xl w-fit shadow-sm`}>
              <button onClick={() => setSortBy('popular')} className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${sortBy === 'popular' ? 'bg-[#0A8647] text-white shadow-sm' : `${theme.textMuted}${theme.hover}`}`}>
                <TrendingUp className="w-3.5 h-3.5" /> Top Voted
              </button>
              <button onClick={() => setSortBy('recent')} className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${sortBy === 'recent' ? 'bg-[#0A8647] text-white shadow-sm' : `${theme.textMuted}${theme.hover}`}`}>
                <Clock className="w-3.5 h-3.5" /> Recent
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            {sortedPosts.map(post => (
              <div key={post.id} className={`${theme.surface} border ${theme.border} rounded-2xl p-6 flex gap-4 md:gap-5 shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden group`}>
                
                <Quote className={`absolute right-4 top-4 w-24 h-24 ${isDark ? 'text-white/5' : 'text-black/5'} -rotate-12 transform group-hover:scale-110 transition-transform duration-500 pointer-events-none`} />

                <div className="flex flex-col items-center relative z-10">
                  <button onClick={() => handleUpvote(post.id)} className={`p-2.5 rounded-xl border ${theme.border} bg-gray-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all group/btn shadow-sm hover:-translate-y-0.5`}>
                    <ThumbsUp className={`w-4 h-4 ${theme.textMuted} group-hover/btn:text-emerald-500 transition-colors`} />
                  </button>
                  <span className={`text-sm font-extrabold ${theme.textStrong} mt-3`}>{post.upvotes}</span>
                </div>

                <div className="flex-1 relative z-10 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5 mb-4">
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md shadow-sm ${post.isAnonymous ? 'bg-gray-800 text-gray-300 border border-gray-700' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'}`}>
                      {post.isAnonymous ? "Anonymous" : post.realAuthor}
                    </span>
                    
                    {isAdmin && post.isAnonymous && (
                      <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 bg-red-500/10 px-2.5 py-1 rounded-md border border-red-500/20 uppercase tracking-widest shadow-sm" title="Visible only to Admins">
                        <Lock className="w-3 h-3" /> {post.realAuthor}
                      </span>
                    )}
                    
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border shadow-sm ${getStatusStyle(post.status)}`}>
                      {post.status}
                    </span>
                    
                    <span className={`text-[11px] font-medium ${theme.textMuted} ml-auto`}>{post.time}</span>
                  </div>
                  
                  <p className={`text-[15px] ${theme.textStrong} leading-relaxed font-medium mb-5`}>{post.text}</p>
                  
                  {post.reply && (
                    <div className={`mt-2 p-4 rounded-xl border-l-4 border-emerald-500 bg-emerald-500/5 shadow-sm flex gap-3`}>
                      <CornerDownRight className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1.5">
                          <ShieldAlert className="w-3.5 h-3.5" /> Official Council Response
                        </div>
                        <p className={`text-[13px] ${theme.textStrong} font-medium leading-relaxed`}>{post.reply}</p>
                      </div>
                    </div>
                  )}

                  {canReply && !post.reply && (
                    <div className={`mt-5 pt-5 border-t ${theme.border} flex gap-3`}>
                      <input 
                        type="text" value={replyInputs[post.id] || ''} onChange={(e) => setReplyInputs({ ...replyInputs, [post.id]: e.target.value })}
                        placeholder="Type an official response..." 
                        className={`flex-1 ${theme.inputBg} border ${theme.border} rounded-xl px-4 py-2.5 text-xs ${theme.textStrong} focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 outline-none transition-all`} 
                      />
                      <button onClick={() => handleReplySubmit(post.id)} className="bg-[#0A8647] hover:bg-[#0c9d54] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm hover:-translate-y-0.5">
                        Reply
                      </button>
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}