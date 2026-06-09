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
      agent_transfer_log: {
        Row: {
          agent_id: string
          amount: number
          created_at: string
          id: string
          recipient_id: string
        }
        Insert: {
          agent_id: string
          amount: number
          created_at?: string
          id?: string
          recipient_id: string
        }
        Update: {
          agent_id?: string
          amount?: number
          created_at?: string
          id?: string
          recipient_id?: string
        }
        Relationships: []
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
      bd_activity_log: {
        Row: {
          action_type: string
          agency_id: string | null
          bd_user_id: string
          created_at: string
          details: Json
          id: string
          message: string | null
          status: string
          target_display_name: string | null
          target_public_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          agency_id?: string | null
          bd_user_id: string
          created_at?: string
          details?: Json
          id?: string
          message?: string | null
          status?: string
          target_display_name?: string | null
          target_public_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          agency_id?: string | null
          bd_user_id?: string
          created_at?: string
          details?: Json
          id?: string
          message?: string | null
          status?: string
          target_display_name?: string | null
          target_public_id?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      bd_agencies: {
        Row: {
          activated_by: string
          agency_id: string
          bd_user_id: string
          created_at: string
          id: string
          is_target_reached: boolean
          total_agency_support: number
          total_commission_earned: number
        }
        Insert: {
          activated_by: string
          agency_id: string
          bd_user_id: string
          created_at?: string
          id?: string
          is_target_reached?: boolean
          total_agency_support?: number
          total_commission_earned?: number
        }
        Update: {
          activated_by?: string
          agency_id?: string
          bd_user_id?: string
          created_at?: string
          id?: string
          is_target_reached?: boolean
          total_agency_support?: number
          total_commission_earned?: number
        }
        Relationships: []
      }
      bd_commissions: {
        Row: {
          agency_id: string
          agency_support_amount: number
          bd_user_id: string
          commission_amount: number
          created_at: string
          id: string
          period_label: string
        }
        Insert: {
          agency_id: string
          agency_support_amount: number
          bd_user_id: string
          commission_amount: number
          created_at?: string
          id?: string
          period_label: string
        }
        Update: {
          agency_id?: string
          agency_support_amount?: number
          bd_user_id?: string
          commission_amount?: number
          created_at?: string
          id?: string
          period_label?: string
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
          follow_reward_claimed: boolean
          follows_made: number
          games_played: number
          games_reward_claimed: boolean
          gift_reward_claimed: boolean
          gifts_sent: number
          id: string
          like_reward_claimed: boolean
          likes_given: number
          message_reward_claimed: boolean
          messages_sent: number
          post_reward_claimed: boolean
          posts_made: number
          room_minutes: number
          room_reward_claimed: boolean
          task_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          follow_reward_claimed?: boolean
          follows_made?: number
          games_played?: number
          games_reward_claimed?: boolean
          gift_reward_claimed?: boolean
          gifts_sent?: number
          id?: string
          like_reward_claimed?: boolean
          likes_given?: number
          message_reward_claimed?: boolean
          messages_sent?: number
          post_reward_claimed?: boolean
          posts_made?: number
          room_minutes?: number
          room_reward_claimed?: boolean
          task_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          follow_reward_claimed?: boolean
          follows_made?: number
          games_played?: number
          games_reward_claimed?: boolean
          gift_reward_claimed?: boolean
          gifts_sent?: number
          id?: string
          like_reward_claimed?: boolean
          likes_given?: number
          message_reward_claimed?: boolean
          messages_sent?: number
          post_reward_claimed?: boolean
          posts_made?: number
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
      gift_combos: {
        Row: {
          combo_count: number
          created_at: string
          gift_name: string
          id: string
          receiver_id: string
          room_id: string | null
          sender_id: string
          total_gold: number
          unit_price: number
        }
        Insert: {
          combo_count: number
          created_at?: string
          gift_name: string
          id?: string
          receiver_id: string
          room_id?: string | null
          sender_id: string
          total_gold: number
          unit_price: number
        }
        Update: {
          combo_count?: number
          created_at?: string
          gift_name?: string
          id?: string
          receiver_id?: string
          room_id?: string | null
          sender_id?: string
          total_gold?: number
          unit_price?: number
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
          category: string
          created_at: string | null
          duration_ms: number
          id: string
          image_url: string | null
          is_active: boolean
          lottie_url: string | null
          name: string
          price: number
          sort_order: number
          tier: string
          video_url: string | null
        }
        Insert: {
          animation_url?: string | null
          category?: string
          created_at?: string | null
          duration_ms?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          lottie_url?: string | null
          name: string
          price: number
          sort_order?: number
          tier?: string
          video_url?: string | null
        }
        Update: {
          animation_url?: string | null
          category?: string
          created_at?: string | null
          duration_ms?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          lottie_url?: string | null
          name?: string
          price?: number
          sort_order?: number
          tier?: string
          video_url?: string | null
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
      love_achievements: {
        Row: {
          achievement_key: string
          couple_id: string
          id: string
          unlocked_at: string
        }
        Insert: {
          achievement_key: string
          couple_id: string
          id?: string
          unlocked_at?: string
        }
        Update: {
          achievement_key?: string
          couple_id?: string
          id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "love_achievements_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "love_couples"
            referencedColumns: ["id"]
          },
        ]
      }
      love_couples: {
        Row: {
          activated_at: string
          anniversary_date: string
          created_at: string
          custom_title: string | null
          daily_hearts_count: number
          daily_hearts_sent_at: string | null
          id: string
          is_active: boolean
          last_streak_date: string | null
          love_level: number
          love_points: number
          monthly_anniversary_claimed_at: string | null
          relationship_type: string
          streak_days: number
          updated_at: string
          user1_id: string
          user2_id: string
          weekly_gift_claimed_at: string | null
        }
        Insert: {
          activated_at?: string
          anniversary_date?: string
          created_at?: string
          custom_title?: string | null
          daily_hearts_count?: number
          daily_hearts_sent_at?: string | null
          id?: string
          is_active?: boolean
          last_streak_date?: string | null
          love_level?: number
          love_points?: number
          monthly_anniversary_claimed_at?: string | null
          relationship_type?: string
          streak_days?: number
          updated_at?: string
          user1_id: string
          user2_id: string
          weekly_gift_claimed_at?: string | null
        }
        Update: {
          activated_at?: string
          anniversary_date?: string
          created_at?: string
          custom_title?: string | null
          daily_hearts_count?: number
          daily_hearts_sent_at?: string | null
          id?: string
          is_active?: boolean
          last_streak_date?: string | null
          love_level?: number
          love_points?: number
          monthly_anniversary_claimed_at?: string | null
          relationship_type?: string
          streak_days?: number
          updated_at?: string
          user1_id?: string
          user2_id?: string
          weekly_gift_claimed_at?: string | null
        }
        Relationships: []
      }
      love_quests: {
        Row: {
          claimed: boolean
          completed: boolean
          couple_id: string
          created_at: string
          id: string
          progress: number
          quest_date: string
          quest_key: string
          reward_points: number
          target: number
          updated_at: string
        }
        Insert: {
          claimed?: boolean
          completed?: boolean
          couple_id: string
          created_at?: string
          id?: string
          progress?: number
          quest_date?: string
          quest_key: string
          reward_points?: number
          target: number
          updated_at?: string
        }
        Update: {
          claimed?: boolean
          completed?: boolean
          couple_id?: string
          created_at?: string
          id?: string
          progress?: number
          quest_date?: string
          quest_key?: string
          reward_points?: number
          target?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "love_quests_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "love_couples"
            referencedColumns: ["id"]
          },
        ]
      }
      lucky_box_openings: {
        Row: {
          box_tier: string
          cost_coins: number
          created_at: string
          id: string
          is_jackpot: boolean
          reward_coins: number
          reward_diamonds: number
          reward_item_name: string | null
          reward_item_type: string | null
          user_id: string
        }
        Insert: {
          box_tier?: string
          cost_coins: number
          created_at?: string
          id?: string
          is_jackpot?: boolean
          reward_coins?: number
          reward_diamonds?: number
          reward_item_name?: string | null
          reward_item_type?: string | null
          user_id: string
        }
        Update: {
          box_tier?: string
          cost_coins?: number
          created_at?: string
          id?: string
          is_jackpot?: boolean
          reward_coins?: number
          reward_diamonds?: number
          reward_item_name?: string | null
          reward_item_type?: string | null
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
      payroll_audit_log: {
        Row: {
          action_type: string
          actor_id: string | null
          coin_amount: number | null
          created_at: string
          description: string
          diamond_amount: number | null
          id: string
          metadata: Json | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          coin_amount?: number | null
          created_at?: string
          description: string
          diamond_amount?: number | null
          id?: string
          metadata?: Json | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          coin_amount?: number | null
          created_at?: string
          description?: string
          diamond_amount?: number | null
          id?: string
          metadata?: Json | null
          target_user_id?: string | null
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
          agency_eligible: boolean
          agency_id: string | null
          avatar_url: string | null
          charisma_level: number
          charisma_xp: number
          coins: number
          country_code: string | null
          cover_url: string | null
          created_at: string
          diamonds: number
          display_name: string
          displayed_vip_level: number | null
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
          is_bd: boolean
          is_boss: boolean
          is_host: boolean
          level: number
          nova_p_expiry: string | null
          nova_p_level: number
          phone: string | null
          telegram_first_name: string | null
          telegram_id: number | null
          telegram_linked_at: string | null
          telegram_photo_url: string | null
          telegram_username: string | null
          total_spend_gold: number
          user_id: string
          vip_expiry: string | null
          vip_level: number
          wealth_level: number
          wealth_xp: number
        }
        Insert: {
          age?: number | null
          agency_eligible?: boolean
          agency_id?: string | null
          avatar_url?: string | null
          charisma_level?: number
          charisma_xp?: number
          coins?: number
          country_code?: string | null
          cover_url?: string | null
          created_at?: string
          diamonds?: number
          display_name?: string
          displayed_vip_level?: number | null
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
          is_bd?: boolean
          is_boss?: boolean
          is_host?: boolean
          level?: number
          nova_p_expiry?: string | null
          nova_p_level?: number
          phone?: string | null
          telegram_first_name?: string | null
          telegram_id?: number | null
          telegram_linked_at?: string | null
          telegram_photo_url?: string | null
          telegram_username?: string | null
          total_spend_gold?: number
          user_id: string
          vip_expiry?: string | null
          vip_level?: number
          wealth_level?: number
          wealth_xp?: number
        }
        Update: {
          age?: number | null
          agency_eligible?: boolean
          agency_id?: string | null
          avatar_url?: string | null
          charisma_level?: number
          charisma_xp?: number
          coins?: number
          country_code?: string | null
          cover_url?: string | null
          created_at?: string
          diamonds?: number
          display_name?: string
          displayed_vip_level?: number | null
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
          is_bd?: boolean
          is_boss?: boolean
          is_host?: boolean
          level?: number
          nova_p_expiry?: string | null
          nova_p_level?: number
          phone?: string | null
          telegram_first_name?: string | null
          telegram_id?: number | null
          telegram_linked_at?: string | null
          telegram_photo_url?: string | null
          telegram_username?: string | null
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
      recharge_settings: {
        Row: {
          id: string
          notes: string | null
          updated_at: string
          usdt_network: string
          usdt_qr_url: string | null
          usdt_wallet_address: string
        }
        Insert: {
          id?: string
          notes?: string | null
          updated_at?: string
          usdt_network?: string
          usdt_qr_url?: string | null
          usdt_wallet_address?: string
        }
        Update: {
          id?: string
          notes?: string | null
          updated_at?: string
          usdt_network?: string
          usdt_qr_url?: string | null
          usdt_wallet_address?: string
        }
        Relationships: []
      }
      redeem_code_uses: {
        Row: {
          code_id: string
          coins_awarded: number
          created_at: string
          diamonds_awarded: number
          id: string
          user_id: string
        }
        Insert: {
          code_id: string
          coins_awarded?: number
          created_at?: string
          diamonds_awarded?: number
          id?: string
          user_id: string
        }
        Update: {
          code_id?: string
          coins_awarded?: number
          created_at?: string
          diamonds_awarded?: number
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redeem_code_uses_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "redeem_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      redeem_codes: {
        Row: {
          code: string
          coins_amount: number
          created_at: string
          created_by: string | null
          diamonds_amount: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number
          uses_count: number
        }
        Insert: {
          code: string
          coins_amount?: number
          created_at?: string
          created_by?: string | null
          diamonds_amount?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          uses_count?: number
        }
        Update: {
          code?: string
          coins_amount?: number
          created_at?: string
          created_by?: string | null
          diamonds_amount?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          uses_count?: number
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          total_earned_coins: number
          user_id: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          total_earned_coins?: number
          user_id: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          total_earned_coins?: number
          user_id?: string
          uses_count?: number
        }
        Relationships: []
      }
      referral_recharge_log: {
        Row: {
          bonus_coins: number
          created_at: string
          id: string
          recharge_amount_coins: number
          referred_id: string
          referrer_id: string
        }
        Insert: {
          bonus_coins: number
          created_at?: string
          id?: string
          recharge_amount_coins: number
          referred_id: string
          referrer_id: string
        }
        Update: {
          bonus_coins?: number
          created_at?: string
          id?: string
          recharge_amount_coins?: number
          referred_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          level5_reward_claimed: boolean
          referred_id: string
          referrer_id: string
          signup_reward_claimed: boolean
          total_recharge_bonus: number
        }
        Insert: {
          created_at?: string
          id?: string
          level5_reward_claimed?: boolean
          referred_id: string
          referrer_id: string
          signup_reward_claimed?: boolean
          total_recharge_bonus?: number
        }
        Update: {
          created_at?: string
          id?: string
          level5_reward_claimed?: boolean
          referred_id?: string
          referrer_id?: string
          signup_reward_claimed?: boolean
          total_recharge_bonus?: number
        }
        Relationships: []
      }
      relationship_requests: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          message: string | null
          receiver_id: string
          relationship_type: string
          responded_at: string | null
          sender_id: string
          status: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          message?: string | null
          receiver_id: string
          relationship_type: string
          responded_at?: string | null
          sender_id: string
          status?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          message?: string | null
          receiver_id?: string
          relationship_type?: string
          responded_at?: string | null
          sender_id?: string
          status?: string
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
      room_couples: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          love_score: number
          room_id: string
          slot1: number
          slot2: number
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          love_score?: number
          room_id: string
          slot1: number
          slot2: number
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          love_score?: number
          room_id?: string
          slot1?: number
          slot2?: number
          user1_id?: string
          user2_id?: string
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
      telegram_star_payments: {
        Row: {
          coins: number
          created_at: string
          diamonds: number
          id: string
          package_index: number
          paid_at: string | null
          payload: string
          provider_charge_id: string | null
          stars: number
          status: string
          telegram_charge_id: string | null
          telegram_id: number | null
          usdt: number
          user_id: string
        }
        Insert: {
          coins: number
          created_at?: string
          diamonds: number
          id?: string
          package_index: number
          paid_at?: string | null
          payload: string
          provider_charge_id?: string | null
          stars: number
          status?: string
          telegram_charge_id?: string | null
          telegram_id?: number | null
          usdt: number
          user_id: string
        }
        Update: {
          coins?: number
          created_at?: string
          diamonds?: number
          id?: string
          package_index?: number
          paid_at?: string | null
          payload?: string
          provider_charge_id?: string | null
          stars?: number
          status?: string
          telegram_charge_id?: string | null
          telegram_id?: number | null
          usdt?: number
          user_id?: string
        }
        Relationships: []
      }
      usdt_recharge_requests: {
        Row: {
          admin_notes: string | null
          amount_usdt: number
          coins_amount: number
          created_at: string
          diamonds_amount: number
          id: string
          network: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_usdt: number
          coins_amount?: number
          created_at?: string
          diamonds_amount?: number
          id?: string
          network?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          transaction_id: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_usdt?: number
          coins_amount?: number
          created_at?: string
          diamonds_amount?: number
          id?: string
          network?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          transaction_id?: string
          user_id?: string
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
      user_streaks: {
        Row: {
          current_streak: number
          last_claim_date: string | null
          longest_streak: number
          total_claims: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_streak?: number
          last_claim_date?: string | null
          longest_streak?: number
          total_claims?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_streak?: number
          last_claim_date?: string | null
          longest_streak?: number
          total_claims?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          agency_id: string | null
          avatar_url: string | null
          charisma_level: number | null
          country_code: string | null
          cover_url: string | null
          created_at: string | null
          display_name: string | null
          equipped_badge: string | null
          equipped_frame: string | null
          gender: string | null
          id: string | null
          is_agent: boolean | null
          is_bd: boolean | null
          is_boss: boolean | null
          is_host: boolean | null
          level: number | null
          nova_p_expiry: string | null
          nova_p_level: number | null
          user_id: string | null
          vip_expiry: string | null
          vip_level: number | null
          wealth_level: number | null
        }
        Insert: {
          agency_id?: string | null
          avatar_url?: string | null
          charisma_level?: number | null
          country_code?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          equipped_badge?: string | null
          equipped_frame?: string | null
          gender?: string | null
          id?: string | null
          is_agent?: boolean | null
          is_bd?: boolean | null
          is_boss?: boolean | null
          is_host?: boolean | null
          level?: number | null
          nova_p_expiry?: string | null
          nova_p_level?: number | null
          user_id?: string | null
          vip_expiry?: string | null
          vip_level?: number | null
          wealth_level?: number | null
        }
        Update: {
          agency_id?: string | null
          avatar_url?: string | null
          charisma_level?: number | null
          country_code?: string | null
          cover_url?: string | null
          created_at?: string | null
          display_name?: string | null
          equipped_badge?: string | null
          equipped_frame?: string | null
          gender?: string | null
          id?: string | null
          is_agent?: boolean | null
          is_bd?: boolean | null
          is_boss?: boolean | null
          is_host?: boolean | null
          level?: number | null
          nova_p_expiry?: string | null
          nova_p_level?: number | null
          user_id?: string | null
          vip_expiry?: string | null
          vip_level?: number | null
          wealth_level?: number | null
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
      _bump_love_quest: {
        Args: { _couple_id: string; _delta: number; _quest_key: string }
        Returns: undefined
      }
      _find_active_couple: { Args: { _a: string; _b: string }; Returns: string }
      accept_agency_invite: {
        Args: { _invite_id: string; _user_id: string }
        Returns: undefined
      }
      accept_relationship_request: {
        Args: { _request_id: string }
        Returns: string
      }
      activate_bd_account: { Args: { _user_id: string }; Returns: Json }
      activate_love_couple: { Args: { _partner_id: string }; Returns: Json }
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
      agent_transfer_coins: {
        Args: { _amount: number; _recipient_id: string }
        Returns: undefined
      }
      apply_referral_code: {
        Args: { _code: string; _user_id: string }
        Returns: Json
      }
      apply_telegram_referral: {
        Args: { _referrer_telegram_id: number; _user_id: string }
        Returns: Json
      }
      approve_resignation: {
        Args: { _agent_id: string; _resignation_id: string }
        Returns: undefined
      }
      approve_usdt_recharge: {
        Args: { _approve: boolean; _notes?: string; _request_id: string }
        Returns: Json
      }
      assign_agency_to_bd: {
        Args: { _agency_id: string; _bd_user_id: string }
        Returns: Json
      }
      award_love_points: {
        Args: { _couple_id: string; _points: number }
        Returns: Json
      }
      bd_activate_agency_for_user: {
        Args: { _target_public_id: string }
        Returns: Json
      }
      bump_couple_room_minutes: {
        Args: { _minutes?: number; _room_id: string }
        Returns: Json
      }
      bump_couple_streak: { Args: never; Returns: Json }
      cancel_relationship_request: {
        Args: { _request_id: string }
        Returns: undefined
      }
      claim_daily_reward: {
        Args: { _task_type: string; _user_id: string }
        Returns: undefined
      }
      claim_daily_streak: { Args: { _user_id: string }; Returns: Json }
      claim_love_quest: { Args: { _quest_id: string }; Returns: Json }
      claim_monthly_anniversary: { Args: never; Returns: Json }
      claim_weekly_couple_gift: { Args: never; Returns: Json }
      cleanup_stale_room_members: { Args: never; Returns: undefined }
      deactivate_bd_account: { Args: { _user_id: string }; Returns: Json }
      deactivate_love_couple: { Args: never; Returns: undefined }
      deduct_coins: {
        Args: { _amount: number; _user_id: string }
        Returns: undefined
      }
      deduct_coins_add_wealth: {
        Args: { _coin_amount: number; _user_id: string; _xp_amount: number }
        Returns: undefined
      }
      end_couple_seat: { Args: { _room_id: string }; Returns: undefined }
      exchange_diamonds_to_coins: {
        Args: {
          _coin_amount: number
          _diamond_amount: number
          _user_id: string
        }
        Returns: undefined
      }
      generate_referral_code: { Args: never; Returns: string }
      generate_user_id: { Args: never; Returns: string }
      get_agency_payroll_report: { Args: { _ref?: string }; Returns: Json }
      get_agent_transfer_stats: { Args: never; Returns: Json }
      get_bd_stats: { Args: { _bd_user_id: string }; Returns: Json }
      get_boss_monthly_payroll: { Args: { _ref?: string }; Returns: Json }
      get_host_agency_dashboard: { Args: never; Returns: Json }
      get_host_monthly_salary: {
        Args: { _host_id?: string; _ref?: string }
        Returns: Json
      }
      get_host_salary_details: {
        Args: { _cycle_mode?: string; _host_id?: string; _ref?: string }
        Returns: Json
      }
      get_love_level: { Args: { _points: number }; Returns: number }
      get_my_agency_overview: { Args: never; Returns: Json }
      get_my_host_events: { Args: never; Returns: Json }
      get_my_pending_invites: { Args: never; Returns: Json }
      get_my_phone: { Args: never; Returns: string }
      get_my_sent_invites: { Args: never; Returns: Json }
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
      get_relationship_cost: { Args: { _type: string }; Returns: number }
      get_target_cycle: {
        Args: { _ref?: string }
        Returns: {
          cycle_end: string
          cycle_label: string
          cycle_start: string
        }[]
      }
      get_target_cycle_alt: {
        Args: { _ref?: string }
        Returns: {
          cycle_end: string
          cycle_label: string
          cycle_start: string
        }[]
      }
      gift_diamonds_as_coins_to_user: {
        Args: { _diamond_amount: number; _recipient_user_id: string }
        Returns: Json
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
      log_bd_activity: {
        Args: {
          _action_type: string
          _agency_id?: string
          _details?: Json
          _message?: string
          _status?: string
          _target_display_name?: string
          _target_public_id?: string
          _target_user_id?: string
        }
        Returns: string
      }
      log_payroll_audit: {
        Args: {
          _action_type: string
          _coin_amount?: number
          _description: string
          _diamond_amount?: number
          _metadata?: Json
          _target_user_id: string
        }
        Returns: string
      }
      open_lucky_box: { Args: { _user_id: string }; Returns: Json }
      process_referral_level5: {
        Args: { _user_id: string }
        Returns: undefined
      }
      process_referral_recharge: {
        Args: { _recharge_coins: number; _user_id: string }
        Returns: undefined
      }
      purchase_vip: { Args: { _level: number }; Returns: Json }
      recompute_nova_p: { Args: { _user_id: string }; Returns: undefined }
      record_nova_p_monthly: { Args: { _user_id: string }; Returns: undefined }
      redeem_code: { Args: { _code: string }; Returns: Json }
      reject_relationship_request: {
        Args: { _request_id: string }
        Returns: undefined
      }
      remove_agency_host: {
        Args: { _agency_id: string; _agent_id: string; _host_id: string }
        Returns: undefined
      }
      send_gift_atomic: {
        Args: { _gift_name: string; _gold_amount: number; _receiver_id: string }
        Returns: Json
      }
      send_love_heart: { Args: never; Returns: Json }
      send_relationship_request: {
        Args: { _message?: string; _receiver_id: string; _type: string }
        Returns: string
      }
      set_agency_eligibility: {
        Args: { _eligible: boolean; _user_id: string }
        Returns: undefined
      }
      start_couple_seat: {
        Args: {
          _room_id: string
          _slot1: number
          _slot2: number
          _user1_id: string
          _user2_id: string
        }
        Returns: string
      }
      submit_usdt_recharge: {
        Args: {
          _amount_usdt: number
          _coins?: number
          _diamonds?: number
          _network?: string
          _transaction_id: string
        }
        Returns: Json
      }
      sweep_expired_perks: { Args: never; Returns: undefined }
      transfer_diamonds_to_user: {
        Args: { _amount: number; _recipient_user_id: string }
        Returns: Json
      }
      validate_mic_access: {
        Args: { _room_id: string; _slot: number; _user_id: string }
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
