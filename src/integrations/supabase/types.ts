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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_memory: {
        Row: {
          bot_id: string
          created_at: string
          id: string
          key: string
          namespace: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          bot_id: string
          created_at?: string
          id?: string
          key: string
          namespace?: string
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          bot_id?: string
          created_at?: string
          id?: string
          key?: string
          namespace?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "agent_memory_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          bot_id: string
          completed_at: string | null
          id: string
          started_at: string
          status: string
          steps: Json | null
          task_id: string
          token_usage: Json | null
          user_id: string
        }
        Insert: {
          bot_id: string
          completed_at?: string | null
          id?: string
          started_at?: string
          status?: string
          steps?: Json | null
          task_id: string
          token_usage?: Json | null
          user_id: string
        }
        Update: {
          bot_id?: string
          completed_at?: string | null
          id?: string
          started_at?: string
          status?: string
          steps?: Json | null
          task_id?: string
          token_usage?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tasks: {
        Row: {
          bot_id: string
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          input_payload: Json | null
          instruction: string
          lane: string
          max_steps: number
          parent_task_id: string | null
          result: Json | null
          spawned_by_bot_id: string | null
          started_at: string | null
          status: string
          steps: Json | null
          user_id: string
        }
        Insert: {
          bot_id: string
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          input_payload?: Json | null
          instruction: string
          lane?: string
          max_steps?: number
          parent_task_id?: string | null
          result?: Json | null
          spawned_by_bot_id?: string | null
          started_at?: string | null
          status?: string
          steps?: Json | null
          user_id: string
        }
        Update: {
          bot_id?: string
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          input_payload?: Json | null
          instruction?: string
          lane?: string
          max_steps?: number
          parent_task_id?: string | null
          result?: Json | null
          spawned_by_bot_id?: string | null
          started_at?: string | null
          status?: string
          steps?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_registry"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_parent_task_id_fkey"
            columns: ["parent_task_id"]
            isOneToOne: false
            referencedRelation: "agent_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_spawned_by_bot_id_fkey"
            columns: ["spawned_by_bot_id"]
            isOneToOne: false
            referencedRelation: "bot_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_conversations: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_memories: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_shares: {
        Row: {
          avg_cost: number
          created_at: string
          id: string
          listing_id: string
          shares: number
          user_id: string
        }
        Insert: {
          avg_cost?: number
          created_at?: string
          id?: string
          listing_id: string
          shares?: number
          user_id: string
        }
        Update: {
          avg_cost?: number
          created_at?: string
          id?: string
          listing_id?: string
          shares?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_shares_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "forge_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      bet_markets: {
        Row: {
          away_team: string | null
          category: string
          commence_time: string | null
          created_at: string
          creation_cost: number
          creator_id: string
          expiry: string | null
          external_id: string | null
          home_team: string | null
          id: string
          listing_id: string | null
          no_pool: number
          odds_data: Json | null
          question: string
          source: string
          sport_key: string | null
          sport_title: string | null
          status: string
          yes_pool: number
        }
        Insert: {
          away_team?: string | null
          category?: string
          commence_time?: string | null
          created_at?: string
          creation_cost?: number
          creator_id: string
          expiry?: string | null
          external_id?: string | null
          home_team?: string | null
          id?: string
          listing_id?: string | null
          no_pool?: number
          odds_data?: Json | null
          question: string
          source?: string
          sport_key?: string | null
          sport_title?: string | null
          status?: string
          yes_pool?: number
        }
        Update: {
          away_team?: string | null
          category?: string
          commence_time?: string | null
          created_at?: string
          creation_cost?: number
          creator_id?: string
          expiry?: string | null
          external_id?: string | null
          home_team?: string | null
          id?: string
          listing_id?: string | null
          no_pool?: number
          odds_data?: Json | null
          question?: string
          source?: string
          sport_key?: string | null
          sport_title?: string | null
          status?: string
          yes_pool?: number
        }
        Relationships: [
          {
            foreignKeyName: "bet_markets_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "forge_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      bets: {
        Row: {
          amount: number
          claimed: boolean
          created_at: string
          id: string
          market_id: string
          side: string
          user_id: string
        }
        Insert: {
          amount: number
          claimed?: boolean
          created_at?: string
          id?: string
          market_id: string
          side: string
          user_id: string
        }
        Update: {
          amount?: number
          claimed?: boolean
          created_at?: string
          id?: string
          market_id?: string
          side?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bets_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "bet_markets"
            referencedColumns: ["id"]
          },
        ]
      }
      board_tasks: {
        Row: {
          column_name: string
          created_at: string
          eta: number
          id: string
          name: string
          node: string
          priority: string
          progress: number
          user_id: string
        }
        Insert: {
          column_name?: string
          created_at?: string
          eta?: number
          id?: string
          name: string
          node?: string
          priority?: string
          progress?: number
          user_id: string
        }
        Update: {
          column_name?: string
          created_at?: string
          eta?: number
          id?: string
          name?: string
          node?: string
          priority?: string
          progress?: number
          user_id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          created_at: string
          end_time: string
          id: string
          priority: string
          purpose: string
          resource: string
          start_time: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          priority?: string
          purpose?: string
          resource: string
          start_time: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          priority?: string
          purpose?: string
          resource?: string
          start_time?: string
          user_id?: string
        }
        Relationships: []
      }
      bot_api_keys: {
        Row: {
          bot_id: string
          created_at: string
          expires_at: string | null
          id: string
          is_revoked: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          user_id: string
        }
        Insert: {
          bot_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_revoked?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          user_id: string
        }
        Update: {
          bot_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_revoked?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_api_keys_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_audit_log: {
        Row: {
          args: Json
          bot_id: string
          created_at: string
          id: string
          result_summary: string | null
          status: string
          tool_name: string
          user_id: string
        }
        Insert: {
          args?: Json
          bot_id: string
          created_at?: string
          id?: string
          result_summary?: string | null
          status?: string
          tool_name: string
          user_id: string
        }
        Update: {
          args?: Json
          bot_id?: string
          created_at?: string
          id?: string
          result_summary?: string | null
          status?: string
          tool_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_audit_log_bot_id_fkey"
            columns: ["bot_id"]
            isOneToOne: false
            referencedRelation: "bot_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_registry: {
        Row: {
          bot_type: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          permissions: Json
          rate_limit: number
          schedule: string | null
          system_prompt: string
          trigger_config: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bot_type?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          permissions?: Json
          rate_limit?: number
          schedule?: string | null
          system_prompt?: string
          trigger_config?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bot_type?: string
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          permissions?: Json
          rate_limit?: number
          schedule?: string | null
          system_prompt?: string
          trigger_config?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          color: string
          created_at: string
          description: string | null
          end_time: string | null
          id: string
          recurring: string | null
          reminder_minutes: number | null
          start_time: string
          title: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          recurring?: string | null
          reminder_minutes?: number | null
          start_time: string
          title: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          recurring?: string | null
          reminder_minutes?: number | null
          start_time?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          channel: string
          content: string
          created_at: string
          id: string
          user_id: string
          username: string
        }
        Insert: {
          channel: string
          content: string
          created_at?: string
          id?: string
          user_id: string
          username: string
        }
        Update: {
          channel?: string
          content?: string
          created_at?: string
          id?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      chat_presence: {
        Row: {
          channel: string
          id: string
          last_seen: string
          user_id: string
          username: string
        }
        Insert: {
          channel: string
          id?: string
          last_seen?: string
          user_id: string
          username: string
        }
        Update: {
          channel?: string
          id?: string
          last_seen?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      cloud_hooks: {
        Row: {
          action_config: Json
          action_type: string
          created_at: string
          enabled: boolean
          id: string
          name: string
          trigger_event: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          trigger_event: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          created_at?: string
          enabled?: boolean
          id?: string
          name?: string
          trigger_event?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      escrow_deals: {
        Row: {
          amount: number
          counterparty_id: string
          created_at: string
          creator_id: string
          description: string | null
          id: string
          resolved_at: string | null
          status: string
          token_type: string
        }
        Insert: {
          amount: number
          counterparty_id: string
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          resolved_at?: string | null
          status?: string
          token_type: string
        }
        Update: {
          amount?: number
          counterparty_id?: string
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          resolved_at?: string | null
          status?: string
          token_type?: string
        }
        Relationships: []
      }
      file_metadata: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          folder: string
          id: string
          mime_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          folder?: string
          id?: string
          mime_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          folder?: string
          id?: string
          mime_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      forge_listings: {
        Row: {
          category: string
          code: string
          created_at: string
          creator_id: string
          description: string
          icon: string
          id: string
          installs: number
          ipo_active: boolean
          ipo_raised: number
          ipo_target: number
          is_listed: boolean
          name: string
          price: number
          revenue: number
          share_price: number
          total_shares: number
          updated_at: string
          version: number
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          creator_id: string
          description?: string
          icon?: string
          id?: string
          installs?: number
          ipo_active?: boolean
          ipo_raised?: number
          ipo_target?: number
          is_listed?: boolean
          name: string
          price?: number
          revenue?: number
          share_price?: number
          total_shares?: number
          updated_at?: string
          version?: number
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          creator_id?: string
          description?: string
          icon?: string
          id?: string
          installs?: number
          ipo_active?: boolean
          ipo_raised?: number
          ipo_target?: number
          is_listed?: boolean
          name?: string
          price?: number
          revenue?: number
          share_price?: number
          total_shares?: number
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      generated_media: {
        Row: {
          created_at: string
          id: string
          media_type: string
          prompt: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type?: string
          prompt?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          prompt?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      github_events: {
        Row: {
          action: string | null
          created_at: string
          event_type: string
          id: string
          installation_id: number
          payload: Json
          repository: string | null
          sender: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string
          event_type: string
          id?: string
          installation_id?: number
          payload?: Json
          repository?: string | null
          sender?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string
          event_type?: string
          id?: string
          installation_id?: number
          payload?: Json
          repository?: string | null
          sender?: string | null
        }
        Relationships: []
      }
      github_installations: {
        Row: {
          access_token: string | null
          account_login: string
          account_type: string
          created_at: string
          id: string
          installation_id: number
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          account_login?: string
          account_type?: string
          created_at?: string
          id?: string
          installation_id: number
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          account_login?: string
          account_type?: string
          created_at?: string
          id?: string
          installation_id?: number
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      share_orders: {
        Row: {
          created_at: string
          filled: number
          id: string
          listing_id: string
          order_type: string
          price: number
          shares: number
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filled?: number
          id?: string
          listing_id: string
          order_type: string
          price: number
          shares: number
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filled?: number
          id?: string
          listing_id?: string
          order_type?: string
          price?: number
          shares?: number
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "forge_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      social_comments: {
        Row: {
          ai_generated: boolean
          author: string
          content: string
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          ai_generated?: boolean
          author: string
          content: string
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          ai_generated?: boolean
          author?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_likes: {
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
            foreignKeyName: "social_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          ai_generated: boolean
          author: string
          content: string
          created_at: string
          id: string
          likes: number
          role: string
          user_id: string
        }
        Insert: {
          ai_generated?: boolean
          author: string
          content: string
          created_at?: string
          id?: string
          likes?: number
          role?: string
          user_id: string
        }
        Update: {
          ai_generated?: boolean
          author?: string
          content?: string
          created_at?: string
          id?: string
          likes?: number
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          escrow_id: string | null
          from_wallet_id: string | null
          id: string
          to_wallet_id: string | null
          token_type: string
          tx_type: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          escrow_id?: string | null
          from_wallet_id?: string | null
          id?: string
          to_wallet_id?: string | null
          token_type: string
          tx_type: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          escrow_id?: string | null
          from_wallet_id?: string | null
          id?: string
          to_wallet_id?: string | null
          token_type?: string
          tx_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_escrow_id_fkey"
            columns: ["escrow_id"]
            isOneToOne: false
            referencedRelation: "escrow_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_from_wallet_id_fkey"
            columns: ["from_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_wallet_id_fkey"
            columns: ["to_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          target: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ai_keys: {
        Row: {
          created_at: string
          encrypted_key: string
          id: string
          model: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_key: string
          id?: string
          model?: string | null
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_key?: string
          id?: string
          model?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_data: {
        Row: {
          id: string
          key: string
          updated_at: string
          user_id: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          user_id: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          user_id?: string
          value?: Json
        }
        Relationships: []
      }
      user_emails: {
        Row: {
          ai_generated: boolean
          body: string
          created_at: string
          folder: string
          from_address: string
          id: string
          read: boolean
          subject: string
          to_address: string
          user_id: string
        }
        Insert: {
          ai_generated?: boolean
          body?: string
          created_at?: string
          folder?: string
          from_address: string
          id?: string
          read?: boolean
          subject: string
          to_address?: string
          user_id: string
        }
        Update: {
          ai_generated?: boolean
          body?: string
          created_at?: string
          folder?: string
          from_address?: string
          id?: string
          read?: boolean
          subject?: string
          to_address?: string
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vault_holdings: {
        Row: {
          avg_cost: number
          category: string
          created_at: string
          id: string
          name: string
          quantity: number
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_cost?: number
          category?: string
          created_at?: string
          id?: string
          name: string
          quantity?: number
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_cost?: number
          category?: string
          created_at?: string
          id?: string
          name?: string
          quantity?: number
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vault_transactions: {
        Row: {
          created_at: string
          id: string
          price: number
          quantity: number
          symbol: string
          tx_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          price: number
          quantity: number
          symbol: string
          tx_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          price?: number
          quantity?: number
          symbol?: string
          tx_type?: string
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      wallets: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          ix_balance: number
          os_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          ix_balance?: number
          os_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          ix_balance?: number
          os_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_booking_conflict: {
        Args: {
          p_end: string
          p_exclude_id?: string
          p_resource: string
          p_start: string
        }
        Returns: boolean
      }
      cleanup_old_activity: { Args: never; Returns: undefined }
      get_waitlist_count: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
