export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      annotations: {
        Row: {
          color: string;
          created_at: string;
          document_id: string;
          id: string;
          kind: string;
          note: string | null;
          quote: string | null;
          section_id: string | null;
        };
        Insert: {
          color?: string;
          created_at?: string;
          document_id: string;
          id?: string;
          kind?: string;
          note?: string | null;
          quote?: string | null;
          section_id?: string | null;
        };
        Update: {
          color?: string;
          created_at?: string;
          document_id?: string;
          id?: string;
          kind?: string;
          note?: string | null;
          quote?: string | null;
          section_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "annotations_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      document_sections: {
        Row: {
          body: string;
          created_at: string;
          document_id: string;
          heading: string | null;
          heading_level: number;
          id: string;
          position: number;
        };
        Insert: {
          body?: string;
          created_at?: string;
          document_id: string;
          heading?: string | null;
          heading_level?: number;
          id?: string;
          position?: number;
        };
        Update: {
          body?: string;
          created_at?: string;
          document_id?: string;
          heading?: string | null;
          heading_level?: number;
          id?: string;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: "document_sections_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          accent: string;
          author: string | null;
          created_at: string;
          estimated_minutes: number;
          excerpt: string | null;
          file_type: string;
          google_doc_id: string | null;
          google_revision_id: string | null;
          id: string;
          last_synced_at: string | null;
          source: string;
          sync_status: string;
          title: string;
          updated_at: string;
          word_count: number;
        };
        Insert: {
          accent?: string;
          author?: string | null;
          created_at?: string;
          estimated_minutes?: number;
          excerpt?: string | null;
          file_type?: string;
          google_doc_id?: string | null;
          google_revision_id?: string | null;
          id?: string;
          last_synced_at?: string | null;
          source?: string;
          sync_status?: string;
          title: string;
          updated_at?: string;
          word_count?: number;
        };
        Update: {
          accent?: string;
          author?: string | null;
          created_at?: string;
          estimated_minutes?: number;
          excerpt?: string | null;
          file_type?: string;
          google_doc_id?: string | null;
          google_revision_id?: string | null;
          id?: string;
          last_synced_at?: string | null;
          source?: string;
          sync_status?: string;
          title?: string;
          updated_at?: string;
          word_count?: number;
        };
        Relationships: [];
      };
      reading_progress: {
        Row: {
          completed: boolean;
          document_id: string;
          id: string;
          last_section_id: string | null;
          minutes_read: number;
          percent: number;
          updated_at: string;
        };
        Insert: {
          completed?: boolean;
          document_id: string;
          id?: string;
          last_section_id?: string | null;
          minutes_read?: number;
          percent?: number;
          updated_at?: string;
        };
        Update: {
          completed?: boolean;
          document_id?: string;
          id?: string;
          last_section_id?: string | null;
          minutes_read?: number;
          percent?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reading_progress_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: true;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      sync_jobs: {
        Row: {
          documents_synced: number;
          finished_at: string | null;
          id: string;
          message: string | null;
          source_id: string | null;
          started_at: string;
          status: string;
        };
        Insert: {
          documents_synced?: number;
          finished_at?: string | null;
          id?: string;
          message?: string | null;
          source_id?: string | null;
          started_at?: string;
          status?: string;
        };
        Update: {
          documents_synced?: number;
          finished_at?: string | null;
          id?: string;
          message?: string | null;
          source_id?: string | null;
          started_at?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sync_jobs_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sync_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      sync_sources: {
        Row: {
          account_label: string | null;
          auto_sync: boolean;
          created_at: string;
          display_name: string;
          id: string;
          last_sync_at: string | null;
          mode: string;
          provider: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          account_label?: string | null;
          auto_sync?: boolean;
          created_at?: string;
          display_name?: string;
          id?: string;
          last_sync_at?: string | null;
          mode?: string;
          provider?: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          account_label?: string | null;
          auto_sync?: boolean;
          created_at?: string;
          display_name?: string;
          id?: string;
          last_sync_at?: string | null;
          mode?: string;
          provider?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
