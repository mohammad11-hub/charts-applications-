import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Profile {
  id: string;
  username: string;
  avatar_color: string;
}

interface UserListProps {
  currentUserId: string;
  onSelectUser: (userId: string, username: string) => void;
  selectedUserId: string | null;
}

export const UserList = ({ currentUserId, onSelectUser, selectedUserId }: UserListProps) => {
  const [users, setUsers] = useState<Profile[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", currentUserId);

      if (error) {
        console.error("Error fetching users:", error);
        return;
      }

      setUsers(data || []);
    };

    fetchUsers();

    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  return (
    <Card className="h-full bg-card/60 backdrop-blur-xl border-primary/30 shadow-[0_0_20px_rgba(0,217,255,0.2)]">
      <div className="p-4 border-b border-primary/30">
        <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Contacts
        </h2>
      </div>
      <ScrollArea className="h-[calc(100%-73px)]">
        <div className="p-2 space-y-2">
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => onSelectUser(user.id, user.username)}
              className={`
                w-full p-3 rounded-lg flex items-center gap-3 transition-all
                ${selectedUserId === user.id 
                  ? "bg-primary/20 border border-primary shadow-[0_0_15px_rgba(0,217,255,0.3)]" 
                  : "bg-muted/30 hover:bg-muted/50 border border-transparent"
                }
              `}
            >
              <Avatar className="h-10 w-10 border-2 border-primary/50">
                <AvatarFallback 
                  className="text-sm font-bold"
                  style={{ backgroundColor: user.avatar_color }}
                >
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">{user.username}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
