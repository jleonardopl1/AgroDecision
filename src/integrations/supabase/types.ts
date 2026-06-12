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
      alertas: {
        Row: {
          ativo: boolean
          canais: string[]
          commodity: Database["public"]["Enums"]["commodity"] | null
          cooperado_id: string
          created_at: string
          id: string
          operador: string
          par_cambio: string | null
          tipo: string
          ultimo_disparo: string | null
          valor_alvo: number | null
        }
        Insert: {
          ativo?: boolean
          canais?: string[]
          commodity?: Database["public"]["Enums"]["commodity"] | null
          cooperado_id: string
          created_at?: string
          id?: string
          operador?: string
          par_cambio?: string | null
          tipo: string
          ultimo_disparo?: string | null
          valor_alvo?: number | null
        }
        Update: {
          ativo?: boolean
          canais?: string[]
          commodity?: Database["public"]["Enums"]["commodity"] | null
          cooperado_id?: string
          created_at?: string
          id?: string
          operador?: string
          par_cambio?: string | null
          tipo?: string
          ultimo_disparo?: string | null
          valor_alvo?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alertas_cooperado_id_fkey"
            columns: ["cooperado_id"]
            isOneToOne: false
            referencedRelation: "cooperados"
            referencedColumns: ["id"]
          },
        ]
      }
      cambio_cache: {
        Row: {
          capturado_em: string
          cotacao: number
          id: string
          par: string
          variacao_pct: number | null
        }
        Insert: {
          capturado_em?: string
          cotacao: number
          id?: string
          par: string
          variacao_pct?: number | null
        }
        Update: {
          capturado_em?: string
          cotacao?: number
          id?: string
          par?: string
          variacao_pct?: number | null
        }
        Relationships: []
      }
      commodities_config: {
        Row: {
          ativo: boolean
          commodity: Database["public"]["Enums"]["commodity"]
          cooperativa_id: string
          id: string
        }
        Insert: {
          ativo?: boolean
          commodity: Database["public"]["Enums"]["commodity"]
          cooperativa_id: string
          id?: string
        }
        Update: {
          ativo?: boolean
          commodity?: Database["public"]["Enums"]["commodity"]
          cooperativa_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commodities_config_cooperativa_id_fkey"
            columns: ["cooperativa_id"]
            isOneToOne: false
            referencedRelation: "cooperativas"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperados: {
        Row: {
          area_ha: number | null
          cooperativa_id: string
          cpf_cnpj: string | null
          created_at: string
          culturas: string[]
          email: string
          id: string
          nome: string
          plano: string
          role: string
          stripe_subscription_id: string | null
        }
        Insert: {
          area_ha?: number | null
          cooperativa_id: string
          cpf_cnpj?: string | null
          created_at?: string
          culturas?: string[]
          email: string
          id: string
          nome: string
          plano?: string
          role?: string
          stripe_subscription_id?: string | null
        }
        Update: {
          area_ha?: number | null
          cooperativa_id?: string
          cpf_cnpj?: string | null
          created_at?: string
          culturas?: string[]
          email?: string
          id?: string
          nome?: string
          plano?: string
          role?: string
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cooperados_cooperativa_id_fkey"
            columns: ["cooperativa_id"]
            isOneToOne: false
            referencedRelation: "cooperativas"
            referencedColumns: ["id"]
          },
        ]
      }
      cooperativas: {
        Row: {
          cor_primaria: string
          cor_secundaria: string
          created_at: string
          estado: string | null
          id: string
          logo_url: string | null
          nome: string
          plano: string
          seats: number
          slug: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          cor_primaria?: string
          cor_secundaria?: string
          created_at?: string
          estado?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          plano?: string
          seats?: number
          slug: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          cor_primaria?: string
          cor_secundaria?: string
          created_at?: string
          estado?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          plano?: string
          seats?: number
          slug?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cotacoes_cache: {
        Row: {
          capturado_em: string
          commodity: Database["public"]["Enums"]["commodity"]
          fonte: string
          id: string
          preco: number
          regiao: string | null
          tipo: string
          unidade: string
          variacao_pct: number | null
          vencimento: string | null
        }
        Insert: {
          capturado_em?: string
          commodity: Database["public"]["Enums"]["commodity"]
          fonte: string
          id?: string
          preco: number
          regiao?: string | null
          tipo?: string
          unidade?: string
          variacao_pct?: number | null
          vencimento?: string | null
        }
        Update: {
          capturado_em?: string
          commodity?: Database["public"]["Enums"]["commodity"]
          fonte?: string
          id?: string
          preco?: number
          regiao?: string | null
          tipo?: string
          unidade?: string
          variacao_pct?: number | null
          vencimento?: string | null
        }
        Relationships: []
      }
      custos_producao: {
        Row: {
          commodity: Database["public"]["Enums"]["commodity"]
          cooperado_id: string
          created_at: string
          custo_por_saca: number
          id: string
          safra: string
        }
        Insert: {
          commodity: Database["public"]["Enums"]["commodity"]
          cooperado_id: string
          created_at?: string
          custo_por_saca: number
          id?: string
          safra: string
        }
        Update: {
          commodity?: Database["public"]["Enums"]["commodity"]
          cooperado_id?: string
          created_at?: string
          custo_por_saca?: number
          id?: string
          safra?: string
        }
        Relationships: [
          {
            foreignKeyName: "custos_producao_cooperado_id_fkey"
            columns: ["cooperado_id"]
            isOneToOne: false
            referencedRelation: "cooperados"
            referencedColumns: ["id"]
          },
        ]
      }
      relatorios: {
        Row: {
          aberto: boolean
          cooperado_id: string
          created_at: string
          enviado_em: string | null
          id: string
          pdf_url: string | null
          semana: string
        }
        Insert: {
          aberto?: boolean
          cooperado_id: string
          created_at?: string
          enviado_em?: string | null
          id?: string
          pdf_url?: string | null
          semana: string
        }
        Update: {
          aberto?: boolean
          cooperado_id?: string
          created_at?: string
          enviado_em?: string | null
          id?: string
          pdf_url?: string | null
          semana?: string
        }
        Relationships: [
          {
            foreignKeyName: "relatorios_cooperado_id_fkey"
            columns: ["cooperado_id"]
            isOneToOne: false
            referencedRelation: "cooperados"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_share_events: {
        Row: {
          competencia: string
          cooperado_id: string | null
          cooperativa_id: string
          created_at: string
          id: string
          origem: string
          share_pct: number
          stripe_invoice_id: string | null
          valor_assinatura: number
          valor_share: number | null
        }
        Insert: {
          competencia: string
          cooperado_id?: string | null
          cooperativa_id: string
          created_at?: string
          id?: string
          origem?: string
          share_pct?: number
          stripe_invoice_id?: string | null
          valor_assinatura: number
          valor_share?: number | null
        }
        Update: {
          competencia?: string
          cooperado_id?: string | null
          cooperativa_id?: string
          created_at?: string
          id?: string
          origem?: string
          share_pct?: number
          stripe_invoice_id?: string | null
          valor_assinatura?: number
          valor_share?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_share_events_cooperado_id_fkey"
            columns: ["cooperado_id"]
            isOneToOne: false
            referencedRelation: "cooperados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_share_events_cooperativa_id_fkey"
            columns: ["cooperativa_id"]
            isOneToOne: false
            referencedRelation: "cooperativas"
            referencedColumns: ["id"]
          },
        ]
      }
      sinais_ia: {
        Row: {
          commodity: Database["public"]["Enums"]["commodity"]
          confianca: number | null
          fatores: Json
          gerado_em: string
          id: string
          justificativa: string
          modelo: string
          recomendacao: string
          sinal: string
        }
        Insert: {
          commodity: Database["public"]["Enums"]["commodity"]
          confianca?: number | null
          fatores?: Json
          gerado_em?: string
          id?: string
          justificativa: string
          modelo?: string
          recomendacao: string
          sinal: string
        }
        Update: {
          commodity?: Database["public"]["Enums"]["commodity"]
          confianca?: number | null
          fatores?: Json
          gerado_em?: string
          id?: string
          justificativa?: string
          modelo?: string
          recomendacao?: string
          sinal?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_cooperativa_id: { Args: never; Returns: string }
      get_coop_branding: {
        Args: { p_slug: string }
        Returns: {
          cor_primaria: string
          cor_secundaria: string
          logo_url: string
          nome: string
          slug: string
        }[]
      }
      is_coop_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      commodity: "soja" | "milho" | "cafe" | "algodao" | "boi"
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
      commodity: ["soja", "milho", "cafe", "algodao", "boi"],
    },
  },
} as const
