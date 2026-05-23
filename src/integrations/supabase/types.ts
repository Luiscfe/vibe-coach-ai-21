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
      adherence_scores: {
        Row: {
          created_at: string | null
          date: string
          id: string
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          score?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      cycle_logs: {
        Row: {
          created_at: string | null
          date: string
          id: string
          notes: string | null
          phase: Database["public"]["Enums"]["cycle_phase"] | null
          symptoms_bloating: number | null
          symptoms_cramp: number | null
          symptoms_fatigue: number | null
          symptoms_mood: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          phase?: Database["public"]["Enums"]["cycle_phase"] | null
          symptoms_bloating?: number | null
          symptoms_cramp?: number | null
          symptoms_fatigue?: number | null
          symptoms_mood?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          phase?: Database["public"]["Enums"]["cycle_phase"] | null
          symptoms_bloating?: number | null
          symptoms_cramp?: number | null
          symptoms_fatigue?: number | null
          symptoms_mood?: number | null
          user_id?: string
        }
        Relationships: []
      }
      eating_logs: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string | null
          datetime: string
          description: string | null
          evaluation: Database["public"]["Enums"]["meal_evaluation"] | null
          fat_g: number | null
          id: string
          image_url: string | null
          meal_type: string | null
          protein_g: number | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          datetime?: string
          description?: string | null
          evaluation?: Database["public"]["Enums"]["meal_evaluation"] | null
          fat_g?: number | null
          id?: string
          image_url?: string | null
          meal_type?: string | null
          protein_g?: number | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          datetime?: string
          description?: string | null
          evaluation?: Database["public"]["Enums"]["meal_evaluation"] | null
          fat_g?: number | null
          id?: string
          image_url?: string | null
          meal_type?: string | null
          protein_g?: number | null
          user_id?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          last_active_at: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          last_active_at?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          last_active_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          content: string
          created_at: string | null
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string | null
          goal: Database["public"]["Enums"]["user_goal"]
          id: string
          is_full: boolean | null
          member_count: number | null
        }
        Insert: {
          created_at?: string | null
          goal: Database["public"]["Enums"]["user_goal"]
          id?: string
          is_full?: boolean | null
          member_count?: number | null
        }
        Update: {
          created_at?: string | null
          goal?: Database["public"]["Enums"]["user_goal"]
          id?: string
          is_full?: boolean | null
          member_count?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          anchor_recorded_at: string | null
          anchor_text: string | null
          anchor_video_url: string | null
          birth_date: string | null
          created_at: string | null
          current_streak: number | null
          cycle_duration: number | null
          cycle_start_date: string | null
          daily_calorie_goal: number | null
          daily_carbs_goal: number | null
          daily_fat_goal: number | null
          daily_protein_goal: number | null
          device_token: string | null
          dietary_restrictions: string[] | null
          email: string | null
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          food_dislikes: string | null
          food_preferences: string | null
          gender: Database["public"]["Enums"]["user_gender"] | null
          goal: Database["public"]["Enums"]["user_goal"] | null
          group_alerts_enabled: boolean | null
          height: number | null
          id: string
          last_active_date: string | null
          longest_streak: number | null
          name: string
          onboarding_completed: boolean | null
          preferred_workout_time:
            | Database["public"]["Enums"]["workout_time"]
            | null
          sabotage_mode_enabled: boolean | null
          subscription_status: string | null
          tracks_cycle: boolean | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          anchor_recorded_at?: string | null
          anchor_text?: string | null
          anchor_video_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          current_streak?: number | null
          cycle_duration?: number | null
          cycle_start_date?: string | null
          daily_calorie_goal?: number | null
          daily_carbs_goal?: number | null
          daily_fat_goal?: number | null
          daily_protein_goal?: number | null
          device_token?: string | null
          dietary_restrictions?: string[] | null
          email?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          food_dislikes?: string | null
          food_preferences?: string | null
          gender?: Database["public"]["Enums"]["user_gender"] | null
          goal?: Database["public"]["Enums"]["user_goal"] | null
          group_alerts_enabled?: boolean | null
          height?: number | null
          id: string
          last_active_date?: string | null
          longest_streak?: number | null
          name: string
          onboarding_completed?: boolean | null
          preferred_workout_time?:
            | Database["public"]["Enums"]["workout_time"]
            | null
          sabotage_mode_enabled?: boolean | null
          subscription_status?: string | null
          tracks_cycle?: boolean | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          anchor_recorded_at?: string | null
          anchor_text?: string | null
          anchor_video_url?: string | null
          birth_date?: string | null
          created_at?: string | null
          current_streak?: number | null
          cycle_duration?: number | null
          cycle_start_date?: string | null
          daily_calorie_goal?: number | null
          daily_carbs_goal?: number | null
          daily_fat_goal?: number | null
          daily_protein_goal?: number | null
          device_token?: string | null
          dietary_restrictions?: string[] | null
          email?: string | null
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          food_dislikes?: string | null
          food_preferences?: string | null
          gender?: Database["public"]["Enums"]["user_gender"] | null
          goal?: Database["public"]["Enums"]["user_goal"] | null
          group_alerts_enabled?: boolean | null
          height?: number | null
          id?: string
          last_active_date?: string | null
          longest_streak?: number | null
          name?: string
          onboarding_completed?: boolean | null
          preferred_workout_time?:
            | Database["public"]["Enums"]["workout_time"]
            | null
          sabotage_mode_enabled?: boolean | null
          subscription_status?: string | null
          tracks_cycle?: boolean | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      user_memory: {
        Row: {
          content: string
          created_at: string | null
          id: string
          memory_type: Database["public"]["Enums"]["memory_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          memory_type: Database["public"]["Enums"]["memory_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          memory_type?: Database["public"]["Enums"]["memory_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          created_at: string | null
          date: string
          duration_minutes: number | null
          id: string
          muscle_group: string
          skip_reason: string | null
          status: Database["public"]["Enums"]["workout_status"]
          user_id: string
          workout_name: string | null
        }
        Insert: {
          created_at?: string | null
          date?: string
          duration_minutes?: number | null
          id?: string
          muscle_group: string
          skip_reason?: string | null
          status: Database["public"]["Enums"]["workout_status"]
          user_id: string
          workout_name?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          duration_minutes?: number | null
          id?: string
          muscle_group?: string
          skip_reason?: string | null
          status?: Database["public"]["Enums"]["workout_status"]
          user_id?: string
          workout_name?: string | null
        }
        Relationships: []
      }
      workout_plan: {
        Row: {
          day_of_week: number
          duration_minutes: number | null
          exercises: Json | null
          id: string
          intensity: number | null
          muscle_group: string
          updated_at: string | null
          user_id: string
          workout_name: string
        }
        Insert: {
          day_of_week: number
          duration_minutes?: number | null
          exercises?: Json | null
          id?: string
          intensity?: number | null
          muscle_group: string
          updated_at?: string | null
          user_id: string
          workout_name: string
        }
        Update: {
          day_of_week?: number
          duration_minutes?: number | null
          exercises?: Json | null
          id?: string
          intensity?: number | null
          muscle_group?: string
          updated_at?: string | null
          user_id?: string
          workout_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      group_member_profiles: {
        Row: {
          current_streak: number | null
          goal: Database["public"]["Enums"]["user_goal"] | null
          id: string | null
          name: string | null
        }
        Insert: {
          current_streak?: number | null
          goal?: Database["public"]["Enums"]["user_goal"] | null
          id?: string | null
          name?: string | null
        }
        Update: {
          current_streak?: number | null
          goal?: Database["public"]["Enums"]["user_goal"] | null
          id?: string | null
          name?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_group_member_profiles: {
        Args: { _user_ids: string[] }
        Returns: {
          current_streak: number
          goal: Database["public"]["Enums"]["user_goal"]
          id: string
          name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "admin"
      cycle_phase: "menstrual" | "folicular" | "ovulatoria" | "lutea"
      experience_level: "iniciante" | "intermediario" | "avancado"
      meal_evaluation: "boa" | "ruim" | "neutra"
      memory_type:
        | "food_dislike"
        | "food_preference"
        | "skip_pattern"
        | "emotional_state"
        | "injury"
        | "goal_change"
        | "schedule"
      user_gender: "feminino" | "masculino" | "outro"
      user_goal: "emagrecer" | "ganhar_massa" | "definir" | "saude_geral"
      workout_status: "concluido" | "pulado" | "parcial"
      workout_time: "manha" | "tarde" | "noite"
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
      app_role: ["user", "admin"],
      cycle_phase: ["menstrual", "folicular", "ovulatoria", "lutea"],
      experience_level: ["iniciante", "intermediario", "avancado"],
      meal_evaluation: ["boa", "ruim", "neutra"],
      memory_type: [
        "food_dislike",
        "food_preference",
        "skip_pattern",
        "emotional_state",
        "injury",
        "goal_change",
        "schedule",
      ],
      user_gender: ["feminino", "masculino", "outro"],
      user_goal: ["emagrecer", "ganhar_massa", "definir", "saude_geral"],
      workout_status: ["concluido", "pulado", "parcial"],
      workout_time: ["manha", "tarde", "noite"],
    },
  },
} as const
