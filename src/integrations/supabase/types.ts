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
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      click_events: {
        Row: {
          created_at: string
          id: string
          product_slug: string
          referer: string | null
          user_agent: string | null
          variant_label: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_slug: string
          referer?: string | null
          user_agent?: string | null
          variant_label?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_slug?: string
          referer?: string | null
          user_agent?: string | null
          variant_label?: string | null
        }
        Relationships: []
      }
      product_import_queue: {
        Row: {
          attempts: number
          created_at: string
          digiseller_id: string
          id: string
          last_error: string | null
          processed_at: string | null
          source_product_id: string | null
          status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          digiseller_id: string
          id?: string
          last_error?: string | null
          processed_at?: string | null
          source_product_id?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          digiseller_id?: string
          id?: string
          last_error?: string | null
          processed_at?: string | null
          source_product_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_import_queue_source_product_id_fkey"
            columns: ["source_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          label: string
          price_rub: number | null
          product_id: string
          sort_order: number
          usd_amount: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          price_rub?: number | null
          product_id: string
          sort_order?: number
          usd_amount?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          price_rub?: number | null
          product_id?: string
          sort_order?: number
          usd_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          advantages: Json
          badge: string | null
          buy_url: string | null
          category_slug: string
          created_at: string
          description: string
          details_url: string | null
          digiseller_category_id: string | null
          digiseller_id: string | null
          faq: Json
          features: Json
          full_description: string | null
          id: string
          image: string
          image_meta: Json
          images: Json
          in_stock: boolean
          instructions: string | null
          is_active: boolean
          keywords_grouped: Json
          last_synced_at: string | null
          old_price: number | null
          price: number
          rating: number
          reviews: number
          sales: number
          seller: string
          seller_rating: number
          seo_description: string | null
          seo_generated_at: string | null
          seo_h1: string | null
          seo_keywords: string | null
          seo_locked: boolean
          seo_score: number
          seo_slug: string | null
          seo_title: string | null
          short_description: string | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
          variant_label: string | null
          videos: Json
        }
        Insert: {
          advantages?: Json
          badge?: string | null
          buy_url?: string | null
          category_slug: string
          created_at?: string
          description?: string
          details_url?: string | null
          digiseller_category_id?: string | null
          digiseller_id?: string | null
          faq?: Json
          features?: Json
          full_description?: string | null
          id?: string
          image?: string
          image_meta?: Json
          images?: Json
          in_stock?: boolean
          instructions?: string | null
          is_active?: boolean
          keywords_grouped?: Json
          last_synced_at?: string | null
          old_price?: number | null
          price?: number
          rating?: number
          reviews?: number
          sales?: number
          seller?: string
          seller_rating?: number
          seo_description?: string | null
          seo_generated_at?: string | null
          seo_h1?: string | null
          seo_keywords?: string | null
          seo_locked?: boolean
          seo_score?: number
          seo_slug?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
          variant_label?: string | null
          videos?: Json
        }
        Update: {
          advantages?: Json
          badge?: string | null
          buy_url?: string | null
          category_slug?: string
          created_at?: string
          description?: string
          details_url?: string | null
          digiseller_category_id?: string | null
          digiseller_id?: string | null
          faq?: Json
          features?: Json
          full_description?: string | null
          id?: string
          image?: string
          image_meta?: Json
          images?: Json
          in_stock?: boolean
          instructions?: string | null
          is_active?: boolean
          keywords_grouped?: Json
          last_synced_at?: string | null
          old_price?: number | null
          price?: number
          rating?: number
          reviews?: number
          sales?: number
          seller?: string
          seller_rating?: number
          seo_description?: string | null
          seo_generated_at?: string | null
          seo_h1?: string | null
          seo_keywords?: string | null
          seo_locked?: boolean
          seo_score?: number
          seo_slug?: string | null
          seo_title?: string | null
          short_description?: string | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          variant_label?: string | null
          videos?: Json
        }
        Relationships: [
          {
            foreignKeyName: "products_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["slug"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      site_texts: {
        Row: {
          body: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          slug?: string
          title?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
