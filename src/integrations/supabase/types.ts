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
