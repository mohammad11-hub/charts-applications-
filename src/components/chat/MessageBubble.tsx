import { motion } from "framer-motion";

interface MessageBubbleProps {
  content: string;
  isOwn: boolean;
  senderName: string;
  timestamp: string;
}

export const MessageBubble = ({ content, isOwn, senderName, timestamp }: MessageBubbleProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4`}
    >
      <div className={`max-w-[70%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`
            px-4 py-3 rounded-2xl backdrop-blur-sm relative
            ${isOwn 
              ? "bg-gradient-to-br from-primary/80 to-accent/80 text-primary-foreground shadow-[0_0_15px_rgba(0,217,255,0.4)]" 
              : "bg-card/60 border border-primary/30 text-card-foreground shadow-[0_0_10px_rgba(168,85,247,0.2)]"
            }
          `}
        >
          {!isOwn && (
            <p className="text-xs font-semibold text-accent mb-1">{senderName}</p>
          )}
          <p className="text-sm leading-relaxed">{content}</p>
          <div className={`absolute inset-0 rounded-2xl ${isOwn ? "bg-gradient-to-br from-primary/20 to-accent/20" : "bg-gradient-to-br from-purple-500/10 to-blue-500/10"} blur-xl -z-10`} />
        </div>
        <span className="text-xs text-muted-foreground mt-1 px-2">
          {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
};
