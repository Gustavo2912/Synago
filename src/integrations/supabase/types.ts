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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      donations: {
        Row: {
          amount: number
          created_at: string
          currency: string
          designation: string | null
          donor_id: string
          external_payment_id: string | null
          fee: number | null
          id: string
          net_amount: number | null
          notes: string | null
          organization_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          pledge_id: string | null
          receipt_number: string | null
          receipt_sent: boolean
          status: Database["public"]["Enums"]["donation_status"]
          type: Database["public"]["Enums"]["donation_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          designation?: string | null
          donor_id: string
          external_payment_id?: string | null
          fee?: number | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          organization_id?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          pledge_id?: string | null
          receipt_number?: string | null
          receipt_sent?: boolean
          status?: Database["public"]["Enums"]["donation_status"]
          type?: Database["public"]["Enums"]["donation_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          designation?: string | null
          donor_id?: string
          external_payment_id?: string | null
          fee?: number | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          organization_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          pledge_id?: string | null
          receipt_number?: string | null
          receipt_sent?: boolean
          status?: Database["public"]["Enums"]["donation_status"]
          type?: Database["public"]["Enums"]["donation_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donations_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_pledge_id_fkey"
            columns: ["pledge_id"]
            isOneToOne: false
            referencedRelation: "pledges"
            referencedColumns: ["id"]
          },
        ]
      }
      donors: {
        Row: {
          address_city: string | null
          communication_opt_out: boolean
          created_at: string
          created_by_user_id: string | null
          display_name: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          merge_group_id: string | null
          name: string
          notes: string | null
          organization_id: string | null
          phone: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          communication_opt_out?: boolean
          created_at?: string
          created_by_user_id?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          merge_group_id?: string | null
          name: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          communication_opt_out?: boolean
          created_at?: string
          created_by_user_id?: string | null
          display_name?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          merge_group_id?: string | null
          name?: string
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          accent_color: string | null
          address: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          font_family: string | null
          id: string
          logo_url: string | null
          member_count: number
          name: string
          primary_color: string | null
          secondary_color: string | null
          state: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          zip: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          font_family?: string | null
          id?: string
          logo_url?: string | null
          member_count?: number
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          zip?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          font_family?: string | null
          id?: string
          logo_url?: string | null
          member_count?: number
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      pledges: {
        Row: {
          amount_paid: number
          balance_owed: number | null
          created_at: string
          donor_id: string
          expected_completion_date: string | null
          frequency: string
          id: string
          last_reminder_sent: string | null
          notes: string | null
          organization_id: string | null
          reminder_enabled: boolean
          start_date: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          balance_owed?: number | null
          created_at?: string
          donor_id: string
          expected_completion_date?: string | null
          frequency?: string
          id?: string
          last_reminder_sent?: string | null
          notes?: string | null
          organization_id?: string | null
          reminder_enabled?: boolean
          start_date?: string
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          balance_owed?: number | null
          created_at?: string
          donor_id?: string
          expected_completion_date?: string | null
          frequency?: string
          id?: string
          last_reminder_sent?: string | null
          notes?: string | null
          organization_id?: string | null
          reminder_enabled?: boolean
          start_date?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pledges_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pledges_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          default_currency: string
          id: string
          organization_id: string | null
          receipt_format: string
          surcharge_enabled: boolean
          surcharge_fixed: number | null
          surcharge_percent: number
          updated_at: string
          zelle_email_or_phone: string | null
          zelle_name: string | null
          zelle_note: string | null
        }
        Insert: {
          created_at?: string
          default_currency?: string
          id?: string
          organization_id?: string | null
          receipt_format?: string
          surcharge_enabled?: boolean
          surcharge_fixed?: number | null
          surcharge_percent?: number
          updated_at?: string
          zelle_email_or_phone?: string | null
          zelle_name?: string | null
          zelle_note?: string | null
        }
        Update: {
          created_at?: string
          default_currency?: string
          id?: string
          organization_id?: string | null
          receipt_format?: string
          surcharge_enabled?: boolean
          surcharge_fixed?: number | null
          surcharge_percent?: number
          updated_at?: string
          zelle_email_or_phone?: string | null
          zelle_name?: string | null
          zelle_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      yahrzeits: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          deceased_name: string
          donation_text: string | null
          donor_id: string
          hebrew_date: string
          id: string
          include_donation_request: boolean
          include_service_times: boolean
          last_reminder_sent: string | null
          maariv_time: string | null
          mincha_time: string | null
          notes: string | null
          organization_id: string | null
          relationship: string | null
          reminder_enabled: boolean
          secular_date: string
          shacharit_time: string | null
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deceased_name: string
          donation_text?: string | null
          donor_id: string
          hebrew_date: string
          id?: string
          include_donation_request?: boolean
          include_service_times?: boolean
          last_reminder_sent?: string | null
          maariv_time?: string | null
          mincha_time?: string | null
          notes?: string | null
          organization_id?: string | null
          relationship?: string | null
          reminder_enabled?: boolean
          secular_date: string
          shacharit_time?: string | null
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          deceased_name?: string
          donation_text?: string | null
          donor_id?: string
          hebrew_date?: string
          id?: string
          include_donation_request?: boolean
          include_service_times?: boolean
          last_reminder_sent?: string | null
          maariv_time?: string | null
          mincha_time?: string | null
          notes?: string | null
          organization_id?: string | null
          relationship?: string | null
          reminder_enabled?: boolean
          secular_date?: string
          shacharit_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "yahrzeits_donor_id_fkey"
            columns: ["donor_id"]
            isOneToOne: false
            referencedRelation: "donors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_receipt_number: { Args: never; Returns: string }
      get_user_organization: { Args: { _user_id: string }; Returns: string }
      has_org_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "super_admin"
        | "synagogue_admin"
        | "staff"
        | "member"
      donation_status:
        | "Pending"
        | "Succeeded"
        | "Failed"
        | "Refunded"
        | "Disputed"
      donation_type: "Regular" | "Nedarim" | "Aliyot" | "Yahrzeit" | "Other"
      payment_method:
        | "Cash"
        | "Check"
        | "Transfer"
        | "CreditCard"
        | "Zelle"
        | "Other"
      subscription_tier: "tier_1" | "tier_2" | "tier_3" | "tier_4"
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
      app_role: [
        "admin",
        "user",
        "super_admin",
        "synagogue_admin",
        "staff",
        "member",
      ],
      donation_status: [
        "Pending",
        "Succeeded",
        "Failed",
        "Refunded",
        "Disputed",
      ],
      donation_type: ["Regular", "Nedarim", "Aliyot", "Yahrzeit", "Other"],
      payment_method: [
        "Cash",
        "Check",
        "Transfer",
        "CreditCard",
        "Zelle",
        "Other",
      ],
      subscription_tier: ["tier_1", "tier_2", "tier_3", "tier_4"],
    },
  },
} as const
