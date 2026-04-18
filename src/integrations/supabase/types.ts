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
      agencies: {
        Row: {
          broadcast_enabled: boolean
          commission_balance: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          owner_id: string
          recharge_enabled: boolean
          status: string
        }
        Insert: {
          broadcast_enabled?: boolean
          commission_balance?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          owner_id: string
          recharge_enabled?: boolean
          status?: string
        }
        Update: {
          broadcast_enabled?: boolean
          commission_balance?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string
          recharge_enabled?: boolean
          status?: string
        }
        Relationships: []
      }
      agency_invites: {
        Row: {
          agency_id: string
          agent_id: string
          created_at: string
          id: string
          status: string
          target_user_id: string
        }
        Insert: {
          agency_id: string
          agent_id: string
          created_at?: string
          id?: string
          status?: string
          target_user_id: string
        }
        Update: {
          agency_id?: string
          agent_id?: string
          created_at?: string
          id?: string
          status?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_invites_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_members: {
        Row: {
          agency_id: string
          badge: string
          id: string
          joined_at: string
          mic_hours: number
          role: string
          total_support: number
          user_id: string
        }
        Insert: {
          agency_id: string
          badge?: string
          id?: string
          joined_at?: string
          mic_hours?: number
          role?: string
          total_support?: number
          user_id: string
        }
        Update: {
          agency_id?: string
          badge?: string
          id?: string
          joined_at?: string
          mic_hours?: number
          role?: string
          total_support?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_resignations: {
        Row: {
          agency_id: string
          created_at: string
          host_id: string
          id: string
          status: string
        }
        Insert: {
          agency_id: string
          created_at?: string
          host_id: string
          id?: string
          status?: string
        }
        Update: {
          agency_id?: string
          created_at?: string
          host_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_resignations_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          sort_order: number
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          title?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      daily_tasks: {
        Row: {
          created_at: string
          games_played: number
          games_reward_claimed: boolean
          gift_reward_claimed: boolean
          gifts_sent: number
          id: string
          room_minutes: number
          room_reward_claimed: boolean
          task_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          games_played?: number
          games_reward_claimed?: boolean
          gift_reward_claimed?: boolean
          gifts_sent?: number
          id?: string
          room_minutes?: number
          room_reward_claimed?: boolean
          task_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          games_played?: number
          games_reward_claimed?: boolean
          gift_reward_claimed?: boolean
          gifts_sent?: number
          id?: string
          room_minutes?: number
          room_reward_claimed?: boolean
          task_date?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      gift_transactions: {
        Row: {
          created_at: string
          diamond_amount: number
          gift_name: string
          gold_amount: number
          id: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          diamond_amount: number
          gift_name: string
          gold_amount: number
          id?: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          diamond_amount?: number
          gift_name?: string
          gold_amount?: number
          id?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      gifts: {
        Row: {
          animation_url: string | null
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          price: number
        }
        Insert: {
          animation_url?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
        }
        Update: {
          animation_url?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
        }
        Relationships: []
      }
      inventory: {
        Row: {
          acquired_at: string
          id: string
          item_data: Json | null
          item_name: string
          item_type: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          id?: string
          item_data?: Json | null
          item_name: string
          item_type: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          id?: string
          item_data?: Json | null
          item_name?: string
          item_type?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          room_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          room_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          room_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_profiles_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_profiles_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nova_p_monthly_history: {
        Row: {
          achieved_at: string
          highest_level: number
          id: string
          total_gold_earned: number
          user_id: string
          year_month: string
        }
        Insert: {
          achieved_at?: string
          highest_level?: number
          id?: string
          total_gold_earned?: number
          user_id: string
          year_month: string
        }
        Update: {
          achieved_at?: string
          highest_level?: number
          id?: string
          total_gold_earned?: number
          user_id?: string
          year_month?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pricing_plans: {
        Row: {
          coin_price: number
          country_code: string
          country_name: string
          created_at: string
          currency: string
          diamond_price: number
          id: string
        }
        Insert: {
          coin_price?: number
          country_code: string
          country_name: string
          created_at?: string
          currency?: string
          diamond_price?: number
          id?: string
        }
        Update: {
          coin_price?: number
          country_code?: string
          country_name?: string
          created_at?: string
          currency?: string
          diamond_price?: number
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          agency_id: string | null
          avatar_url: string | null
          charisma_level: number
          charisma_xp: number
          coins: number
          country_code: string | null
          created_at: string
          diamonds: number
          display_name: string
          entrance_audio_url: string | null
          entrance_video_url: string | null
          equipped_badge: string | null
          equipped_chat_bubble: string | null
          equipped_entrance_effect: string | null
          equipped_frame: string | null
          equipped_name_style: string | null
          gender: string | null
          id: string
          is_agent: boolean
          is_boss: boolean
          is_host: boolean
          level: number
          nova_p_expiry: string | null
          nova_p_level: number
          phone: string | null
          total_spend_gold: number
          user_id: string
          vip_expiry: string | null
          vip_level: number
          wealth_level: number
          wealth_xp: number
        }
        Insert: {
          age?: number | null
          agency_id?: string | null
          avatar_url?: string | null
          charisma_level?: number
          charisma_xp?: number
          coins?: number
          country_code?: string | null
          created_at?: string
          diamonds?: number
          display_name?: string
          entrance_audio_url?: string | null
          entrance_video_url?: string | null
          equipped_badge?: string | null
          equipped_chat_bubble?: string | null
          equipped_entrance_effect?: string | null
          equipped_frame?: string | null
          equipped_name_style?: string | null
          gender?: string | null
          id: string
          is_agent?: boolean
          is_boss?: boolean
          is_host?: boolean
          level?: number
          nova_p_expiry?: string | null
          nova_p_level?: number
          phone?: string | null
          total_spend_gold?: number
          user_id: string
          vip_expiry?: string | null
          vip_level?: number
          wealth_level?: number
          wealth_xp?: number
        }
        Update: {
          age?: number | null
          agency_id?: string | null
          avatar_url?: string | null
          charisma_level?: number
          charisma_xp?: number
          coins?: number
          country_code?: string | null
          created_at?: string
          diamonds?: number
          display_name?: string
          entrance_audio_url?: string | null
          entrance_video_url?: string | null
          equipped_badge?: string | null
          equipped_chat_bubble?: string | null
          equipped_entrance_effect?: string | null
          equipped_frame?: string | null
          equipped_name_style?: string | null
          gender?: string | null
          id?: string
          is_agent?: boolean
          is_boss?: boolean
          is_host?: boolean
          level?: number
          nova_p_expiry?: string | null
          nova_p_level?: number
          phone?: string | null
          total_spend_gold?: number
          user_id?: string
          vip_expiry?: string | null
          vip_level?: number
          wealth_level?: number
          wealth_xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      recharge_agents: {
        Row: {
          agent_name: string
          avatar_url: string | null
          created_at: string
          id: string
          is_active: boolean
          user_id: string
          whatsapp_number: string
        }
        Insert: {
          agent_name: string
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          user_id: string
          whatsapp_number: string
        }
        Update: {
          agent_name?: string
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          user_id?: string
          whatsapp_number?: string
        }
        Relationships: []
      }
      room_bans: {
        Row: {
          banned_by: string
          created_at: string
          id: string
          room_id: string
          user_id: string
        }
        Insert: {
          banned_by: string
          created_at?: string
          id?: string
          room_id: string
          user_id: string
        }
        Update: {
          banned_by?: string
          created_at?: string
          id?: string
          room_id?: string
          user_id?: string
        }
        Relationships: []
      }
      room_members: {
        Row: {
          id: string
          is_on_mic: boolean
          joined_at: string
          mic_slot: number | null
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_on_mic?: boolean
          joined_at?: string
          mic_slot?: number | null
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_on_mic?: boolean
          joined_at?: string
          mic_slot?: number | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_members_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_members_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          background_theme: string
          created_at: string
          host_id: string
          id: string
          is_active: boolean
          is_private: boolean
          locked_slots: number[] | null
          mic_count: number
          muted_users: string[] | null
          name: string
          password: string | null
          room_image: string | null
          type: string
        }
        Insert: {
          background_theme?: string
          created_at?: string
          host_id: string
          id?: string
          is_active?: boolean
          is_private?: boolean
          locked_slots?: number[] | null
          mic_count?: number
          muted_users?: string[] | null
          name: string
          password?: string | null
          room_image?: string | null
          type?: string
        }
        Update: {
          background_theme?: string
          created_at?: string
          host_id?: string
          id?: string
          is_active?: boolean
          is_private?: boolean
          locked_slots?: number[] | null
          mic_count?: number
          muted_users?: string[] | null
          name?: string
          password?: string | null
          room_image?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_host_id_profiles_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_host_id_profiles_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      store_items: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price_coins: number
          price_diamonds: number
          tier_required: number
          tier_type: string
          type: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price_coins?: number
          price_diamonds?: number
          tier_required?: number
          tier_type?: string
          type: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price_coins?: number
          price_diamonds?: number
          tier_required?: number
          tier_type?: string
          type?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          country_code: string | null
          is_online: boolean
          last_seen: string
          user_id: string
        }
        Insert: {
          country_code?: string | null
          is_online?: boolean
          last_seen?: string
          user_id: string
        }
        Update: {
          country_code?: string | null
          is_online?: boolean
          last_seen?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          age: number | null
          agency_id: string | null
          avatar_url: string | null
          charisma_level: number | null
          charisma_xp: number | null
          coins: number | null
          country_code: string | null
          created_at: string | null
          diamonds: number | null
          display_name: string | null
          entrance_audio_url: string | null
          entrance_video_url: string | null
          equipped_frame: string | null
          gender: string | null
          id: string | null
          is_agent: boolean | null
          is_boss: boolean | null
          is_host: boolean | null
          level: number | null
          user_id: string | null
          vip_level: number | null
          wealth_level: number | null
          wealth_xp: number | null
        }
        Insert: {
          age?: number | null
          agency_id?: string | null
          avatar_url?: string | null
          charisma_level?: number | null
          charisma_xp?: number | null
          coins?: number | null
          country_code?: string | null
          created_at?: string | null
          diamonds?: number | null
          display_name?: string | null
          entrance_audio_url?: string | null
          entrance_video_url?: string | null
          equipped_frame?: string | null
          gender?: string | null
          id?: string | null
          is_agent?: boolean | null
          is_boss?: boolean | null
          is_host?: boolean | null
          level?: number | null
          user_id?: string | null
          vip_level?: number | null
          wealth_level?: number | null
          wealth_xp?: number | null
        }
        Update: {
          age?: number | null
          agency_id?: string | null
          avatar_url?: string | null
          charisma_level?: number | null
          charisma_xp?: number | null
          coins?: number | null
          country_code?: string | null
          created_at?: string | null
          diamonds?: number | null
          display_name?: string | null
          entrance_audio_url?: string | null
          entrance_video_url?: string | null
          equipped_frame?: string | null
          gender?: string | null
          id?: string | null
          is_agent?: boolean | null
          is_boss?: boolean | null
          is_host?: boolean | null
          level?: number | null
          user_id?: string | null
          vip_level?: number | null
          wealth_level?: number | null
          wealth_xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_agency_invite: {
        Args: { _invite_id: string; _user_id: string }
        Returns: undefined
      }
      add_coins: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
      }
      add_diamonds_add_charisma: {
        Args: { _diamond_amount: number; _user_id: string; _xp_amount: number }
        Returns: undefined
      }
      admin_update_profile: {
        Args: {
          _admin_id: string
          _coins?: number
          _diamonds?: number
          _is_boss?: boolean
          _target_id: string
          _vip_level?: number
        }
        Returns: undefined
      }
      approve_resignation: {
        Args: { _agent_id: string; _resignation_id: string }
        Returns: undefined
      }
      claim_daily_reward: {
        Args: { _task_type: string; _user_id: string }
        Returns: undefined
      }
      deduct_coins: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
      }
      deduct_coins_add_wealth: {
        Args: { _coin_amount: number; _user_id: string; _xp_amount: number }
        Returns: undefined
      }
      exchange_diamonds_to_coins: {
        Args: {
          _coin_amount: number
          _diamond_amount: number
          _user_id: string
        }
        Returns: undefined
      }
      generate_user_id: { Args: never; Returns: string }
      get_nova_p_tier: {
        Args: { gold_amount: number }
        Returns: {
          duration_days: number
          level: number
        }[]
      }
      get_profile_safe_fields: {
        Args: { _profile_id: string }
        Returns: {
          avatar_url: string
          charisma_level: number
          country_code: string
          display_name: string
          equipped_frame: string
          gender: string
          id: string
          is_boss: boolean
          level: number
          user_id: string
          vip_level: number
          wealth_level: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_daily_task: {
        Args: { _amount?: number; _task_type: string; _user_id: string }
        Returns: undefined
      }
      is_own_profile: { Args: { _profile_id: string }; Returns: boolean }
      recompute_nova_p: { Args: { _user_id: string }; Returns: undefined }
      record_nova_p_monthly: { Args: { _user_id: string }; Returns: undefined }
      remove_agency_host: {
        Args: { _agency_id: string; _agent_id: string; _host_id: string }
        Returns: undefined
      }
      sweep_expired_perks: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "super_admin" | "user"
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
      app_role: ["admin", "super_admin", "user"],
    },
  },
} as const
