import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SpaceBackground } from "@/components/3d/SpaceBackground";
import { UserList } from "@/components/chat/UserList";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { toast } from "sonner";
import { LogOut, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const messageSchema = z.string().trim().min(1, "Message cannot be empty").max(5000, "Message must be less than 5000 characters");

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  sender?: {
    username: string;
  };
}

const Chat = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string>("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!selectedUserId || !user) return;

    const fetchOrCreateConversation = async () => {
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${selectedUserId}),and(participant1_id.eq.${selectedUserId},participant2_id.eq.${user.id})`)
        .single();

      if (existingConv) {
        setConversationId(existingConv.id);
        loadMessages(existingConv.id);
      } else {
        const { data: newConv, error } = await supabase
          .from("conversations")
          .insert({
            participant1_id: user.id,
            participant2_id: selectedUserId,
          })
          .select("id")
          .single();

        if (error) {
          console.error("Error creating conversation:", error);
          toast.error("Failed to start conversation");
          return;
        }

        setConversationId(newConv.id);
        setMessages([]);
      }
    };

    fetchOrCreateConversation();
  }, [selectedUserId, user]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        async (payload) => {
          const { data: senderData } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", payload.new.sender_id)
            .single();

          setMessages(prev => [...prev, {
            ...payload.new as Message,
            sender: senderData
          }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadMessages = async (convId: string) => {
    const { data: messagesData, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    // Fetch sender profiles for each message
    const messagesWithSender = await Promise.all(
      (messagesData || []).map(async (message) => {
        const { data: senderData } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", message.sender_id)
          .single();
        
        return {
          ...message,
          sender: senderData
        };
      })
    );

    setMessages(messagesWithSender);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversationId || !user) return;

    const trimmedMessage = newMessage.trim();
    
    // Validate message with zod schema
    const validation = messageSchema.safeParse(trimmedMessage);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: validation.data,
      });

    if (error) {
      toast.error("Failed to send message");
    } else {
      setNewMessage("");
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen p-4 relative">
      <SpaceBackground />
      
      <div className="max-w-7xl mx-auto h-[calc(100vh-2rem)] flex flex-col gap-4">
        <Card className="p-4 bg-card/60 backdrop-blur-xl border-primary/30 shadow-[0_0_20px_rgba(0,217,255,0.2)]">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              VizTalk Chart Application
            </h1>
            <Button 
              variant="outline" 
              onClick={handleSignOut}
              className="border-primary/30 hover:bg-primary/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </Card>

        <div className="flex-1 grid md:grid-cols-[300px_1fr] gap-4 overflow-hidden">
          <UserList
            currentUserId={user.id}
            onSelectUser={(userId, username) => {
              setSelectedUserId(userId);
              setSelectedUsername(username);
            }}
            selectedUserId={selectedUserId}
          />

          <Card className="flex flex-col bg-card/60 backdrop-blur-xl border-primary/30 shadow-[0_0_20px_rgba(0,217,255,0.2)]">
            {selectedUserId ? (
              <>
                <div className="p-4 border-b border-primary/30">
                  <h2 className="text-lg font-semibold text-foreground">
                    {selectedUsername}
                  </h2>
                </div>

                <ScrollArea className="flex-1 p-4">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      content={message.content}
                      isOwn={message.sender_id === user.id}
                      senderName={message.sender?.username || "Unknown"}
                      timestamp={message.created_at}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </ScrollArea>

                <form onSubmit={handleSendMessage} className="p-4 border-t border-primary/30">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-input border-primary/30 focus:border-primary"
                      disabled={loading}
                      maxLength={5000}
                    />
                    <Button 
                      type="submit" 
                      disabled={loading || !newMessage.trim()}
                      className="bg-gradient-to-r from-primary to-secondary hover:shadow-[0_0_20px_rgba(0,217,255,0.5)] transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a contact to start chatting
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Chat;
