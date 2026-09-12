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
      api_usage_log: {
        Row: {
          api_credits: number
          api_model: string
          api_provider: string
          billed_usd: number
          call_kind: string
          cost_usd: number
          created_at: string
          error: string | null
          id: string
          input_tokens: number
          latency_ms: number | null
          markup: number
          output_tokens: number
          platform_fee: number
          rate_snapshot: Json | null
          status: string
          task_id: string | null
          user_id: string | null
        }
        Insert: {
          api_credits?: number
          api_model: string
          api_provider: string
          billed_usd: number
          call_kind?: string
          cost_usd: number
          created_at?: string
          error?: string | null
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          markup?: number
          output_tokens?: number
          platform_fee?: number
          rate_snapshot?: Json | null
          status?: string
          task_id?: string | null
          user_id?: string | null
        }
        Update: {
          api_credits?: number
          api_model?: string
          api_provider?: string
          billed_usd?: number
          call_kind?: string
          cost_usd?: number
          created_at?: string
          error?: string | null
          id?: string
          input_tokens?: number
          latency_ms?: number | null
          markup?: number
          output_tokens?: number
          platform_fee?: number
          rate_snapshot?: Json | null
          status?: string
          task_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_results: {
        Row: {
          cost_per_run: number | null
          created_at: string
          date: string
          details: Json | null
          id: string
          is_leader: boolean
          latency_ms: number | null
          model: string
          score: number
          task_type: string
        }
        Insert: {
          cost_per_run?: number | null
          created_at?: string
          date?: string
          details?: Json | null
          id?: string
          is_leader?: boolean
          latency_ms?: number | null
          model: string
          score: number
          task_type: string
        }
        Update: {
          cost_per_run?: number | null
          created_at?: string
          date?: string
          details?: Json | null
          id?: string
          is_leader?: boolean
          latency_ms?: number | null
          model?: string
          score?: number
          task_type?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          access_token_encrypted: string | null
          created_at: string
          id: string
          last_synced_at: string | null
          provider: string
          refresh_token_encrypted: string | null
          scopes: string[] | null
          status: string
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider: string
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          status?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          provider?: string
          refresh_token_encrypted?: string | null
          scopes?: string[] | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      cost_rates: {
        Row: {
          api_model: string
          api_provider: string
          input_rate: number
          output_rate: number
          source: string | null
          unit: string
          updated_at: string
        }
        Insert: {
          api_model: string
          api_provider: string
          input_rate?: number
          output_rate?: number
          source?: string | null
          unit?: string
          updated_at?: string
        }
        Update: {
          api_model?: string
          api_provider?: string
          input_rate?: number
          output_rate?: number
          source?: string | null
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      credit_balances: {
        Row: {
          balance_usd: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_usd?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_usd?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          amount_usd: number
          balance_after: number
          created_at: string
          id: string
          note: string | null
          stripe_payment_id: string | null
          task_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount_usd: number
          balance_after: number
          created_at?: string
          id?: string
          note?: string | null
          stripe_payment_id?: string | null
          task_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount_usd?: number
          balance_after?: number
          created_at?: string
          id?: string
          note?: string | null
          stripe_payment_id?: string | null
          task_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_pnl: {
        Row: {
          alerts: Json | null
          by_provider: Json | null
          date: string
          fixed_costs: number
          generated_at: string
          gross_margin: number | null
          gross_profit: number
          net_margin: number | null
          net_profit: number
          tasks: number
          total_cogs: number
          total_revenue: number
          users: number
        }
        Insert: {
          alerts?: Json | null
          by_provider?: Json | null
          date: string
          fixed_costs?: number
          generated_at?: string
          gross_margin?: number | null
          gross_profit?: number
          net_margin?: number | null
          net_profit?: number
          tasks?: number
          total_cogs?: number
          total_revenue?: number
          users?: number
        }
        Update: {
          alerts?: Json | null
          by_provider?: Json | null
          date?: string
          fixed_costs?: number
          generated_at?: string
          gross_margin?: number | null
          gross_profit?: number
          net_margin?: number | null
          net_profit?: number
          tasks?: number
          total_cogs?: number
          total_revenue?: number
          users?: number
        }
        Relationships: []
      }
      files: {
        Row: {
          created_at: string
          folder: string | null
          graphify_indexed: boolean
          graphify_node_count: number
          id: string
          name: string
          size_bytes: number | null
          storage_path: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          folder?: string | null
          graphify_indexed?: boolean
          graphify_node_count?: number
          id?: string
          name: string
          size_bytes?: number | null
          storage_path: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          folder?: string | null
          graphify_indexed?: boolean
          graphify_node_count?: number
          id?: string
          name?: string
          size_bytes?: number | null
          storage_path?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      free_credit_grants: {
        Row: {
          amount_usd: number
          email_key: string
          fingerprint: string | null
          granted_at: string
          user_id: string
        }
        Insert: {
          amount_usd: number
          email_key: string
          fingerprint?: string | null
          granted_at?: string
          user_id: string
        }
        Update: {
          amount_usd?: number
          email_key?: string
          fingerprint?: string | null
          granted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_edges: {
        Row: {
          confidence: number | null
          created_at: string
          from_node: string
          id: string
          origin: string
          relation: string
          to_node: string
          user_id: string
          weight: number
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          from_node: string
          id?: string
          origin: string
          relation: string
          to_node: string
          user_id: string
          weight?: number
        }
        Update: {
          confidence?: number | null
          created_at?: string
          from_node?: string
          id?: string
          origin?: string
          relation?: string
          to_node?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_edges_from_node_fkey"
            columns: ["from_node"]
            isOneToOne: false
            referencedRelation: "knowledge_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_edges_to_node_fkey"
            columns: ["to_node"]
            isOneToOne: false
            referencedRelation: "knowledge_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_nodes: {
        Row: {
          chunk_index: number | null
          content: string
          created_at: string
          embedding: string | null
          entities: string[]
          id: string
          node_type: string
          parent_node: string | null
          source_id: string | null
          source_type: string | null
          tags: string[]
          title: string | null
          token_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chunk_index?: number | null
          content: string
          created_at?: string
          embedding?: string | null
          entities?: string[]
          id?: string
          node_type: string
          parent_node?: string | null
          source_id?: string | null
          source_type?: string | null
          tags?: string[]
          title?: string | null
          token_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chunk_index?: number | null
          content?: string
          created_at?: string
          embedding?: string | null
          entities?: string[]
          id?: string
          node_type?: string
          parent_node?: string | null
          source_id?: string | null
          source_type?: string | null
          tags?: string[]
          title?: string | null
          token_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_nodes_parent_node_fkey"
            columns: ["parent_node"]
            isOneToOne: false
            referencedRelation: "knowledge_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      mini_apps: {
        Row: {
          category: string | null
          config_schema: Json
          created_at: string
          description: string | null
          est_credit_cost: number
          icon: string | null
          id: string
          is_published: boolean
          name: string
          slug: string
          sort_order: number
          workflow_def: Json
        }
        Insert: {
          category?: string | null
          config_schema?: Json
          created_at?: string
          description?: string | null
          est_credit_cost?: number
          icon?: string | null
          id?: string
          is_published?: boolean
          name: string
          slug: string
          sort_order?: number
          workflow_def?: Json
        }
        Update: {
          category?: string | null
          config_schema?: Json
          created_at?: string
          description?: string | null
          est_credit_cost?: number
          icon?: string | null
          id?: string
          is_published?: boolean
          name?: string
          slug?: string
          sort_order?: number
          workflow_def?: Json
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          onboarded_at: string | null
          plan: string
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          onboarded_at?: string | null
          plan?: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          onboarded_at?: string | null
          plan?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      routing_weights: {
        Row: {
          is_leader: boolean
          model: string
          task_type: string
          updated_at: string
          weight: number
        }
        Insert: {
          is_leader?: boolean
          model: string
          task_type: string
          updated_at?: string
          weight?: number
        }
        Update: {
          is_leader?: boolean
          model?: string
          task_type?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          id: string
          processed_at: string
          type: string
        }
        Insert: {
          id: string
          processed_at?: string
          type: string
        }
        Update: {
          id?: string
          processed_at?: string
          type?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          app_instance_id: string | null
          briefing: Json
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          models_used: string[]
          result: Json | null
          status: string
          task_type: string | null
          total_billed: number
          total_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          app_instance_id?: string | null
          briefing?: Json
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          models_used?: string[]
          result?: Json | null
          status?: string
          task_type?: string | null
          total_billed?: number
          total_cost?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          app_instance_id?: string | null
          briefing?: Json
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          models_used?: string[]
          result?: Json | null
          status?: string
          task_type?: string | null
          total_billed?: number
          total_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_app_instance_id_fkey"
            columns: ["app_instance_id"]
            isOneToOne: false
            referencedRelation: "user_app_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      user_app_instances: {
        Row: {
          config: Json
          created_at: string
          id: string
          last_run_at: string | null
          mini_app_id: string
          name: string | null
          next_run_at: string | null
          output_target: string
          run_count: number
          schedule: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          last_run_at?: string | null
          mini_app_id: string
          name?: string | null
          next_run_at?: string | null
          output_target?: string
          run_count?: number
          schedule?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          last_run_at?: string | null
          mini_app_id?: string
          name?: string | null
          next_run_at?: string | null
          output_target?: string
          run_count?: number
          schedule?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_app_instances_mini_app_id_fkey"
            columns: ["mini_app_id"]
            isOneToOne: false
            referencedRelation: "mini_apps"
            referencedColumns: ["id"]
          },
        ]
      }
      user_rows: {
        Row: {
          created_at: string
          data: Json
          id: string
          table_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          table_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          table_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_rows_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "user_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tables: {
        Row: {
          columns: Json
          created_at: string
          icon: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          columns?: Json
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          columns?: Json
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      credit_apply: {
        Args: {
          p_amount: number
          p_note?: string
          p_stripe_payment_id?: string
          p_task_id?: string
          p_type: string
          p_user_id: string
        }
        Returns: number
      }
      credit_balance: { Args: { p_user_id: string }; Returns: number }
      grant_free_credit: {
        Args: { p_fingerprint?: string; p_user_id: string }
        Returns: number
      }
      graph_expand: {
        Args: {
          p_hops?: number
          p_limit?: number
          p_seed_ids: string[]
          p_user_id: string
        }
        Returns: {
          hop: number
          id: string
          path_weight: number
          via_origin: string
          via_relation: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      match_nodes: {
        Args: {
          p_k?: number
          p_query: string
          p_types?: string[]
          p_user_id: string
        }
        Returns: {
          content: string
          created_at: string
          id: string
          node_type: string
          parent_node: string
          similarity: number
          source_id: string
          source_type: string
          title: string
          token_count: number
        }[]
      }
      normalize_email: { Args: { p_email: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
