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
      admins: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          password_hash: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          password_hash: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          password_hash?: string
        }
        Relationships: []
      }
      cards: {
        Row: {
          body: string
          category_id: string
          created_at: string
          header: string
          icon: string
          icon_style: string
          id: string
          open_link: string
          order: number
          sheet_filters: string[]
          view_link: string | null
        }
        Insert: {
          body?: string
          category_id: string
          created_at?: string
          header: string
          icon?: string
          icon_style?: string
          id?: string
          open_link: string
          order?: number
          sheet_filters?: string[]
          view_link?: string | null
        }
        Update: {
          body?: string
          category_id?: string
          created_at?: string
          header?: string
          icon?: string
          icon_style?: string
          id?: string
          open_link?: string
          order?: number
          sheet_filters?: string[]
          view_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          order: number
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name: string
          order?: number
          slug: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          order?: number
          slug?: string
        }
        Relationships: []
      }
      faq_audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      faq_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      faq_knowledge_sources: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          source_reference: string | null
          source_type: string
          topic_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          source_reference?: string | null
          source_type: string
          topic_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          source_reference?: string | null
          source_type?: string
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faq_knowledge_sources_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "faq_knowledge_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_knowledge_topics: {
        Row: {
          answer: string
          category_id: string
          created_at: string
          created_by: string | null
          id: string
          last_verified_at: string | null
          main_question: string
          priority: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          answer: string
          category_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_verified_at?: string | null
          main_question: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          answer?: string
          category_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_verified_at?: string | null
          main_question?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faq_knowledge_topics_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "faq_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      faq_question_variants: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          normalized_variant: string
          topic_id: string
          variant: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          normalized_variant: string
          topic_id: string
          variant: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          normalized_variant?: string
          topic_id?: string
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "faq_question_variants_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "faq_knowledge_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          category_id: string | null
          created_at: string
          description: string
          id: string
          storage_path: string | null
          title: string
          type: string
          url: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          storage_path?: string | null
          title: string
          type?: string
          url?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          storage_path?: string | null
          title?: string
          type?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          error_message: string | null
          id: string
          records_processed: number
          status: string
          sync_time: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          records_processed?: number
          status: string
          sync_time?: string
        }
        Update: {
          error_message?: string | null
          id?: string
          records_processed?: number
          status?: string
          sync_time?: string
        }
        Relationships: []
      }
      tutor_import_logs: {
        Row: {
          added_count: number
          deleted_count: number
          failed_count: number
          filename: string | null
          id: string
          imported_at: string
          imported_by: string | null
          status: string
          total_records: number
          updated_count: number
        }
        Insert: {
          added_count?: number
          deleted_count?: number
          failed_count?: number
          filename?: string | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          status?: string
          total_records?: number
          updated_count?: number
        }
        Update: {
          added_count?: number
          deleted_count?: number
          failed_count?: number
          filename?: string | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          status?: string
          total_records?: number
          updated_count?: number
        }
        Relationships: []
      }
      tutors: {
        Row: {
          created_at: string
          id: string
          must_change_password: boolean
          name: string
          password_hash: string
          tutor_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          must_change_password?: boolean
          name?: string
          password_hash: string
          tutor_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          must_change_password?: boolean
          name?: string
          password_hash?: string
          tutor_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      change_tutor_password: {
        Args: {
          _current_password: string
          _new_password: string
          _tutor_id: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      sync_tutors_from_sheet: { Args: { _rows: Json }; Returns: Json }
      verify_admin_login: {
        Args: { _email: string; _password: string }
        Returns: {
          email: string
          id: string
          name: string
        }[]
      }
      verify_tutor_login: {
        Args: { _password: string; _tutor_id: string }
        Returns: {
          id: string
          must_change_password: boolean
          name: string
          tutor_id: string
        }[]
      }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
