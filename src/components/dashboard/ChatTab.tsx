import { useState, useEffect, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Send, Paperclip, X, Smile } from "lucide-react";
import { toast } from "sonner";
import { ChatBubble } from "./ChatBubble";
import { RealtimeChannel } from '@supabase/supabase-js';

interface ChatMessage {
  id: string;
  user_id: string;
  content: string;
  reply_to?: string;
  is_read?: boolean;
  created_at: string;
  profiles: { display_name: string | null; avatar_url: string | null } | null;
  replied_message: { content: string; profiles: { display_name: string | null } | null } | null;
}

export const ChatTab = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<any>({});
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!user) return;

    // 1. Initial Fetch of messages with profile and reply info
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          *,
          profiles:user_id (display_name, avatar_url),
          replied_message:reply_to (content, profiles:user_id (display_name))
        `)
        .order('created_at', { ascending: true });
      
      if (error) toast.error(error.message);
      else setMessages((data as any) || []);
    };

    fetchMessages();

    // 2. Realtime Subscription & Presence Logic
    const channel = supabase.channel('group-chat', {
      config: { presence: { key: user.id } }
    });

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        // Fetch full message details when a new message is inserted
        supabase
          .from('chat_messages')
          .select('*, profiles:user_id(display_name, avatar_url), replied_message:reply_to(content, profiles:user_id(display_name))')
          .eq('id', (payload.new as any).id)
          .single()
          .then(({ data }) => {
            if (data) setMessages(prev => [...prev, data as any]);
          });
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineUsers(state);
        
        // Filter typing users excluding current user
        const typing = Object.values(state)
          .flat()
          .filter((p: any) => p.isTyping && p.user_id !== user.id)
          .map((p: any) => p.display_name);
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            display_name: (user.user_metadata as any)?.display_name || 'Anonymous',
            online_at: new Date().toISOString(),
            isTyping: false
          });
        }
      });

    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [user]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  const handleTyping = (text: string) => {
    if (!user) return;
    setInputText(text);
    channelRef.current?.track({
      user_id: user.id,
      display_name: (user.user_metadata as any)?.display_name || 'Anonymous',
      isTyping: text.length > 0
    });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user) return;

    const { error } = await supabase.from('chat_messages').insert({
      user_id: user.id,
      content: inputText,
      reply_to: replyTo?.id
    });

    if (error) toast.error("Failed to send message");
    else {
      setInputText("");
      setReplyTo(null);
      handleTyping("");
    }
  };

  return (
    <div className="flex flex-col h-[600px] border border-border rounded-2xl bg-card overflow-hidden shadow-elegant">
      {/* Header with Online Status */}
      <div className="p-4 border-b border-border bg-muted/50 flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg">Community Chat</h3>
          <p className="text-xs text-green-500 font-medium flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            {Object.keys(onlineUsers).length} members online
          </p>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/30">
        {messages.map((msg) => (
          <ChatBubble 
            key={msg.id} 
            message={msg} 
            isOwn={msg.user_id === user?.id}
            onReply={() => setReplyTo(msg)}
          />
        ))}
        {typingUsers.length > 0 && (
          <div className="text-xs text-muted-foreground animate-pulse italic ml-2">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}
      </div>

      {/* WhatsApp style Reply Preview */}
      {replyTo && (
        <div className="px-4 py-2 bg-muted/50 border-t border-border flex justify-between items-center animate-in slide-in-from-bottom-2">
          <div className="border-l-4 border-primary pl-2 overflow-hidden">
            <p className="text-xs font-bold text-primary">{replyTo.profiles?.display_name}</p>
            <p className="text-sm truncate text-muted-foreground">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-muted rounded-full transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Message Input Area */}
      <form onSubmit={sendMessage} className="p-4 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <button type="button" className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors">
            <Paperclip className="h-5 w-5" />
          </button>
          <input
            value={inputText}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-muted/50 border-none rounded-full px-5 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
          <button 
            type="submit" 
            disabled={!inputText.trim()}
            className="p-2.5 bg-primary text-primary-foreground rounded-full disabled:opacity-50 shadow-glow transition-all hover:scale-105 active:scale-95"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
};