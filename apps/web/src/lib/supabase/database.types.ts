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
      ai_messages: {
        Row: {
          billed_usd: number
          content: string
          cost_usd: number
          created_at: string
          id: string
          meta: Json | null
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          billed_usd?: number
          content: string
          cost_usd?: number
          created_at?: string
          id?: string
          meta?: Json | null
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          billed_usd?: number
          content?: string
          cost_usd?: number
          created_at?: string
          id?: string
          meta?: Json | null
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ai_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_threads: {
        Row: {
          app_instance_ids: string[]
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          app_instance_ids?: string[]
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          app_instance_ids?: string[]
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      calendar_items: {
        Row: {
          app_instance_id: string | null
          created_at: string
          date: string
          done: boolean
          id: string
          kind: string
          note: string | null
          task_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          app_instance_id?: string | null
          created_at?: string
          date: string
          done?: boolean
          id?: string
          kind?: string
          note?: string | null
          task_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          app_instance_id?: string | null
          created_at?: string
          date?: string
          done?: boolean
          id?: string
          kind?: string
          note?: string | null
          task_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_items_app_instance_id_fkey"
            columns: ["app_instance_id"]
            isOneToOne: false
            referencedRelation: "user_app_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_items_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
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
          autonomy_level: number
          brief_template: string | null
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
          tags: string[]
          who_for: string | null
          workflow_def: Json
        }
        Insert: {
          autonomy_level?: number
          brief_template?: string | null
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
          tags?: string[]
          who_for?: string | null
          workflow_def?: Json
        }
        Update: {
          autonomy_level?: number
          brief_template?: string | null
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
          tags?: string[]
          who_for?: string | null
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
      clip_run_steps: {
        Row: {
          agent: string
          cost_usd: number
          created_at: string
          id: string
          input: Json | null
          model_used: string | null
          output: Json | null
          run_id: string
          status: string
          tokens_in: number
          tokens_out: number
          user_id: string
        }
        Insert: {
          agent: string
          cost_usd?: number
          created_at?: string
          id?: string
          input?: Json | null
          model_used?: string | null
          output?: Json | null
          run_id: string
          status?: string
          tokens_in?: number
          tokens_out?: number
          user_id: string
        }
        Update: {
          agent?: string
          cost_usd?: number
          created_at?: string
          id?: string
          input?: Json | null
          model_used?: string | null
          output?: Json | null
          run_id?: string
          status?: string
          tokens_in?: number
          tokens_out?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clip_run_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "clip_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      clip_runs: {
        Row: {
          clips: Json | null
          created_at: string
          focus_prompt: string | null
          id: string
          num_clips_requested: string | null
          source_duration_sec: number | null
          source_file_path: string | null
          source_url: string | null
          status: string
          target: string | null
          task_id: string | null
          total_cost: number
          user_id: string
          vibe: string | null
        }
        Insert: {
          clips?: Json | null
          created_at?: string
          focus_prompt?: string | null
          id?: string
          num_clips_requested?: string | null
          source_duration_sec?: number | null
          source_file_path?: string | null
          source_url?: string | null
          status?: string
          target?: string | null
          task_id?: string | null
          total_cost?: number
          user_id: string
          vibe?: string | null
        }
        Update: {
          clips?: Json | null
          created_at?: string
          focus_prompt?: string | null
          id?: string
          num_clips_requested?: string | null
          source_duration_sec?: number | null
          source_file_path?: string | null
          source_url?: string | null
          status?: string
          target?: string | null
          task_id?: string | null
          total_cost?: number
          user_id?: string
          vibe?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clip_runs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_run_steps: {
        Row: {
          agent: string
          cost_usd: number
          created_at: string
          id: string
          input: Json | null
          model_used: string | null
          output: Json | null
          run_id: string
          status: string
          tokens_in: number
          tokens_out: number
          user_id: string
        }
        Insert: {
          agent: string
          cost_usd?: number
          created_at?: string
          id?: string
          input?: Json | null
          model_used?: string | null
          output?: Json | null
          run_id: string
          status?: string
          tokens_in?: number
          tokens_out?: number
          user_id: string
        }
        Update: {
          agent?: string
          cost_usd?: number
          created_at?: string
          id?: string
          input?: Json | null
          model_used?: string | null
          output?: Json | null
          run_id?: string
          status?: string
          tokens_in?: number
          tokens_out?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposal_run_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "proposal_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_runs: {
        Row: {
          bidder_id: string | null
          compliance_matrix: Json | null
          created_at: string
          deadline: string | null
          flags: Json | null
          id: string
          proposal: Json | null
          rfp_file_path: string | null
          status: string
          task_id: string | null
          tone: string | null
          total_cost: number
          user_id: string
          win_themes: Json | null
        }
        Insert: {
          bidder_id?: string | null
          compliance_matrix?: Json | null
          created_at?: string
          deadline?: string | null
          flags?: Json | null
          id?: string
          proposal?: Json | null
          rfp_file_path?: string | null
          status?: string
          task_id?: string | null
          tone?: string | null
          total_cost?: number
          user_id: string
          win_themes?: Json | null
        }
        Update: {
          bidder_id?: string | null
          compliance_matrix?: Json | null
          created_at?: string
          deadline?: string | null
          flags?: Json | null
          id?: string
          proposal?: Json | null
          rfp_file_path?: string | null
          status?: string
          task_id?: string | null
          tone?: string | null
          total_cost?: number
          user_id?: string
          win_themes?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_runs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      public_benchmark_entries: {
        Row: {
          benchmark_id: string
          created_at: string
          id: string
          label_revealed: boolean
          output: Json | null
          path: string
          published: boolean
        }
        Insert: {
          benchmark_id: string
          created_at?: string
          id?: string
          label_revealed?: boolean
          output?: Json | null
          path: string
          published?: boolean
        }
        Update: {
          benchmark_id?: string
          created_at?: string
          id?: string
          label_revealed?: boolean
          output?: Json | null
          path?: string
          published?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "public_benchmark_entries_benchmark_id_fkey"
            columns: ["benchmark_id"]
            isOneToOne: false
            referencedRelation: "public_benchmarks"
            referencedColumns: ["id"]
          },
        ]
      }
      public_benchmark_scores: {
        Row: {
          accuracy: number | null
          actionability: number | null
          benchmark_id: string
          completeness: number | null
          created_at: string
          depth: number | null
          entry_id: string
          id: string
          judge: string
          judge_kind: string
          overall: number | null
          published: boolean
        }
        Insert: {
          accuracy?: number | null
          actionability?: number | null
          benchmark_id: string
          completeness?: number | null
          created_at?: string
          depth?: number | null
          entry_id: string
          id?: string
          judge: string
          judge_kind: string
          overall?: number | null
          published?: boolean
        }
        Update: {
          accuracy?: number | null
          actionability?: number | null
          benchmark_id?: string
          completeness?: number | null
          created_at?: string
          depth?: number | null
          entry_id?: string
          id?: string
          judge?: string
          judge_kind?: string
          overall?: number | null
          published?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "public_benchmark_scores_benchmark_id_fkey"
            columns: ["benchmark_id"]
            isOneToOne: false
            referencedRelation: "public_benchmarks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_benchmark_scores_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "public_benchmark_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      public_benchmarks: {
        Row: {
          created_at: string
          date: string
          id: string
          is_mock: boolean
          methodology: string
          published: boolean
          status: string
          task_prompt: string
          task_type: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          is_mock?: boolean
          methodology?: string
          published?: boolean
          status?: string
          task_prompt: string
          task_type: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_mock?: boolean
          methodology?: string
          published?: boolean
          status?: string
          task_prompt?: string
          task_type?: string
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
      seo_run_steps: {
        Row: {
          agent: string
          cost_usd: number
          created_at: string
          id: string
          input: Json | null
          model_used: string | null
          output: Json | null
          run_id: string
          status: string
          tokens_in: number
          tokens_out: number
          user_id: string
        }
        Insert: {
          agent: string
          cost_usd?: number
          created_at?: string
          id?: string
          input?: Json | null
          model_used?: string | null
          output?: Json | null
          run_id: string
          status?: string
          tokens_in?: number
          tokens_out?: number
          user_id: string
        }
        Update: {
          agent?: string
          cost_usd?: number
          created_at?: string
          id?: string
          input?: Json | null
          model_used?: string | null
          output?: Json | null
          run_id?: string
          status?: string
          tokens_in?: number
          tokens_out?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_run_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "seo_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_runs: {
        Row: {
          competitor_urls: string[]
          created_at: string
          goal: string | null
          health_score_geo: number | null
          health_score_seo: number | null
          id: string
          report: Json | null
          selected_products: Json | null
          site_url: string | null
          status: string
          task_id: string | null
          total_cost: number
          user_id: string
        }
        Insert: {
          competitor_urls?: string[]
          created_at?: string
          goal?: string | null
          health_score_geo?: number | null
          health_score_seo?: number | null
          id?: string
          report?: Json | null
          selected_products?: Json | null
          site_url?: string | null
          status?: string
          task_id?: string | null
          total_cost?: number
          user_id: string
        }
        Update: {
          competitor_urls?: string[]
          created_at?: string
          goal?: string | null
          health_score_geo?: number | null
          health_score_seo?: number | null
          id?: string
          report?: Json | null
          selected_products?: Json | null
          site_url?: string | null
          status?: string
          task_id?: string | null
          total_cost?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_runs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
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
      user_docs: {
        Row: {
          content_md: string
          created_at: string
          folder: string | null
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_md?: string
          created_at?: string
          folder?: string | null
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_md?: string
          created_at?: string
          folder?: string | null
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          folder: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          columns?: Json
          created_at?: string
          folder?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          columns?: Json
          created_at?: string
          folder?: string | null
          icon?: string | null
          id?: string
          name?: string
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
      delete_platform_secret: { Args: { p_name: string }; Returns: undefined }
      get_platform_secrets: {
        Args: never
        Returns: {
          name: string
          secret: string
        }[]
      }
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
      set_platform_secret: {
        Args: { p_name: string; p_value: string }
        Returns: undefined
      }
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
