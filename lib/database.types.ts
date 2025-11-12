npm warn config optional Use `--omit=optional` to exclude optional dependencies, or
npm warn config `--include=optional` to include them.
npm warn config
npm warn config       Default value does install optional deps unless otherwise omitted.
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
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "v_user_ban_status"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_jobs: {
        Row: {
          ai_model: string | null
          ai_provider: string
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          error_details: Json | null
          error_message: string | null
          hands_found: number | null
          id: string
          platform: string
          processing_time: number | null
          progress: number | null
          result: Json | null
          segments: Json
          started_at: string | null
          status: string
          stream_id: string | null
          submitted_players: string[] | null
          tokens_used: number | null
          updated_at: string | null
          video_id: string | null
        }
        Insert: {
          ai_model?: string | null
          ai_provider: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_details?: Json | null
          error_message?: string | null
          hands_found?: number | null
          id?: string
          platform?: string
          processing_time?: number | null
          progress?: number | null
          result?: Json | null
          segments: Json
          started_at?: string | null
          status?: string
          stream_id?: string | null
          submitted_players?: string[] | null
          tokens_used?: number | null
          updated_at?: string | null
          video_id?: string | null
        }
        Update: {
          ai_model?: string | null
          ai_provider?: string
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          error_details?: Json | null
          error_message?: string | null
          hands_found?: number | null
          id?: string
          platform?: string
          processing_time?: number | null
          progress?: number | null
          result?: Json | null
          segments?: Json
          started_at?: string | null
          status?: string
          stream_id?: string | null
          submitted_players?: string[] | null
          tokens_used?: number | null
          updated_at?: string | null
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_jobs_stream_id_fkey"
            columns: ["stream_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_jobs_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ban_status"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_avatar: string | null
          author_id: string | null
          author_name: string
          content: string
          created_at: string | null
          hand_id: string | null
          id: string
          is_hidden: boolean | null
          likes_count: number | null
          parent_comment_id: string | null
          post_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_avatar?: string | null
          author_id?: string | null
          author_name: string
          content: string
          created_at?: string | null
          hand_id?: string | null
          id?: string
          is_hidden?: boolean | null
          likes_count?: number | null
          parent_comment_id?: string | null
          post_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_avatar?: string | null
          author_id?: string | null
          author_name?: string
          content?: string
          created_at?: string | null
          hand_id?: string | null
          id?: string
          is_hidden?: boolean | null
          likes_count?: number | null
          parent_comment_id?: string | null
          post_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_user_ban_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_hand_id_fkey"
            columns: ["hand_id"]
            isOneToOne: false
            referencedRelation: "hands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      data_deletion_requests: {
        Row: {
          admin_notes: string | null
          completed_at: string | null
          created_at: string
          id: string
          reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_deletion_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_deletion_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "v_user_ban_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_deletion_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_deletion_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ban_status"
            referencedColumns: ["id"]
          },
        ]
      }
      event_payouts: {
        Row: {
          created_at: string | null
          id: string
          matched_at: string | null
          matched_status: string
          player_id: string | null
          player_name: string
          prize_amount: number
          rank: number
          sub_event_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          matched_at?: string | null
          matched_status?: string
          player_id?: string | null
          player_name: string
          prize_amount: number
          rank: number
          sub_event_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          matched_at?: string | null
          matched_status?: string
          player_id?: string | null
          player_name?: string
          prize_amount?: number
          rank?: number
          sub_event_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_payouts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_payouts_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: false
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
        ]
      }
      hand_actions: {
        Row: {
          action_order: number | null
          action_type: string
          amount: number | null
          created_at: string | null
          hand_id: string
          id: string
          player_id: string
          sequence: number
          street: string
        }
        Insert: {
          action_order?: number | null
          action_type: string
          amount?: number | null
          created_at?: string | null
          hand_id: string
          id?: string
          player_id: string
          sequence: number
          street: string
        }
        Update: {
          action_order?: number | null
          action_type?: string
          amount?: number | null
          created_at?: string | null
          hand_id?: string
          id?: string
          player_id?: string
          sequence?: number
          street?: string
        }
        Relationships: [
          {
            foreignKeyName: "hand_actions_hand_id_fkey"
            columns: ["hand_id"]
            isOneToOne: false
            referencedRelation: "hands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hand_actions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      hand_bookmarks: {
        Row: {
          created_at: string | null
          folder_name: string | null
          hand_id: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          folder_name?: string | null
          hand_id: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          folder_name?: string | null
          hand_id?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hand_bookmarks_hand_id_fkey"
            columns: ["hand_id"]
            isOneToOne: false
            referencedRelation: "hands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hand_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hand_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ban_status"
            referencedColumns: ["id"]
          },
        ]
      }
      hand_edit_requests: {
        Row: {
          admin_comment: string | null
          created_at: string | null
          edit_type: string
          hand_id: string
          id: string
          original_data: Json
          proposed_data: Json
          reason: string
          requester_id: string
          requester_name: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          admin_comment?: string | null
          created_at?: string | null
          edit_type: string
          hand_id: string
          id?: string
          original_data: Json
          proposed_data: Json
          reason: string
          requester_id: string
          requester_name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          admin_comment?: string | null
          created_at?: string | null
          edit_type?: string
          hand_id?: string
          id?: string
          original_data?: Json
          proposed_data?: Json
          reason?: string
          requester_id?: string
          requester_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "hand_edit_requests_hand_id_fkey"
            columns: ["hand_id"]
            isOneToOne: false
            referencedRelation: "hands"
            referencedColumns: ["id"]
          },
        ]
      }
      hand_likes: {
        Row: {
          created_at: string | null
          hand_id: string
          id: string
          updated_at: string | null
          user_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string | null
          hand_id: string
          id?: string
          updated_at?: string | null
          user_id: string
          vote_type: string
        }
        Update: {
          created_at?: string | null
          hand_id?: string
          id?: string
          updated_at?: string | null
          user_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "hand_likes_hand_id_fkey"
            columns: ["hand_id"]
            isOneToOne: false
            referencedRelation: "hands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hand_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hand_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ban_status"
            referencedColumns: ["id"]
          },
        ]
      }
      hand_players: {
        Row: {
          cards: string | null
          created_at: string | null
          ending_stack: number | null
          final_amount: number | null
          hand_description: string | null
          hand_id: string
          hole_cards: string[] | null
          id: string
          is_winner: boolean | null
          player_id: string
          poker_position: string | null
          seat: number | null
          starting_stack: number | null
        }
        Insert: {
          cards?: string | null
          created_at?: string | null
          ending_stack?: number | null
          final_amount?: number | null
          hand_description?: string | null
          hand_id: string
          hole_cards?: string[] | null
          id?: string
          is_winner?: boolean | null
          player_id: string
          poker_position?: string | null
          seat?: number | null
          starting_stack?: number | null
        }
        Update: {
          cards?: string | null
          created_at?: string | null
          ending_stack?: number | null
          final_amount?: number | null
          hand_description?: string | null
          hand_id?: string
          hole_cards?: string[] | null
          id?: string
          is_winner?: boolean | null
          player_id?: string
          poker_position?: string | null
          seat?: number | null
          starting_stack?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hand_players_hand_id_fkey"
            columns: ["hand_id"]
            isOneToOne: false
            referencedRelation: "hands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hand_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      hand_tags: {
        Row: {
          created_at: string | null
          created_by: string
          hand_id: string
          id: string
          tag_name: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          hand_id: string
          id?: string
          tag_name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          hand_id?: string
          id?: string
          tag_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "hand_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hand_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "v_user_ban_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hand_tags_hand_id_fkey"
            columns: ["hand_id"]
            isOneToOne: false
            referencedRelation: "hands"
            referencedColumns: ["id"]
          },
        ]
      }
      hands: {
        Row: {
          ai_summary: string | null
          board_cards: string | null
          board_flop: string[] | null
          board_river: string | null
          board_turn: string | null
          bookmarks_count: number | null
          created_at: string | null
          day_id: string
          description: string
          description_tsv: unknown
          dislikes_count: number | null
          favorite: boolean | null
          id: string
          job_id: string | null
          likes_count: number | null
          number: string
          pot_size: number | null
          raw_data: Json | null
          stakes: string | null
          thumbnail_url: string | null
          timestamp: string
          video_timestamp_end: number | null
          video_timestamp_start: number | null
        }
        Insert: {
          ai_summary?: string | null
          board_cards?: string | null
          board_flop?: string[] | null
          board_river?: string | null
          board_turn?: string | null
          bookmarks_count?: number | null
          created_at?: string | null
          day_id: string
          description: string
          description_tsv?: unknown
          dislikes_count?: number | null
          favorite?: boolean | null
          id?: string
          job_id?: string | null
          likes_count?: number | null
          number: string
          pot_size?: number | null
          raw_data?: Json | null
          stakes?: string | null
          thumbnail_url?: string | null
          timestamp: string
          video_timestamp_end?: number | null
          video_timestamp_start?: number | null
        }
        Update: {
          ai_summary?: string | null
          board_cards?: string | null
          board_flop?: string[] | null
          board_river?: string | null
          board_turn?: string | null
          bookmarks_count?: number | null
          created_at?: string | null
          day_id?: string
          description?: string
          description_tsv?: unknown
          dislikes_count?: number | null
          favorite?: boolean | null
          id?: string
          job_id?: string | null
          likes_count?: number | null
          number?: string
          pot_size?: number | null
          raw_data?: Json | null
          stakes?: string | null
          thumbnail_url?: string | null
          timestamp?: string
          video_timestamp_end?: number | null
          video_timestamp_start?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hands_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "analysis_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hands_stream_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "streams"
            referencedColumns: ["id"]
          },
        ]
      }
      khaydarin_frames: {
        Row: {
          created_at: string | null
          id: string
          index: number
          label: string | null
          session_id: string
          storage_path: string
          url: string
        }
        Insert: {
          created_at?: string | null
          id: string
          index: number
          label?: string | null
          session_id: string
          storage_path: string
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          index?: number
          label?: string | null
          session_id?: string
          storage_path?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "khaydarin_frames_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "khaydarin_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      khaydarin_sessions: {
        Row: {
          best_accuracy: number | null
          created_at: string | null
          fps: string | null
          hf_api_url: string | null
          hf_model_url: string | null
          id: string
          labels_completed: boolean | null
          model_path: string | null
          roboflow_uploaded: boolean | null
          roboflow_uploaded_at: string | null
          total_frames: number | null
          training_completed: boolean | null
          updated_at: string | null
          video_path: string
          video_url: string | null
        }
        Insert: {
          best_accuracy?: number | null
          created_at?: string | null
          fps?: string | null
          hf_api_url?: string | null
          hf_model_url?: string | null
          id: string
          labels_completed?: boolean | null
          model_path?: string | null
          roboflow_uploaded?: boolean | null
          roboflow_uploaded_at?: string | null
          total_frames?: number | null
          training_completed?: boolean | null
          updated_at?: string | null
          video_path: string
          video_url?: string | null
        }
        Update: {
          best_accuracy?: number | null
          created_at?: string | null
          fps?: string | null
          hf_api_url?: string | null
          hf_model_url?: string | null
          id?: string
          labels_completed?: boolean | null
          model_path?: string | null
          roboflow_uploaded?: boolean | null
          roboflow_uploaded_at?: string | null
          total_frames?: number | null
          training_completed?: boolean | null
          updated_at?: string | null
          video_path?: string
          video_url?: string | null
        }
        Relationships: []
      }
      likes: {
        Row: {
          comment_id: string | null
          created_at: string | null
          id: string
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          comment_id?: string | null
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ban_status"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          claim_id: string | null
          comment_id: string | null
          created_at: string | null
          edit_request_id: string | null
          hand_id: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          post_id: string | null
          recipient_id: string
          sender_id: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Insert: {
          claim_id?: string | null
          comment_id?: string | null
          created_at?: string | null
          edit_request_id?: string | null
          hand_id?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          post_id?: string | null
          recipient_id: string
          sender_id?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
        }
        Update: {
          claim_id?: string | null
          comment_id?: string | null
          created_at?: string | null
          edit_request_id?: string | null
          hand_id?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          post_id?: string | null
          recipient_id?: string
          sender_id?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "player_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_edit_request_id_fkey"
            columns: ["edit_request_id"]
            isOneToOne: false
            referencedRelation: "hand_edit_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_hand_id_fkey"
            columns: ["hand_id"]
            isOneToOne: false
            referencedRelation: "hands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "v_user_ban_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "v_user_ban_status"
            referencedColumns: ["id"]
          },
        ]
      }
      player_claims: {
        Row: {
          admin_notes: string | null
          claimed_at: string | null
          created_at: string | null
          id: string
          player_id: string
          rejected_reason: string | null
          status: Database["public"]["Enums"]["claim_status"]
          updated_at: string | null
          user_id: string
          verification_data: Json | null
          verification_method: Database["public"]["Enums"]["verification_method"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          claimed_at?: string | null
          created_at?: string | null
          id?: string
          player_id: string
          rejected_reason?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string | null
          user_id: string
          verification_data?: Json | null
          verification_method: Database["public"]["Enums"]["verification_method"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          claimed_at?: string | null
          created_at?: string | null
          id?: string
          player_id?: string
          rejected_reason?: string | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string | null
          user_id?: string
          verification_data?: Json | null
          verification_method?: Database["public"]["Enums"]["verification_method"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_claims_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ban_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_claims_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_claims_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "v_user_ban_status"
            referencedColumns: ["id"]
          },
        ]
      }
      player_stats_cache: {
        Row: {
          ats: number | null
          avg_pot_size: number | null
          created_at: string | null
          hands_won: number | null
          last_updated: string | null
          pfr: number | null
          play_style: string | null
          player_id: string
          positional_stats: Json | null
          showdown_win_rate: number | null
          three_bet: number | null
          total_hands: number | null
          vpip: number | null
          win_rate: number | null
        }
        Insert: {
          ats?: number | null
          avg_pot_size?: number | null
          created_at?: string | null
          hands_won?: number | null
          last_updated?: string | null
          pfr?: number | null
          play_style?: string | null
          player_id: string
          positional_stats?: Json | null
          showdown_win_rate?: number | null
          three_bet?: number | null
          total_hands?: number | null
          vpip?: number | null
          win_rate?: number | null
        }
        Update: {
          ats?: number | null
          avg_pot_size?: number | null
          created_at?: string | null
          hands_won?: number | null
          last_updated?: string | null
          pfr?: number | null
          play_style?: string | null
          player_id?: string
          positional_stats?: Json | null
          showdown_win_rate?: number | null
          three_bet?: number | null
          total_hands?: number | null
          vpip?: number | null
          win_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_stats_cache_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          aliases: string[] | null
          bio: string | null
          country: string | null
          created_at: string | null
          id: string
          is_pro: boolean | null
          name: string
          name_tsv: unknown
          normalized_name: string
          photo_url: string | null
          total_winnings: number | null
        }
        Insert: {
          aliases?: string[] | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_pro?: boolean | null
          name: string
          name_tsv?: unknown
          normalized_name: string
          photo_url?: string | null
          total_winnings?: number | null
        }
        Update: {
          aliases?: string[] | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_pro?: boolean | null
          name?: string
          name_tsv?: unknown
          normalized_name?: string
          photo_url?: string | null
          total_winnings?: number | null
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_avatar: string | null
          author_id: string | null
          author_name: string
          category: string
          comments_count: number | null
          content: string
          created_at: string | null
          hand_id: string | null
          id: string
          is_hidden: boolean | null
          likes_count: number | null
          search_vector: unknown
          title: string
          updated_at: string | null
        }
        Insert: {
          author_avatar?: string | null
          author_id?: string | null
          author_name: string
          category: string
          comments_count?: number | null
          content: string
          created_at?: string | null
          hand_id?: string | null
          id?: string
          is_hidden?: boolean | null
          likes_count?: number | null
          search_vector?: unknown
          title: string
          updated_at?: string | null
        }
        Update: {
          author_avatar?: string | null
          author_id?: string | null
          author_name?: string
          category?: string
          comments_count?: number | null
          content?: string
          created_at?: string | null
          hand_id?: string | null
          id?: string
          is_hidden?: boolean | null
          likes_count?: number | null
          search_vector?: unknown
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "v_user_ban_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_hand_id_fkey"
            columns: ["hand_id"]
            isOneToOne: false
            referencedRelation: "hands"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_comment: string | null
          comment_id: string | null
          created_at: string | null
          description: string | null
          id: string
          post_id: string | null
          reason: string
          reporter_id: string
          reporter_name: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          admin_comment?: string | null
          comment_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          post_id?: string | null
          reason: string
          reporter_id: string
          reporter_name: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          admin_comment?: string | null
          comment_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          post_id?: string | null
          reason?: string
          reporter_id?: string
          reporter_name?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          request_body: Json | null
          request_method: string | null
          request_path: string | null
          response_status: number | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          request_body?: Json | null
          request_method?: string | null
          request_path?: string | null
          response_status?: number | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          request_body?: Json | null
          request_method?: string | null
          request_path?: string | null
          response_status?: number | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_user_ban_status"
            referencedColumns: ["id"]
          },
        ]
      }
      streams: {
        Row: {
          created_at: string | null
          id: string
          is_organized: boolean | null
          name: string
          organized_at: string | null
          published_at: string | null
          sub_event_id: string | null
          video_file: string | null
          video_nas_path: string | null
          video_source: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_organized?: boolean | null
          name: string
          organized_at?: string | null
          published_at?: string | null
          sub_event_id?: string | null
          video_file?: string | null
          video_nas_path?: string | null
          video_source?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_organized?: boolean | null
          name?: string
          organized_at?: string | null
          published_at?: string | null
          sub_event_id?: string | null
          video_file?: string | null
          video_nas_path?: string | null
          video_source?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "days_sub_event_id_fkey"
            columns: ["sub_event_id"]
            isOneToOne: false
            referencedRelation: "sub_events"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_events: {
        Row: {
          blind_structure: string | null
          buy_in: string | null
          created_at: string | null
          date: string
          entry_count: number | null
          event_number: string | null
          id: string
          level_duration: number | null
          name: string
          notes: string | null
          starting_stack: number | null
          total_prize: string | null
          tournament_id: string
          winner: string | null
        }
        Insert: {
          blind_structure?: string | null
          buy_in?: string | null
          created_at?: string | null
          date: string
          entry_count?: number | null
          event_number?: string | null
          id?: string
          level_duration?: number | null
          name: string
          notes?: string | null
          starting_stack?: number | null
          total_prize?: string | null
          tournament_id: string
          winner?: string | null
        }
        Update: {
          blind_structure?: string | null
          buy_in?: string | null
          created_at?: string | null
          date?: string
          entry_count?: number | null
          event_number?: string | null
          id?: string
          level_duration?: number | null
          name?: string
          notes?: string | null
          starting_stack?: number | null
          total_prize?: string | null
          tournament_id?: string
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_events_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_categories: {
        Row: {
          aliases: string[] | null
          created_at: string | null
          display_name: string
          game_type: Database["public"]["Enums"]["game_type"]
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          parent_id: string | null
          short_name: string | null
          theme_gradient: string | null
          theme_shadow: string | null
          theme_text: string | null
          updated_at: string | null
        }
        Insert: {
          aliases?: string[] | null
          created_at?: string | null
          display_name: string
          game_type?: Database["public"]["Enums"]["game_type"]
          id: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          parent_id?: string | null
          short_name?: string | null
          theme_gradient?: string | null
          theme_shadow?: string | null
          theme_text?: string | null
          updated_at?: string | null
        }
        Update: {
          aliases?: string[] | null
          created_at?: string | null
          display_name?: string
          game_type?: Database["public"]["Enums"]["game_type"]
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          parent_id?: string | null
          short_name?: string | null
          theme_gradient?: string | null
          theme_shadow?: string | null
          theme_text?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tournament_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          category: string
          category_id: string
          category_logo: string | null
          city: string | null
          country: string | null
          created_at: string | null
          end_date: string
          game_type: string
          id: string
          location: string
          name: string
          start_date: string
        }
        Insert: {
          category: string
          category_id: string
          category_logo?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          end_date: string
          game_type?: string
          id?: string
          location: string
          name: string
          start_date: string
        }
        Update: {
          category?: string
          category_id?: string
          category_logo?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          end_date?: string
          game_type?: string
          id?: string
          location?: string
          name?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_tournament_category"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "tournament_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          ban_reason: string | null
          banned_at: string | null
          banned_by: string | null
          bio: string | null
          comments_count: number | null
          created_at: string | null
          email: string
          id: string
          instagram_handle: string | null
          is_banned: boolean | null
          last_activity_at: string | null
          last_sign_in_at: string | null
          likes_received: number | null
          location: string | null
          nickname: string
          poker_experience: string | null
          posts_count: number | null
          profile_visibility: string | null
          role: string | null
          twitter_handle: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          bio?: string | null
          comments_count?: number | null
          created_at?: string | null
          email: string
          id: string
          instagram_handle?: string | null
          is_banned?: boolean | null
          last_activity_at?: string | null
          last_sign_in_at?: string | null
          likes_received?: number | null
          location?: string | null
          nickname: string
          poker_experience?: string | null
          posts_count?: number | null
          profile_visibility?: string | null
          role?: string | null
          twitter_handle?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          bio?: string | null
          comments_count?: number | null
          created_at?: string | null
          email?: string
          id?: string
          instagram_handle?: string | null
          is_banned?: boolean | null
          last_activity_at?: string | null
          last_sign_in_at?: string | null
          likes_received?: number | null
          location?: string | null
          nickname?: string
          poker_experience?: string | null
          posts_count?: number | null
          profile_visibility?: string | null
          role?: string | null
          twitter_handle?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "v_user_ban_status"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          channel_name: string | null
          created_at: string | null
          description: string | null
          duration: number | null
          id: string
          platform: string
          published_at: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          url: string
          youtube_id: string | null
        }
        Insert: {
          channel_name?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          platform?: string
          published_at?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          url: string
          youtube_id?: string | null
        }
        Update: {
          channel_name?: string | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          platform?: string
          published_at?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          url?: string
          youtube_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      tournament_category_stats: {
        Row: {
          earliest_date: string | null
          latest_date: string | null
          normalized_category: string | null
          original_category: string | null
          tournament_count: number | null
        }
        Relationships: []
      }
      v_admin_performance_quick_check: {
        Row: {
          check_name: string | null
          status: string | null
          value: string | null
        }
        Relationships: []
      }
      v_cache_hit_ratio: {
        Row: {
          cache_type: string | null
          hit_ratio_pct: number | null
          hits: number | null
          reads: number | null
        }
        Relationships: []
      }
      v_database_size: {
        Row: {
          database_name: unknown
          size: string | null
        }
        Insert: {
          database_name?: unknown
          size?: never
        }
        Update: {
          database_name?: unknown
          size?: never
        }
        Relationships: []
      }
      v_duplicate_indexes: {
        Row: {
          columns: string | null
          indexes: unknown[] | null
          total_size: string | null
        }
        Relationships: []
      }
      v_fulltext_search_stats: {
        Row: {
          index_size: string | null
          indexed_rows: number | null
          table_name: string | null
          total_rows: number | null
        }
        Relationships: []
      }
      v_index_sizes: {
        Row: {
          index_size: string | null
          indexname: unknown
          scans: number | null
          schemaname: unknown
          tablename: unknown
          tuples_fetched: number | null
          tuples_read: number | null
        }
        Relationships: []
      }
      v_index_statistics: {
        Row: {
          idx_scan: number | null
          idx_tup_fetch: number | null
          idx_tup_read: number | null
          indexname: unknown
          schemaname: unknown
          size: string | null
          tablename: unknown
        }
        Relationships: []
      }
      v_index_usage_stats: {
        Row: {
          indexname: unknown
          scans: number | null
          schemaname: unknown
          size: string | null
          tablename: unknown
          tuples_fetched: number | null
          tuples_read: number | null
          usage_level: string | null
        }
        Relationships: []
      }
      v_monitoring_dashboard: {
        Row: {
          index_cache_hit_pct: number | null
          table_cache_hit_pct: number | null
          total_db_size: string | null
          total_indexes: number | null
          total_tables: number | null
          unused_indexes: number | null
        }
        Relationships: []
      }
      v_rls_function_test: {
        Row: {
          function_name: string | null
          note: string | null
          result: boolean | null
        }
        Relationships: []
      }
      v_rls_policy_stats: {
        Row: {
          policies: string | null
          policy_count: number | null
          schemaname: unknown
          tablename: unknown
        }
        Relationships: []
      }
      v_table_bloat: {
        Row: {
          bloat_pct: number | null
          dead_tuples: number | null
          estimated_bloat_bytes: number | null
          live_tuples: number | null
          schemaname: unknown
          table_size: string | null
          tablename: unknown
        }
        Relationships: []
      }
      v_table_sizes: {
        Row: {
          indexes_size: string | null
          schemaname: unknown
          table_size: string | null
          tablename: unknown
          total_bytes: number | null
          total_size: string | null
        }
        Relationships: []
      }
      v_table_statistics: {
        Row: {
          dead_rows: number | null
          deletes: number | null
          indexes_size: string | null
          inserts: number | null
          last_analyze: string | null
          last_autoanalyze: string | null
          last_autovacuum: string | null
          last_vacuum: string | null
          live_rows: number | null
          schemaname: unknown
          table_size: string | null
          tablename: unknown
          total_size: string | null
          updates: number | null
        }
        Relationships: []
      }
      v_unused_indexes: {
        Row: {
          index_scans: number | null
          index_size: string | null
          index_size_bytes: number | null
          indexname: unknown
          schemaname: unknown
          tablename: unknown
        }
        Relationships: []
      }
      v_user_ban_status: {
        Row: {
          ban_reason: string | null
          banned_at: string | null
          banned_by: string | null
          days_since_ban: number | null
          email: string | null
          id: string | null
          is_banned_computed: boolean | null
          nickname: string | null
        }
        Insert: {
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          days_since_ban?: never
          email?: string | null
          id?: string | null
          is_banned_computed?: never
          nickname?: string | null
        }
        Update: {
          ban_reason?: string | null
          banned_at?: string | null
          banned_by?: string | null
          days_since_ban?: never
          email?: string | null
          id?: string | null
          is_banned_computed?: never
          nickname?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_banned_by_fkey"
            columns: ["banned_by"]
            isOneToOne: false
            referencedRelation: "v_user_ban_status"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      ban_user: {
        Args: { p_banned_by: string; p_reason: string; p_user_id: string }
        Returns: undefined
      }
      check_duplicate_analysis: {
        Args: { p_segments: Json; p_video_id: string }
        Returns: {
          job_id: string
          segments: Json
          status: string
        }[]
      }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      cleanup_old_security_events: { Args: never; Returns: undefined }
      create_notification: {
        Args: {
          p_claim_id?: string
          p_comment_id?: string
          p_edit_request_id?: string
          p_hand_id?: string
          p_link?: string
          p_message: string
          p_post_id?: string
          p_recipient_id: string
          p_sender_id: string
          p_title: string
          p_type: Database["public"]["Enums"]["notification_type"]
        }
        Returns: undefined
      }
      create_unsorted_stream: {
        Args: {
          p_name: string
          p_video_file?: string
          p_video_source?: string
          p_video_url?: string
        }
        Returns: string
      }
      get_cache_statistics: {
        Args: never
        Returns: {
          avg_hands_per_player: number
          most_recent_update: string
          oldest_cache: string
          total_cached_players: number
        }[]
      }
      get_category_usage_count: {
        Args: { category_id: string }
        Returns: number
      }
      get_child_categories: {
        Args: { p_parent_id: string }
        Returns: {
          aliases: string[]
          created_at: string
          display_name: string
          game_type: Database["public"]["Enums"]["game_type"]
          id: string
          is_active: boolean
          logo_url: string
          name: string
          parent_id: string
          priority: number
          region: string
          short_name: string
          theme_gradient: string
          theme_shadow: string
          theme_text: string
          updated_at: string
          website: string
        }[]
      }
      get_hand_details_batch: {
        Args: { hand_ids: string[] }
        Returns: {
          board_cards: string[]
          confidence: number
          created_at: string
          day_id: string
          day_info: Json
          description: string
          favorite: boolean
          hand_players: Json
          id: string
          number: string
          pot_size: number
          timestamp: string
          updated_at: string
        }[]
      }
      get_hand_tag_stats: {
        Args: never
        Returns: {
          count: number
          percentage: number
          tag_name: string
        }[]
      }
      get_player_claim_info: {
        Args: { player_uuid: string }
        Returns: {
          claim_status: Database["public"]["Enums"]["claim_status"]
          claimed: boolean
          claimed_by_nickname: string
          claimed_by_user_id: string
        }[]
      }
      get_player_counts_by_day: {
        Args: { day_ids: string[] }
        Returns: {
          day_id: string
          player_count: number
        }[]
      }
      get_player_hands_grouped: { Args: { player_uuid: string }; Returns: Json }
      get_players_with_hand_counts: {
        Args: never
        Returns: {
          country: string
          created_at: string
          hand_count: number
          hendon_mob_url: string
          id: string
          name: string
          photo_url: string
          total_winnings: number
          updated_at: string
        }[]
      }
      get_query_performance_summary: {
        Args: never
        Returns: {
          metric: string
          value: string
        }[]
      }
      get_root_categories: {
        Args: { p_game_type?: Database["public"]["Enums"]["game_type"] }
        Returns: {
          aliases: string[]
          created_at: string
          display_name: string
          game_type: Database["public"]["Enums"]["game_type"]
          id: string
          is_active: boolean
          logo_url: string
          name: string
          parent_id: string
          priority: number
          region: string
          short_name: string
          theme_gradient: string
          theme_shadow: string
          theme_text: string
          updated_at: string
          website: string
        }[]
      }
      get_unsorted_streams: {
        Args: never
        Returns: {
          created_at: string
          id: string
          name: string
          video_file: string
          video_source: string
          video_url: string
        }[]
      }
      get_user_tag_history: {
        Args: { user_id: string }
        Returns: {
          created_at: string
          hand_id: string
          hand_number: string
          tag_name: string
          tournament_name: string
        }[]
      }
      is_admin:
        | { Args: { user_id: string }; Returns: boolean }
        | { Args: never; Returns: boolean }
      is_admin_strict: { Args: never; Returns: boolean }
      is_banned: { Args: never; Returns: boolean }
      is_owner: { Args: { owner_id: string }; Returns: boolean }
      is_reporter: { Args: never; Returns: boolean }
      log_admin_action: {
        Args: {
          p_action: string
          p_admin_id: string
          p_details?: Json
          p_target_id?: string
          p_target_type: string
        }
        Returns: string
      }
      normalize_player_name: { Args: { name: string }; Returns: string }
      normalize_tournament_category: {
        Args: { input_category: string }
        Returns: string
      }
      organize_stream: {
        Args: { p_stream_id: string; p_sub_event_id: string }
        Returns: boolean
      }
      refresh_all_player_stats_cache: { Args: never; Returns: number }
      reset_performance_stats: { Args: never; Returns: string }
      save_hand_with_players_actions: {
        Args: {
          p_actions: Json
          p_board_flop: string[]
          p_board_river: string
          p_board_turn: string
          p_day_id: string
          p_description: string
          p_job_id: string
          p_number: string
          p_players: Json
          p_pot_size: number
          p_raw_data: Json
          p_stakes: string
          p_timestamp: string
          p_video_timestamp_end: number
          p_video_timestamp_start: number
        }
        Returns: string
      }
      search_hands_by_tags: {
        Args: { tag_names: string[] }
        Returns: {
          hand_id: string
          tag_count: number
        }[]
      }
      search_hands_fulltext: {
        Args: { max_results?: number; search_query: string }
        Returns: {
          description: string
          id: string
          number: string
          relevance: number
        }[]
      }
      search_players_fulltext: {
        Args: { max_results?: number; search_query: string }
        Returns: {
          country: string
          id: string
          name: string
          relevance: number
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unban_user: { Args: { p_user_id: string }; Returns: undefined }
    }
    Enums: {
      claim_status: "pending" | "approved" | "rejected"
      game_type: "tournament" | "cash_game" | "both"
      notification_type:
        | "comment"
        | "reply"
        | "like_post"
        | "like_comment"
        | "edit_approved"
        | "edit_rejected"
        | "claim_approved"
        | "claim_rejected"
        | "mention"
        | "timecode_submitted"
        | "timecode_approved"
        | "timecode_rejected"
        | "timecode_ai_completed"
        | "timecode_review_ready"
      verification_method: "social_media" | "email" | "admin" | "other"
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
      claim_status: ["pending", "approved", "rejected"],
      game_type: ["tournament", "cash_game", "both"],
      notification_type: [
        "comment",
        "reply",
        "like_post",
        "like_comment",
        "edit_approved",
        "edit_rejected",
        "claim_approved",
        "claim_rejected",
        "mention",
        "timecode_submitted",
        "timecode_approved",
        "timecode_rejected",
        "timecode_ai_completed",
        "timecode_review_ready",
      ],
      verification_method: ["social_media", "email", "admin", "other"],
    },
  },
} as const
