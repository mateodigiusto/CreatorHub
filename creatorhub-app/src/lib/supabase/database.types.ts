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
      assets: {
        Row: {
          aesthetic_score: number | null
          created_at: string
          duration_seconds: number | null
          id: string
          kind: Database["public"]["Enums"]["asset_kind_t"]
          mood: string | null
          scene: string | null
          source: string
          storage_key: string
          tags: string[]
          thumbnail_storage_key: string | null
          title: string
          transcoded_variants: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aesthetic_score?: number | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          kind: Database["public"]["Enums"]["asset_kind_t"]
          mood?: string | null
          scene?: string | null
          source?: string
          storage_key: string
          tags?: string[]
          thumbnail_storage_key?: string | null
          title: string
          transcoded_variants?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aesthetic_score?: number | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["asset_kind_t"]
          mood?: string | null
          scene?: string | null
          source?: string
          storage_key?: string
          tags?: string[]
          thumbnail_storage_key?: string | null
          title?: string
          transcoded_variants?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor: string
          at: string
          id: string
          ip: unknown
          metadata: Json | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          actor: string
          at?: string
          id?: string
          ip?: unknown
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          actor?: string
          at?: string
          id?: string
          ip?: unknown
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      content_analyses: {
        Row: {
          content_score: number | null
          created_at: string
          cta: string | null
          hook: string | null
          hook_analysis: Json | null
          id: string
          source_creator: string | null
          source_handle: string | null
          source_kind: Database["public"]["Enums"]["source_kind_t"]
          source_platform: Database["public"]["Enums"]["source_platform_t"]
          source_thumbnail: string | null
          source_title: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["analysis_status_t"]
          steal_notes: string | null
          structure: Json | null
          themes: string[]
          tone: string | null
          transcription: string | null
          updated_at: string
          upload_asset_id: string | null
          user_id: string
          variations: Json | null
          why_it_worked: Json | null
        }
        Insert: {
          content_score?: number | null
          created_at?: string
          cta?: string | null
          hook?: string | null
          hook_analysis?: Json | null
          id?: string
          source_creator?: string | null
          source_handle?: string | null
          source_kind?: Database["public"]["Enums"]["source_kind_t"]
          source_platform: Database["public"]["Enums"]["source_platform_t"]
          source_thumbnail?: string | null
          source_title?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["analysis_status_t"]
          steal_notes?: string | null
          structure?: Json | null
          themes?: string[]
          tone?: string | null
          transcription?: string | null
          updated_at?: string
          upload_asset_id?: string | null
          user_id: string
          variations?: Json | null
          why_it_worked?: Json | null
        }
        Update: {
          content_score?: number | null
          created_at?: string
          cta?: string | null
          hook?: string | null
          hook_analysis?: Json | null
          id?: string
          source_creator?: string | null
          source_handle?: string | null
          source_kind?: Database["public"]["Enums"]["source_kind_t"]
          source_platform?: Database["public"]["Enums"]["source_platform_t"]
          source_thumbnail?: string | null
          source_title?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["analysis_status_t"]
          steal_notes?: string | null
          structure?: Json | null
          themes?: string[]
          tone?: string | null
          transcription?: string | null
          updated_at?: string
          upload_asset_id?: string | null
          user_id?: string
          variations?: Json | null
          why_it_worked?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "content_analyses_upload_asset_id_fkey"
            columns: ["upload_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_analyses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      content_drafts: {
        Row: {
          analysis_id: string
          angle: string | null
          audience: string | null
          captions: Json | null
          created_at: string
          hooks: Json | null
          id: string
          script: string | null
          shots: Json | null
          target_platform: string | null
          tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_id: string
          angle?: string | null
          audience?: string | null
          captions?: Json | null
          created_at?: string
          hooks?: Json | null
          id?: string
          script?: string | null
          shots?: Json | null
          target_platform?: string | null
          tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_id?: string
          angle?: string | null
          audience?: string | null
          captions?: Json | null
          created_at?: string
          hooks?: Json | null
          id?: string
          script?: string | null
          shots?: Json | null
          target_platform?: string | null
          tone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_drafts_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "content_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_drafts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_directory: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          curated_by: string | null
          display_name: string | null
          follower_range: Database["public"]["Enums"]["follower_range_t"] | null
          handle: string
          id: string
          metadata: Json
          niche: string
          platforms: Database["public"]["Enums"]["platform_t"][]
          posting_frequency:
            | Database["public"]["Enums"]["posting_frequency_t"]
            | null
          primary_platform: Database["public"]["Enums"]["platform_t"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          curated_by?: string | null
          display_name?: string | null
          follower_range?:
            | Database["public"]["Enums"]["follower_range_t"]
            | null
          handle: string
          id?: string
          metadata?: Json
          niche: string
          platforms?: Database["public"]["Enums"]["platform_t"][]
          posting_frequency?:
            | Database["public"]["Enums"]["posting_frequency_t"]
            | null
          primary_platform: Database["public"]["Enums"]["platform_t"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          curated_by?: string | null
          display_name?: string | null
          follower_range?:
            | Database["public"]["Enums"]["follower_range_t"]
            | null
          handle?: string
          id?: string
          metadata?: Json
          niche?: string
          platforms?: Database["public"]["Enums"]["platform_t"][]
          posting_frequency?:
            | Database["public"]["Enums"]["posting_frequency_t"]
            | null
          primary_platform?: Database["public"]["Enums"]["platform_t"]
          updated_at?: string
        }
        Relationships: []
      }
      creator_outreach_log: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          message_text: string
          outcome: Database["public"]["Enums"]["outreach_outcome_t"]
          outreach_date: string
          outreach_method: Database["public"]["Enums"]["outreach_method_t"]
          source_analysis_ids: string[]
          target_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          message_text: string
          outcome?: Database["public"]["Enums"]["outreach_outcome_t"]
          outreach_date?: string
          outreach_method: Database["public"]["Enums"]["outreach_method_t"]
          source_analysis_ids?: string[]
          target_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          message_text?: string
          outcome?: Database["public"]["Enums"]["outreach_outcome_t"]
          outreach_date?: string
          outreach_method?: Database["public"]["Enums"]["outreach_method_t"]
          source_analysis_ids?: string[]
          target_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_outreach_log_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_outreach_log_target_id_fkey"
            columns: ["target_id"]
            isOneToOne: false
            referencedRelation: "editor_creator_targets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_outreach_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_relationships: {
        Row: {
          accepted_at: string | null
          created_at: string
          creator_id: string | null
          ended_at: string | null
          expires_at: string
          id: string
          invite_token: string | null
          invited_email: string | null
          manager_id: string
          status: Database["public"]["Enums"]["relationship_status_t"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          creator_id?: string | null
          ended_at?: string | null
          expires_at?: string
          id?: string
          invite_token?: string | null
          invited_email?: string | null
          manager_id: string
          status?: Database["public"]["Enums"]["relationship_status_t"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          creator_id?: string | null
          ended_at?: string | null
          expires_at?: string
          id?: string
          invite_token?: string | null
          invited_email?: string | null
          manager_id?: string
          status?: Database["public"]["Enums"]["relationship_status_t"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_relationships_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_relationships_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      deletion_requests: {
        Row: {
          completed_at: string | null
          confirmation_code: string
          id: string
          reason: string | null
          requested_at: string
          source: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          confirmation_code: string
          id?: string
          reason?: string | null
          requested_at?: string
          source: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          confirmation_code?: string
          id?: string
          reason?: string | null
          requested_at?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      editor_creator_targets: {
        Row: {
          added_at: string
          creator_id: string
          id: string
          last_status_change_at: string
          notes: string | null
          status: Database["public"]["Enums"]["target_status_t"]
          updated_at: string
          user_id: string
        }
        Insert: {
          added_at?: string
          creator_id: string
          id?: string
          last_status_change_at?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["target_status_t"]
          updated_at?: string
          user_id: string
        }
        Update: {
          added_at?: string
          creator_id?: string
          id?: string
          last_status_change_at?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["target_status_t"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "editor_creator_targets_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editor_creator_targets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      editor_portfolios: {
        Row: {
          bio: string | null
          client_logos: Json
          contact_email: string | null
          contact_links: Json
          created_at: string
          id: string
          is_public: boolean
          niche_tags: string[]
          platforms: Database["public"]["Enums"]["platform_t"][]
          published_at: string | null
          slug: string
          specialties: string[]
          testimonials: Json
          updated_at: string
          user_id: string
          work_samples: Json
          years_experience: number | null
        }
        Insert: {
          bio?: string | null
          client_logos?: Json
          contact_email?: string | null
          contact_links?: Json
          created_at?: string
          id?: string
          is_public?: boolean
          niche_tags?: string[]
          platforms?: Database["public"]["Enums"]["platform_t"][]
          published_at?: string | null
          slug: string
          specialties?: string[]
          testimonials?: Json
          updated_at?: string
          user_id: string
          work_samples?: Json
          years_experience?: number | null
        }
        Update: {
          bio?: string | null
          client_logos?: Json
          contact_email?: string | null
          contact_links?: Json
          created_at?: string
          id?: string
          is_public?: boolean
          niche_tags?: string[]
          platforms?: Database["public"]["Enums"]["platform_t"][]
          published_at?: string | null
          slug?: string
          specialties?: string[]
          testimonials?: Json
          updated_at?: string
          user_id?: string
          work_samples?: Json
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "editor_portfolios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_scripts: {
        Row: {
          approved_at: string | null
          b_roll_notes: string | null
          created_at: string
          cta: string | null
          feedback: string | null
          format: Database["public"]["Enums"]["script_format_t"]
          hook: string | null
          id: string
          key_points: Json
          linked_post_id: string | null
          linked_sequence_id: string | null
          platform: Database["public"]["Enums"]["platform_t"]
          setup: string | null
          source_analysis_id: string | null
          status: Database["public"]["Enums"]["script_status_t"]
          title: string | null
          updated_at: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          b_roll_notes?: string | null
          created_at?: string
          cta?: string | null
          feedback?: string | null
          format: Database["public"]["Enums"]["script_format_t"]
          hook?: string | null
          id?: string
          key_points?: Json
          linked_post_id?: string | null
          linked_sequence_id?: string | null
          platform: Database["public"]["Enums"]["platform_t"]
          setup?: string | null
          source_analysis_id?: string | null
          status?: Database["public"]["Enums"]["script_status_t"]
          title?: string | null
          updated_at?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          b_roll_notes?: string | null
          created_at?: string
          cta?: string | null
          feedback?: string | null
          format?: Database["public"]["Enums"]["script_format_t"]
          hook?: string | null
          id?: string
          key_points?: Json
          linked_post_id?: string | null
          linked_sequence_id?: string | null
          platform?: Database["public"]["Enums"]["platform_t"]
          setup?: string | null
          source_analysis_id?: string | null
          status?: Database["public"]["Enums"]["script_status_t"]
          title?: string | null
          updated_at?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_scripts_linked_post_id_fkey"
            columns: ["linked_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_scripts_linked_sequence_id_fkey"
            columns: ["linked_sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_scripts_source_analysis_id_fkey"
            columns: ["source_analysis_id"]
            isOneToOne: false
            referencedRelation: "content_analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_scripts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      integrations: {
        Row: {
          access_token_ciphertext: string
          access_token_dek: string
          access_token_key_id: string
          account_type: string | null
          connected_at: string
          disconnected_at: string | null
          external_account_id: string
          id: string
          last_synced_at: string | null
          platform: Database["public"]["Enums"]["platform_t"]
          refresh_token_ciphertext: string | null
          refresh_token_dek: string | null
          refresh_token_key_id: string | null
          scopes: string[]
          status: Database["public"]["Enums"]["integration_status_t"]
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_ciphertext: string
          access_token_dek: string
          access_token_key_id: string
          account_type?: string | null
          connected_at?: string
          disconnected_at?: string | null
          external_account_id: string
          id?: string
          last_synced_at?: string | null
          platform: Database["public"]["Enums"]["platform_t"]
          refresh_token_ciphertext?: string | null
          refresh_token_dek?: string | null
          refresh_token_key_id?: string | null
          scopes?: string[]
          status?: Database["public"]["Enums"]["integration_status_t"]
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_ciphertext?: string
          access_token_dek?: string
          access_token_key_id?: string
          account_type?: string | null
          connected_at?: string
          disconnected_at?: string | null
          external_account_id?: string
          id?: string
          last_synced_at?: string | null
          platform?: Database["public"]["Enums"]["platform_t"]
          refresh_token_ciphertext?: string | null
          refresh_token_dek?: string | null
          refresh_token_key_id?: string | null
          scopes?: string[]
          status?: Database["public"]["Enums"]["integration_status_t"]
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          asset_id: string | null
          attempts: number
          claimed_at: string | null
          created_at: string
          cursor: Json | null
          error_text: string | null
          finished_at: string | null
          heartbeat_at: string | null
          id: string
          integration_id: string | null
          kind: Database["public"]["Enums"]["job_kind_t"]
          max_attempts: number
          next_attempt_at: string
          payload: Json
          post_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["job_status_t"]
          sub_type: string | null
          user_id: string
        }
        Insert: {
          asset_id?: string | null
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          cursor?: Json | null
          error_text?: string | null
          finished_at?: string | null
          heartbeat_at?: string | null
          id?: string
          integration_id?: string | null
          kind: Database["public"]["Enums"]["job_kind_t"]
          max_attempts?: number
          next_attempt_at?: string
          payload?: Json
          post_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status_t"]
          sub_type?: string | null
          user_id: string
        }
        Update: {
          asset_id?: string | null
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          cursor?: Json | null
          error_text?: string | null
          finished_at?: string | null
          heartbeat_at?: string | null
          id?: string
          integration_id?: string | null
          kind?: Database["public"]["Enums"]["job_kind_t"]
          max_attempts?: number
          next_attempt_at?: string
          payload?: Json
          post_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status_t"]
          sub_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["notification_kind_t"]
          read_at: string | null
          recipient_id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["notification_kind_t"]
          read_at?: string | null
          recipient_id: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind_t"]
          read_at?: string | null
          recipient_id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_states: {
        Row: {
          code_verifier_hash: string | null
          consumed_at: string | null
          created_at: string
          expires_at: string
          platform: Database["public"]["Enums"]["platform_t"]
          redirect_uri: string
          state: string
          user_id: string
        }
        Insert: {
          code_verifier_hash?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          platform: Database["public"]["Enums"]["platform_t"]
          redirect_uri: string
          state: string
          user_id: string
        }
        Update: {
          code_verifier_hash?: string | null
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          platform?: Database["public"]["Enums"]["platform_t"]
          redirect_uri?: string
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_states_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          caption: string | null
          comments: number | null
          created_at: string
          engagement_rate: number | null
          external_id: string | null
          id: string
          imported_at: string | null
          integration_id: string | null
          last_insight_sync_at: string | null
          lifecycle_state: Database["public"]["Enums"]["post_lifecycle_t"]
          likes: number | null
          platform: Database["public"]["Enums"]["platform_t"]
          publish_error: string | null
          published_at: string | null
          reach: number | null
          saves: number | null
          scheduled_at: string | null
          scheduled_at_timezone: string | null
          shares: number | null
          source: Database["public"]["Enums"]["post_source_t"]
          thumbnail_url: string | null
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          comments?: number | null
          created_at?: string
          engagement_rate?: number | null
          external_id?: string | null
          id?: string
          imported_at?: string | null
          integration_id?: string | null
          last_insight_sync_at?: string | null
          lifecycle_state: Database["public"]["Enums"]["post_lifecycle_t"]
          likes?: number | null
          platform: Database["public"]["Enums"]["platform_t"]
          publish_error?: string | null
          published_at?: string | null
          reach?: number | null
          saves?: number | null
          scheduled_at?: string | null
          scheduled_at_timezone?: string | null
          shares?: number | null
          source: Database["public"]["Enums"]["post_source_t"]
          thumbnail_url?: string | null
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          comments?: number | null
          created_at?: string
          engagement_rate?: number | null
          external_id?: string | null
          id?: string
          imported_at?: string | null
          integration_id?: string | null
          last_insight_sync_at?: string | null
          lifecycle_state?: Database["public"]["Enums"]["post_lifecycle_t"]
          likes?: number | null
          platform?: Database["public"]["Enums"]["platform_t"]
          publish_error?: string | null
          published_at?: string | null
          reach?: number | null
          saves?: number | null
          scheduled_at?: string | null
          scheduled_at_timezone?: string | null
          shares?: number | null
          source?: Database["public"]["Enums"]["post_source_t"]
          thumbnail_url?: string | null
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          asset_types: string[]
          audience_problem: string | null
          audience_wants: string | null
          audience_who: string | null
          avatar_url: string | null
          biggest_problem: string | null
          brand_tones: string[]
          completed_at: string | null
          content_formats: string[]
          created_at: string
          creator_type: string
          cta_style: string | null
          custom_cta: string | null
          display_name: string | null
          email_notifications: boolean
          frequency: string | null
          handle: string | null
          niche: string
          offer_name: string | null
          planning_workflow: string[]
          platforms: string[]
          primary_goal: string
          reports_needs: string[]
          schema_version: number
          secondary_goals: string[]
          selling: string[]
          sequence_uses: string[]
          start_mode: string
          stripe_customer_id: string | null
          team: string | null
          timezone: string
          trial_cycle: string | null
          trial_expires_at: string | null
          trial_plan: string | null
          trial_started_at: string | null
          updated_at: string
          user_id: string
          wants_niche_presets: boolean
        }
        Insert: {
          asset_types?: string[]
          audience_problem?: string | null
          audience_wants?: string | null
          audience_who?: string | null
          avatar_url?: string | null
          biggest_problem?: string | null
          brand_tones?: string[]
          completed_at?: string | null
          content_formats?: string[]
          created_at?: string
          creator_type: string
          cta_style?: string | null
          custom_cta?: string | null
          display_name?: string | null
          email_notifications?: boolean
          frequency?: string | null
          handle?: string | null
          niche: string
          offer_name?: string | null
          planning_workflow?: string[]
          platforms?: string[]
          primary_goal: string
          reports_needs?: string[]
          schema_version?: number
          secondary_goals?: string[]
          selling?: string[]
          sequence_uses?: string[]
          start_mode?: string
          stripe_customer_id?: string | null
          team?: string | null
          timezone?: string
          trial_cycle?: string | null
          trial_expires_at?: string | null
          trial_plan?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id: string
          wants_niche_presets?: boolean
        }
        Update: {
          asset_types?: string[]
          audience_problem?: string | null
          audience_wants?: string | null
          audience_who?: string | null
          avatar_url?: string | null
          biggest_problem?: string | null
          brand_tones?: string[]
          completed_at?: string | null
          content_formats?: string[]
          created_at?: string
          creator_type?: string
          cta_style?: string | null
          custom_cta?: string | null
          display_name?: string | null
          email_notifications?: boolean
          frequency?: string | null
          handle?: string | null
          niche?: string
          offer_name?: string | null
          planning_workflow?: string[]
          platforms?: string[]
          primary_goal?: string
          reports_needs?: string[]
          schema_version?: number
          secondary_goals?: string[]
          selling?: string[]
          sequence_uses?: string[]
          start_mode?: string
          stripe_customer_id?: string | null
          team?: string | null
          timezone?: string
          trial_cycle?: string | null
          trial_expires_at?: string | null
          trial_plan?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_id?: string
          wants_niche_presets?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_documents: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          relationship_id: string
          shared_by: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          relationship_id: string
          shared_by: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          relationship_id?: string
          shared_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_documents_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_documents_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "creator_relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_documents_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_links: {
        Row: {
          added_by: string
          created_at: string
          description: string | null
          id: string
          relationship_id: string
          title: string | null
          url: string
        }
        Insert: {
          added_by: string
          created_at?: string
          description?: string | null
          id?: string
          relationship_id: string
          title?: string | null
          url: string
        }
        Update: {
          added_by?: string
          created_at?: string
          description?: string | null
          id?: string
          relationship_id?: string
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_links_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_links_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "creator_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          relationship_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          relationship_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          relationship_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_messages_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "creator_relationships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_task_completions: {
        Row: {
          completed_at: string
          day: string
          task_id: string
        }
        Insert: {
          completed_at?: string
          day: string
          task_id: string
        }
        Update: {
          completed_at?: string
          day?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "relationship_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_tasks: {
        Row: {
          assigned_to: string
          completed_at: string | null
          created_at: string
          created_by: string
          creator_note: string | null
          deadline: string | null
          ended_at: string | null
          id: string
          notes: string | null
          recurrence: Database["public"]["Enums"]["task_recurrence_t"]
          relationship_id: string
          status: Database["public"]["Enums"]["task_status_t"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          creator_note?: string | null
          deadline?: string | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          recurrence?: Database["public"]["Enums"]["task_recurrence_t"]
          relationship_id: string
          status?: Database["public"]["Enums"]["task_status_t"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          creator_note?: string | null
          deadline?: string | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          recurrence?: Database["public"]["Enums"]["task_recurrence_t"]
          relationship_id?: string
          status?: Database["public"]["Enums"]["task_status_t"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_tasks_relationship_id_fkey"
            columns: ["relationship_id"]
            isOneToOne: false
            referencedRelation: "creator_relationships"
            referencedColumns: ["id"]
          },
        ]
      }
      schema_migrations: {
        Row: {
          applied_at: string
          checksum: string | null
          version: number
        }
        Insert: {
          applied_at?: string
          checksum?: string | null
          version: number
        }
        Update: {
          applied_at?: string
          checksum?: string | null
          version?: number
        }
        Relationships: []
      }
      script_preferences: {
        Row: {
          created_at: string
          custom_cron: string | null
          default_format: Database["public"]["Enums"]["script_format_t"]
          default_platforms: Database["public"]["Enums"]["platform_t"][]
          frequency: Database["public"]["Enums"]["script_frequency_t"]
          monthly_cap: number | null
          scripts_per_period: number
          system_prompt_overrides: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_cron?: string | null
          default_format?: Database["public"]["Enums"]["script_format_t"]
          default_platforms?: Database["public"]["Enums"]["platform_t"][]
          frequency?: Database["public"]["Enums"]["script_frequency_t"]
          monthly_cap?: number | null
          scripts_per_period?: number
          system_prompt_overrides?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_cron?: string | null
          default_format?: Database["public"]["Enums"]["script_format_t"]
          default_platforms?: Database["public"]["Enums"]["platform_t"][]
          frequency?: Database["public"]["Enums"]["script_frequency_t"]
          monthly_cap?: number | null
          scripts_per_period?: number
          system_prompt_overrides?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          accent_color: string | null
          brand_tone: string | null
          brief: string | null
          content_style: string | null
          created_at: string
          decorations: string[]
          goal: string | null
          id: string
          persona: string | null
          published_at: string | null
          scheduled_at: string | null
          scheduled_at_timezone: string | null
          slides: Json
          status: string
          title: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          accent_color?: string | null
          brand_tone?: string | null
          brief?: string | null
          content_style?: string | null
          created_at?: string
          decorations?: string[]
          goal?: string | null
          id?: string
          persona?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          scheduled_at_timezone?: string | null
          slides?: Json
          status?: string
          title: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          accent_color?: string | null
          brand_tone?: string | null
          brief?: string | null
          content_style?: string | null
          created_at?: string
          decorations?: string[]
          goal?: string | null
          id?: string
          persona?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          scheduled_at_timezone?: string | null
          slides?: Json
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sequences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          cycle: string
          id: string
          plan: string
          status: Database["public"]["Enums"]["subscription_status_t"]
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          cycle: string
          id?: string
          plan: string
          status: Database["public"]["Enums"]["subscription_status_t"]
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          cycle?: string
          id?: string
          plan?: string
          status?: Database["public"]["Enums"]["subscription_status_t"]
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_runs: {
        Row: {
          cursor: Json | null
          error_text: string | null
          finished_at: string | null
          id: string
          integration_id: string
          job_id: string | null
          pages_fetched: number | null
          posts_upserted: number | null
          started_at: string
          status: string
        }
        Insert: {
          cursor?: Json | null
          error_text?: string | null
          finished_at?: string | null
          id?: string
          integration_id: string
          job_id?: string | null
          pages_fetched?: number | null
          posts_upserted?: number | null
          started_at?: string
          status: string
        }
        Update: {
          cursor?: Json | null
          error_text?: string | null
          finished_at?: string | null
          id?: string
          integration_id?: string
          job_id?: string | null
          pages_fetched?: number | null
          posts_upserted?: number | null
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_runs_integration_id_fkey"
            columns: ["integration_id"]
            isOneToOne: false
            referencedRelation: "integrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_runs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          deleted_at: string | null
          display_name: string | null
          email: string
          handle: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          email: string
          handle?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          email?: string
          handle?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          external_id: string
          id: string
          payload: Json
          process_error: string | null
          processed_at: string | null
          provider: Database["public"]["Enums"]["platform_t"]
          received_at: string
          signature_verified: boolean
        }
        Insert: {
          external_id: string
          id?: string
          payload: Json
          process_error?: string | null
          processed_at?: string | null
          provider: Database["public"]["Enums"]["platform_t"]
          received_at?: string
          signature_verified: boolean
        }
        Update: {
          external_id?: string
          id?: string
          payload?: Json
          process_error?: string | null
          processed_at?: string | null
          provider?: Database["public"]["Enums"]["platform_t"]
          received_at?: string
          signature_verified?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_relationship_member: { Args: { rel_id: string }; Returns: boolean }
    }
    Enums: {
      analysis_status_t: "analyzing" | "ready" | "failed"
      asset_kind_t: "photo" | "video" | "screenshot" | "testimonial" | "proof"
      follower_range_t:
        | "under_10k"
        | "10k_50k"
        | "50k_250k"
        | "250k_1m"
        | "over_1m"
      integration_status_t: "active" | "expired" | "revoked" | "unsupported"
      job_kind_t:
        | "sync"
        | "transcode"
        | "publish"
        | "refresh_token"
        | "finalize_deletion"
        | "cleanup"
        | "content_dna_analyze"
      job_status_t: "queued" | "running" | "completed" | "failed" | "dead"
      notification_kind_t:
        | "invite"
        | "message"
        | "task_assigned"
        | "task_due"
        | "streak_at_risk"
      outreach_method_t: "dm" | "email" | "comment" | "followup" | "voice_note"
      outreach_outcome_t:
        | "pending"
        | "no_response"
        | "declined"
        | "interested"
        | "converted"
      platform_t:
        | "instagram"
        | "tiktok"
        | "youtube"
        | "linkedin"
        | "x"
        | "facebook"
      post_lifecycle_t:
        | "draft"
        | "review"
        | "scheduled"
        | "publishing"
        | "published"
        | "failed"
        | "analyzed"
      post_source_t: "imported" | "native"
      posting_frequency_t:
        | "rarely"
        | "weekly"
        | "few_per_week"
        | "daily"
        | "multi_daily"
      relationship_status_t:
        | "pending"
        | "active"
        | "declined"
        | "ended"
        | "expired"
      script_format_t: "reel" | "longform" | "vsl" | "story_sequence" | "email"
      script_frequency_t:
        | "daily"
        | "three_x_week"
        | "weekly"
        | "biweekly"
        | "monthly"
        | "custom"
      script_status_t: "draft" | "approved" | "used" | "archived"
      source_kind_t: "url" | "username" | "upload"
      source_platform_t: "youtube" | "instagram" | "tiktok" | "other"
      subscription_status_t:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "unpaid"
        | "paused"
      target_status_t: "pitched" | "responded" | "client" | "pass"
      task_recurrence_t: "none" | "daily"
      task_status_t: "pending" | "in_progress" | "done"
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
      analysis_status_t: ["analyzing", "ready", "failed"],
      asset_kind_t: ["photo", "video", "screenshot", "testimonial", "proof"],
      follower_range_t: [
        "under_10k",
        "10k_50k",
        "50k_250k",
        "250k_1m",
        "over_1m",
      ],
      integration_status_t: ["active", "expired", "revoked", "unsupported"],
      job_kind_t: [
        "sync",
        "transcode",
        "publish",
        "refresh_token",
        "finalize_deletion",
        "cleanup",
        "content_dna_analyze",
      ],
      job_status_t: ["queued", "running", "completed", "failed", "dead"],
      notification_kind_t: [
        "invite",
        "message",
        "task_assigned",
        "task_due",
        "streak_at_risk",
      ],
      outreach_method_t: ["dm", "email", "comment", "followup", "voice_note"],
      outreach_outcome_t: [
        "pending",
        "no_response",
        "declined",
        "interested",
        "converted",
      ],
      platform_t: [
        "instagram",
        "tiktok",
        "youtube",
        "linkedin",
        "x",
        "facebook",
      ],
      post_lifecycle_t: [
        "draft",
        "review",
        "scheduled",
        "publishing",
        "published",
        "failed",
        "analyzed",
      ],
      post_source_t: ["imported", "native"],
      posting_frequency_t: [
        "rarely",
        "weekly",
        "few_per_week",
        "daily",
        "multi_daily",
      ],
      relationship_status_t: [
        "pending",
        "active",
        "declined",
        "ended",
        "expired",
      ],
      script_format_t: ["reel", "longform", "vsl", "story_sequence", "email"],
      script_frequency_t: [
        "daily",
        "three_x_week",
        "weekly",
        "biweekly",
        "monthly",
        "custom",
      ],
      script_status_t: ["draft", "approved", "used", "archived"],
      source_kind_t: ["url", "username", "upload"],
      source_platform_t: ["youtube", "instagram", "tiktok", "other"],
      subscription_status_t: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "unpaid",
        "paused",
      ],
      target_status_t: ["pitched", "responded", "client", "pass"],
      task_recurrence_t: ["none", "daily"],
      task_status_t: ["pending", "in_progress", "done"],
    },
  },
} as const
