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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          active: boolean
          created_at: string
          description: string
          duration_seconds: number
          id: string
          reward: number
          title: string
          url: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          duration_seconds?: number
          id?: string
          reward: number
          title: string
          url?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          duration_seconds?: number
          id?: string
          reward?: number
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      activity_sessions: {
        Row: {
          activity_id: string
          claim_date: string | null
          claimed_at: string | null
          id: string
          started_at: string
          user_id: string
        }
        Insert: {
          activity_id: string
          claim_date?: string | null
          claimed_at?: string | null
          id?: string
          started_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string
          claim_date?: string | null
          claimed_at?: string | null
          id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_sessions_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          bonus_base: number
          bonus_enabled: boolean
          bonus_max: number
          id: boolean
          min_withdrawal: number
          referral_reward: number
          streak_days: number
          updated_at: string
        }
        Insert: {
          bonus_base?: number
          bonus_enabled?: boolean
          bonus_max?: number
          id?: boolean
          min_withdrawal?: number
          referral_reward?: number
          streak_days?: number
          updated_at?: string
        }
        Update: {
          bonus_base?: number
          bonus_enabled?: boolean
          bonus_max?: number
          id?: boolean
          min_withdrawal?: number
          referral_reward?: number
          streak_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      daily_claims: {
        Row: {
          amount: number
          claimed_at: string
          id: string
          streak_day: number
          user_id: string
        }
        Insert: {
          amount: number
          claimed_at?: string
          id?: string
          streak_day: number
          user_id: string
        }
        Update: {
          amount?: number
          claimed_at?: string
          id?: string
          streak_day?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          ref_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string
          id?: string
          kind: Database["public"]["Enums"]["ledger_kind"]
          ref_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["ledger_kind"]
          ref_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          title: string
          user_id: string | null
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          title: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          member_id: number
          referral_code: string
          referred_by: string | null
          username: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string
          id: string
          member_id?: number
          referral_code: string
          referred_by?: string | null
          username: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          member_id?: number
          referral_code?: string
          referred_by?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      withdrawals: {
        Row: {
          admin_note: string | null
          amount: number
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string
          phone: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          telegram_state: string
          tx_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key: string
          phone: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          telegram_state?: string
          tx_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          phone?: string
          status?: Database["public"]["Enums"]["withdrawal_status"]
          telegram_state?: string
          tx_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_adjust_balance: {
        Args: { _amount: number; _note: string; _user_id: string }
        Returns: undefined
      }
      admin_list_users: {
        Args: never
        Returns: {
          balance: number
          created_at: string
          email: string
          full_name: string
          id: string
          is_admin: boolean
          member_id: number
          referrals: number
          total_earned: number
          username: string
        }[]
      }
      admin_update_withdrawal: {
        Args: {
          _id: string
          _note?: string
          _status: Database["public"]["Enums"]["withdrawal_status"]
        }
        Returns: {
          admin_note: string | null
          amount: number
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string
          phone: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          telegram_state: string
          tx_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      bonus_amount: { Args: { _day: number }; Returns: number }
      claim_activity: { Args: { _session_id: string }; Returns: Json }
      claim_daily_bonus: { Args: never; Returns: Json }
      get_activities_today: {
        Args: never
        Returns: {
          claimed_today: boolean
          description: string
          duration_seconds: number
          id: string
          reward: number
          title: string
          url: string
        }[]
      }
      get_my_dashboard: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      my_referrals: {
        Args: never
        Returns: {
          created_at: string
          full_name: string
          username: string
        }[]
      }
      nairobi_today_start: { Args: never; Returns: string }
      normalize_ke_phone: { Args: { _phone: string }; Returns: string }
      request_withdrawal: {
        Args: { _amount: number; _key: string; _phone: string }
        Returns: {
          admin_note: string | null
          amount: number
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string
          phone: string
          status: Database["public"]["Enums"]["withdrawal_status"]
          telegram_state: string
          tx_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_activity: { Args: { _activity_id: string }; Returns: Json }
      system_cancel_withdrawal: { Args: { _id: string }; Returns: undefined }
      update_my_name: { Args: { _full_name: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
      ledger_kind:
        | "daily_bonus"
        | "activity"
        | "referral"
        | "withdrawal"
        | "refund"
        | "adjustment"
      withdrawal_status:
        | "pending"
        | "approved"
        | "completed"
        | "rejected"
        | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      ledger_kind: [
        "daily_bonus",
        "activity",
        "referral",
        "withdrawal",
        "refund",
        "adjustment",
      ],
      withdrawal_status: [
        "pending",
        "approved",
        "completed",
        "rejected",
        "cancelled",
      ],
    },
  },
} as const
