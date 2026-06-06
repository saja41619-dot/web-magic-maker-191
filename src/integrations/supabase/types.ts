export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      broadcast_list_members: {
        Row: {
          created_at: string
          id: string
          list_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          list_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          list_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "broadcast_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_lists: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      calls: {
        Row: {
          callee_id: string | null
          caller_id: string
          created_at: string
          ended_at: string | null
          group_id: string | null
          id: string
          kind: string
          media: string
          room_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          callee_id?: string | null
          caller_id: string
          created_at?: string
          ended_at?: string | null
          group_id?: string | null
          id?: string
          kind: string
          media: string
          room_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          callee_id?: string | null
          caller_id?: string
          created_at?: string
          ended_at?: string | null
          group_id?: string | null
          id?: string
          kind?: string
          media?: string
          room_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      chat_groups: {
        Row: {
          community_id: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          community_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          community_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_groups_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      community_members: {
        Row: {
          community_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          read: boolean
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          read?: boolean
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          read?: boolean
          user_id?: string | null
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          content: string | null
          created_at: string
          deleted_for_all: boolean
          edited_at: string | null
          expires_at: string | null
          forwarded: boolean
          id: string
          is_broadcast: boolean
          live_location_until: string | null
          poll_id: string | null
          read_at: string | null
          recipient_id: string
          reply_to_id: string | null
          scheduled_for: string | null
          sender_id: string
          view_once: boolean
          view_once_opened_at: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string | null
          created_at?: string
          deleted_for_all?: boolean
          edited_at?: string | null
          expires_at?: string | null
          forwarded?: boolean
          id?: string
          is_broadcast?: boolean
          live_location_until?: string | null
          poll_id?: string | null
          read_at?: string | null
          recipient_id: string
          reply_to_id?: string | null
          scheduled_for?: string | null
          sender_id: string
          view_once?: boolean
          view_once_opened_at?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string | null
          created_at?: string
          deleted_for_all?: boolean
          edited_at?: string | null
          expires_at?: string | null
          forwarded?: boolean
          id?: string
          is_broadcast?: boolean
          live_location_until?: string | null
          poll_id?: string | null
          read_at?: string | null
          recipient_id?: string
          reply_to_id?: string | null
          scheduled_for?: string | null
          sender_id?: string
          view_once?: boolean
          view_once_opened_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_message_reads: {
        Row: {
          group_id: string
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_message_reads_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_message_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          content: string | null
          created_at: string
          deleted_for_all: boolean
          edited_at: string | null
          expires_at: string | null
          forwarded: boolean
          group_id: string
          id: string
          live_location_until: string | null
          poll_id: string | null
          reply_to_id: string | null
          scheduled_for: string | null
          sender_id: string
          view_once: boolean
          view_once_opened_at: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string | null
          created_at?: string
          deleted_for_all?: boolean
          edited_at?: string | null
          expires_at?: string | null
          forwarded?: boolean
          group_id: string
          id?: string
          live_location_until?: string | null
          poll_id?: string | null
          reply_to_id?: string | null
          scheduled_for?: string | null
          sender_id: string
          view_once?: boolean
          view_once_opened_at?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          content?: string | null
          created_at?: string
          deleted_for_all?: boolean
          edited_at?: string | null
          expires_at?: string | null
          forwarded?: boolean
          group_id?: string
          id?: string
          live_location_until?: string | null
          poll_id?: string | null
          reply_to_id?: string | null
          scheduled_for?: string | null
          sender_id?: string
          view_once?: boolean
          view_once_opened_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "chat_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          message_kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          message_kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          message_kind?: string
          user_id?: string
        }
        Relationships: []
      }
      poll_options: {
        Row: {
          id: string
          label: string
          poll_id: string
          position: number
        }
        Insert: {
          id?: string
          label: string
          poll_id: string
          position?: number
        }
        Update: {
          id?: string
          label?: string
          poll_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          closed: boolean
          created_at: string
          created_by: string
          id: string
          multiple_choice: boolean
          question: string
        }
        Insert: {
          closed?: boolean
          created_at?: string
          created_by: string
          id?: string
          multiple_choice?: boolean
          question: string
        }
        Update: {
          closed?: boolean
          created_at?: string
          created_by?: string
          id?: string
          multiple_choice?: boolean
          question?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email_notifications: boolean
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email_notifications?: boolean
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email_notifications?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string | null
          link: string | null
          sort_order: number
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          link?: string | null
          sort_order?: number
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          link?: string | null
          sort_order?: number
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          bio: string
          email: string | null
          id: number
          instagram: string | null
          name: string
          photo_url: string | null
          tagline: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          bio?: string
          email?: string | null
          id: number
          instagram?: string | null
          name?: string
          photo_url?: string | null
          tagline?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          bio?: string
          email?: string | null
          id?: number
          instagram?: string | null
          name?: string
          photo_url?: string | null
          tagline?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      skills: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
          what: string
          why: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
          what?: string
          why?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
          what?: string
          why?: string
        }
        Relationships: []
      }
      starred_messages: {
        Row: {
          created_at: string
          id: string
          message_id: string
          message_kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          message_kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          message_kind?: string
          user_id?: string
        }
        Relationships: []
      }
      status_posts: {
        Row: {
          background: string | null
          content: string | null
          created_at: string
          expires_at: string
          id: string
          media_type: string | null
          media_url: string | null
          user_id: string
        }
        Insert: {
          background?: string | null
          content?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          user_id: string
        }
        Update: {
          background?: string | null
          content?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      status_views: {
        Row: {
          id: string
          status_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          status_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          status_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: []
      }
      user_chat_settings: {
        Row: {
          archived: boolean
          chat_key: string
          chat_kind: string
          disappearing_seconds: number | null
          id: string
          muted_until: string | null
          pinned: boolean
          updated_at: string
          user_id: string
          wallpaper: string | null
        }
        Insert: {
          archived?: boolean
          chat_key: string
          chat_kind: string
          disappearing_seconds?: number | null
          id?: string
          muted_until?: string | null
          pinned?: boolean
          updated_at?: string
          user_id: string
          wallpaper?: string | null
        }
        Update: {
          archived?: boolean
          chat_key?: string
          chat_kind?: string
          disappearing_seconds?: number | null
          id?: string
          muted_until?: string | null
          pinned?: boolean
          updated_at?: string
          user_id?: string
          wallpaper?: string | null
        }
        Relationships: []
      }
      user_favorites: {
        Row: {
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string | null
          expires_at: string
          id: string
          invite_code: string
          inviter_id: string
          message: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invite_code: string
          inviter_id: string
          message?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          invite_code?: string
          inviter_id?: string
          message?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          is_online: boolean
          last_seen_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          is_online?: boolean
          last_seen_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          is_online?: boolean
          last_seen_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_messages: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_broadcast_owner: {
        Args: { _list_id: string; _user_id: string }
        Returns: boolean
      }
      is_community_admin: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      is_community_member: {
        Args: { _community_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_admin: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
