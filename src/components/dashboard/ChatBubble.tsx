import React from 'react';
import { format } from "date-fns";
import { Reply, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatBubbleProps {
  message: any;
  isOwn: boolean;
  onReply: () => void;
}

export const ChatBubble = ({ message, isOwn, onReply }: ChatBubbleProps) => {
  return (
    <div className={cn("flex flex-col group", isOwn ? "items-end" : "items-start")}>
      <div className={cn(
        "max-w-[85%] rounded-2xl px-4 py-2 relative shadow-sm",
        isOwn 
          ? "bg-primary text-primary-foreground rounded-tr-none" 
          : "bg-card border border-border text-foreground rounded-tl-none"
      )}>
        {/* Reply Context (WhatsApp Style) */}
        {message.replied_message && (
          <div className="mb-2 p-2 bg-black/5 dark:bg-white/5 rounded-lg border-l-4 border-primary/40 text-xs">
            <p className="font-bold opacity-80">{message.replied_message.profiles?.display_name}</p>
            <p className="truncate italic opacity-70">{message.replied_message.content}</p>
          </div>
        )}

        {!isOwn && (
          <p className="text-[10px] font-bold text-primary mb-1 uppercase tracking-wider">
            {message.profiles?.display_name}
          </p>
        )}
        
        <p className="text-sm leading-relaxed break-words">{message.content}</p>
        
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[10px] opacity-60">
            {format(new Date(message.created_at), 'h:mm a')}
          </span>
        </div>

        {/* Quick Actions on Hover */}
        <div className={cn(
          "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1",
          isOwn ? "-left-16" : "-right-16"
        )}>
          <button onClick={onReply} title="Reply" className="p-1.5 hover:bg-muted rounded-full text-muted-foreground transition-colors">
            <Reply className="h-4 w-4" />
          </button>
          <button title="React" className="p-1.5 hover:bg-muted rounded-full text-muted-foreground transition-colors">
            <Smile className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};