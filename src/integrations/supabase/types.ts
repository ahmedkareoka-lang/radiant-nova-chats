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
      agency_members: {
        Row: {
          agency_id: string
          badge: string
          id: string
          joined_at: string
          role: string
          total_support: number
          user_id: string
        }
        Insert: {
          agency_id: string
          badge?: string
          id?: string
          joined_at?: string
          role?: string
          total_support?: number
          user_id: string
        }
        Update: {
          agency_id?: string
          badge?: string
          id?: string
          joined_at?: string
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
          avatar_url: string | null
          charisma_level: number
          charisma_xp: number
          coins: number
          country_code: string | null
          created_at: string
          diamonds: number
          display_name: string
          equipped_frame: string | null
          gender: string | null
          id: string
          is_boss: boolean
          level: number
          phone: string | null
          user_id: string
          vip_level: number
          wealth_level: number
          wealth_xp: number
        }
        Insert: {
          avatar_url?: string | null
          charisma_level?: number
          charisma_xp?: number
          coins?: number
          country_code?: string | null
          created_at?: string
          diamonds?: number
          display_name?: string
          equipped_frame?: string | null
          gender?: string | null
          id: string
          is_boss?: boolean
          level?: number
          phone?: string | null
          user_id: string
          vip_level?: number
          wealth_level?: number
          wealth_xp?: number
        }
        Update: {
          avatar_url?: string | null
          charisma_level?: number
          charisma_xp?: number
          coins?: number
          country_code?: string | null
          created_at?: string
          diamonds?: number
          display_name?: string
          equipped_frame?: string | null
          gender?: string | null
          id?: string
          is_boss?: boolean
          level?: number
          phone?: string | null
          user_id?: string
          vip_level?: number
          wealth_level?: number
          wealth_xp?: number
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
        ]
      }
      rooms: {
        Row: {
          created_at: string
          host_id: string
          id: string
          is_active: boolean
          is_private: boolean
          mic_count: number
          name: string
          password: string | null
          type: string
        }
        Insert: {
          created_at?: string
          host_id: string
          id?: string
          is_active?: boolean
          is_private?: boolean
          mic_count?: number
          name: string
          password?: string | null
          type?: string
        }
        Update: {
          created_at?: string
          host_id?: string
          id?: string
          is_active?: boolean
          is_private?: boolean
          mic_count?: number
          name?: string
          password?: string | null
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
      [_ in never]: never
    }
    Functions: {
      generate_user_id: { Args: never; Returns: string }
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
