/**
 * TYPES AUTOMÁTICOS DO SUPABASE
 * Gerados a partir do schema SQL real
 * ⚠️ NÃO EDITAR MANUALMENTE - Regenerar quando schema SQL mudar
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      activity_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          entity_type: string
          entity_id: string | null
          description: string
          metadata: Json
          ip_address: string | null
          user_agent: string | null
          created_at: string
          company_id: string | null
          category: string
          target_type: string | null
          target_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          entity_type: string
          entity_id?: string | null
          description: string
          metadata?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
          company_id?: string | null
          category?: string
          target_type?: string | null
          target_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          entity_type?: string
          entity_id?: string | null
          description?: string
          metadata?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
          company_id?: string | null
          category?: string
          target_type?: string | null
          target_id?: string | null
        }
      }
      chats: {
        Row: {
          id: string
          participants: string[]
          type: string
          freight_id: string | null
          last_message: Json | null
          unread_count: Json
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          participants: string[]
          type?: string
          freight_id?: string | null
          last_message?: Json | null
          unread_count?: Json
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          participants?: string[]
          type?: string
          freight_id?: string | null
          last_message?: Json | null
          unread_count?: Json
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          user_id: string
          company_name: string
          cnpj: string
          trading_name: string | null
          company_type: string
          state_registration: string | null
          municipal_registration: string | null
          phone: string | null
          website: string | null
          description: string | null
          address: Json | null
          certifications: Json
          fleet_size: number
          operating_states: string[]
          created_at: string
          updated_at: string
          representative_name: string | null
          representative_cpf: string | null
          representative_rg: string | null
          representative_phone: string | null
          representative_email: string | null
          representative_role: string | null
          representative_cnh: string | null
          rntrc: string | null
          rntrc_expiry: string | null
          is_individual: boolean
          main_cpf: string | null
          corporate_email: string | null
          logo_url: string | null
          company_subtype: string
          rntrc_status: string
          ocb_registration: string | null
        }
        Insert: {
          id?: string
          user_id: string
          company_name: string
          cnpj: string
          trading_name?: string | null
          company_type: string
          state_registration?: string | null
          municipal_registration?: string | null
          phone?: string | null
          website?: string | null
          description?: string | null
          address?: Json | null
          certifications?: Json
          fleet_size?: number
          operating_states?: string[]
          created_at?: string
          updated_at?: string
          representative_name?: string | null
          representative_cpf?: string | null
          representative_rg?: string | null
          representative_phone?: string | null
          representative_email?: string | null
          representative_role?: string | null
          representative_cnh?: string | null
          rntrc?: string | null
          rntrc_expiry?: string | null
          is_individual?: boolean
          main_cpf?: string | null
          corporate_email?: string | null
          logo_url?: string | null
          company_subtype?: string
          rntrc_status?: string
          ocb_registration?: string | null
        }
        Update: Partial<Database['public']['Tables']['companies']['Insert']>
      }
      drivers: {
        Row: {
          id: string
          user_id: string
          cnh: string
          cnh_category: string
          cnh_expiry: string | null
          experience_years: number
          specializations: string[]
          available: boolean
          current_location: Json | null
          preferred_routes: Json
          created_at: string
          updated_at: string
          name: string | null
          cpf: string | null
          rg: string | null
          birth_date: string | null
          phone: string | null
          profile_image: string | null
          rating: number
          completed_trips: number
          rntrc: string | null
          rntrc_expiry: string | null
          vehicle_type: string | null
          vehicle_plate: string | null
          vehicle_model: string | null
          vehicle_year: string | null
          renavam: string | null
          antt_vehicle: string | null
          vehicle_types: string[] | null
          body_types: string[] | null
          vehicle_capacity: number | null
          trailer_type: string | null
          address: Json
          availability_expires_at: string | null
          rntrc_status: string
          driver_classification: string
          payment_account_holder: string
          payment_account_holder_name: string | null
          payment_account_holder_doc: string | null
        }
        Insert: {
          id?: string
          user_id: string
          cnh: string
          cnh_category: string
          cnh_expiry?: string | null
          experience_years?: number
          specializations?: string[]
          available?: boolean
          current_location?: Json | null
          preferred_routes?: Json
          created_at?: string
          updated_at?: string
          name?: string | null
          cpf?: string | null
          rg?: string | null
          birth_date?: string | null
          phone?: string | null
          profile_image?: string | null
          rating?: number
          completed_trips?: number
          rntrc?: string | null
          rntrc_expiry?: string | null
          vehicle_type?: string | null
          vehicle_plate?: string | null
          vehicle_model?: string | null
          vehicle_year?: string | null
          renavam?: string | null
          antt_vehicle?: string | null
          vehicle_types?: string[] | null
          body_types?: string[] | null
          vehicle_capacity?: number | null
          trailer_type?: string | null
          address?: Json
          availability_expires_at?: string | null
          rntrc_status?: string
          driver_classification?: string
          payment_account_holder?: string
          payment_account_holder_name?: string | null
          payment_account_holder_doc?: string | null
        }
        Update: Partial<Database['public']['Tables']['drivers']['Insert']>
      }
      freights: {
        Row: {
          id: string
          publisher_id: string
          title: string
          description: string | null
          cargo_type: string
          weight_kg: number | null
          volume_m3: number | null
          quantity: number | null
          value_estimate: number | null
          origin_address: string
          origin_city: string
          origin_state: string
          origin_coordinates: Json | null
          destination_address: string
          destination_city: string
          destination_state: string
          destination_coordinates: Json | null
          pickup_date: string | null
          delivery_date: string | null
          status: string
          visibility: string
          requirements: Json
          vehicle_types: string[]
          is_urgent: boolean
          is_fractioned: boolean
          is_full_load: boolean
          views_count: number
          created_at: string
          updated_at: string
          expires_at: string | null
          metadata: Json
          origin_cep: string | null
          destination_cep: string | null
          accepted_driver_id: string | null
          accepted_driver_name: string | null
          freight_code: string | null
          completed_at: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
          distance_km: number | null
          duration_hours: number | null
          publisher_phone: string | null
          operation_type: string | null
          load_classification: string | null
          piso_minimo_valor: number | null
          piso_minimo_calculado_em: string | null
          abaixo_do_piso: boolean
          ciot_status: string
          vale_pedagio_status: string
          payment_account_type: string | null
          advance_payment_percent: number | null
        }
        Insert: {
          id?: string
          publisher_id: string
          title: string
          description?: string | null
          cargo_type: string
          weight_kg?: number | null
          volume_m3?: number | null
          quantity?: number | null
          value_estimate?: number | null
          origin_address: string
          origin_city: string
          origin_state: string
          origin_coordinates?: Json | null
          destination_address: string
          destination_city: string
          destination_state: string
          destination_coordinates?: Json | null
          pickup_date?: string | null
          delivery_date?: string | null
          status?: string
          visibility?: string
          requirements?: Json
          vehicle_types?: string[]
          is_urgent?: boolean
          is_fractioned?: boolean
          is_full_load?: boolean
          views_count?: number
          created_at?: string
          updated_at?: string
          expires_at?: string | null
          metadata?: Json
          origin_cep?: string | null
          destination_cep?: string | null
          accepted_driver_id?: string | null
          accepted_driver_name?: string | null
          freight_code?: string | null
          completed_at?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
          distance_km?: number | null
          duration_hours?: number | null
          publisher_phone?: string | null
          operation_type?: string | null
          load_classification?: string | null
          piso_minimo_valor?: number | null
          piso_minimo_calculado_em?: string | null
          abaixo_do_piso?: boolean
          ciot_status?: string
          vale_pedagio_status?: string
          payment_account_type?: string | null
          advance_payment_percent?: number | null
        }
        Update: Partial<Database['public']['Tables']['freights']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          phone: string | null
          cpf: string | null
          cnpj: string | null
          user_type: string
          avatar_url: string | null
          bio: string | null
          rating: number
          total_freights: number
          completed_freights: number
          verification_status: string
          is_active: boolean
          email_verified: boolean
          created_at: string
          updated_at: string
          last_login_at: string | null
          metadata: Json
          city: string | null
          state: string | null
          is_online: boolean
          last_seen: string | null
          total_ratings: number
          total_distance_km: number
          total_earnings: number
          cancelled_freights: number
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          phone?: string | null
          cpf?: string | null
          cnpj?: string | null
          user_type: string
          avatar_url?: string | null
          bio?: string | null
          rating?: number
          total_freights?: number
          completed_freights?: number
          verification_status?: string
          is_active?: boolean
          email_verified?: boolean
          created_at?: string
          updated_at?: string
          last_login_at?: string | null
          metadata?: Json
          city?: string | null
          state?: string | null
          is_online?: boolean
          last_seen?: string | null
          total_ratings?: number
          total_distance_km?: number
          total_earnings?: number
          cancelled_freights?: number
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      ratings: {
        Row: {
          id: string
          freight_id: string | null
          evaluator_id: string
          target_id: string
          overall_rating: number
          comment: string | null
          categories: Json
          created_at: string
          updated_at: string
          freight_code: string | null
          target_name: string | null
          target_type: string | null
          evaluator_name: string | null
          evaluator_type: string | null
          punctuality_rating: number
          communication_rating: number
          professionalism_rating: number
        }
        Insert: {
          id?: string
          freight_id?: string | null
          evaluator_id: string
          target_id: string
          overall_rating: number
          comment?: string | null
          categories?: Json
          created_at?: string
          updated_at?: string
          freight_code?: string | null
          target_name?: string | null
          target_type?: string | null
          evaluator_name?: string | null
          evaluator_type?: string | null
          punctuality_rating?: number
          communication_rating?: number
          professionalism_rating?: number
        }
        Update: Partial<Database['public']['Tables']['ratings']['Insert']>
      }
      preferred_routes: {
        Row: {
          id: string
          driver_id: string
          origin: Json
          destination: Json
          priority: string
          notes: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          origin_city: string | null
          origin_state: string | null
          destination_city: string | null
          destination_state: string | null
          description: string | null
          available_from: string | null
          available_until: string | null
          vehicle_types: string[]
          capacity_kg: number | null
          preferred_cargo_types: string[]
          price_per_km: number | null
          minimum_value: number | null
          accepts_partial_load: boolean
          views_count: number
          contacts_count: number
          metadata: Json
        }
        Insert: {
          id?: string
          driver_id: string
          origin: Json
          destination: Json
          priority?: string
          notes?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
          origin_city?: string | null
          origin_state?: string | null
          destination_city?: string | null
          destination_state?: string | null
          description?: string | null
          available_from?: string | null
          available_until?: string | null
          vehicle_types?: string[]
          capacity_kg?: number | null
          preferred_cargo_types?: string[]
          price_per_km?: number | null
          minimum_value?: number | null
          accepts_partial_load?: boolean
          views_count?: number
          contacts_count?: number
          metadata?: Json
        }
        Update: Partial<Database['public']['Tables']['preferred_routes']['Insert']>
      }
      transactions: {
        Row: {
          id: string
          freight_id: string | null
          payer_id: string
          receiver_id: string
          amount: number
          fee: number
          net_amount: number
          payment_method: string
          payment_status: string
          transaction_type: string
          external_id: string | null
          receipt_path: string | null
          processed_at: string | null
          created_at: string
          updated_at: string
          metadata: Json
        }
        Insert: {
          id?: string
          freight_id?: string | null
          payer_id: string
          receiver_id: string
          amount: number
          fee?: number
          net_amount: number
          payment_method: string
          payment_status?: string
          transaction_type: string
          external_id?: string | null
          receipt_path?: string | null
          processed_at?: string | null
          created_at?: string
          updated_at?: string
          metadata?: Json
        }
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
      }
      piso_minimo_coefficients: {
        Row: {
          id: string
          categoria_carga: string
          tabela: string
          eixos: number
          ccd: number
          cc: number
          fonte: string | null
          needs_verification: boolean
          vigente_desde: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          categoria_carga: string
          tabela?: string
          eixos: number
          ccd: number
          cc: number
          fonte?: string | null
          needs_verification?: boolean
          vigente_desde?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: Partial<Database['public']['Tables']['piso_minimo_coefficients']['Insert']>
      }
      insurance_policies: {
        Row: {
          id: string
          owner_type: string
          owner_id: string
          policy_type: string
          insurer_name: string | null
          policy_number: string | null
          valid_from: string | null
          valid_until: string
          status: string
          document_url: string | null
          verified_by: string | null
          verified_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_type: string
          owner_id: string
          policy_type: string
          insurer_name?: string | null
          policy_number?: string | null
          valid_from?: string | null
          valid_until: string
          status?: string
          document_url?: string | null
          verified_by?: string | null
          verified_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['insurance_policies']['Insert']>
      }
      rntrc_verifications: {
        Row: {
          id: string
          owner_type: string
          owner_id: string
          rntrc_number: string | null
          status: string
          method: string
          checked_by: string | null
          checked_at: string
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          owner_type: string
          owner_id: string
          rntrc_number?: string | null
          status?: string
          method?: string
          checked_by?: string | null
          checked_at?: string
          notes?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['rntrc_verifications']['Insert']>
      }
      ciot_operations: {
        Row: {
          id: string
          freight_id: string
          ciot_number: string | null
          status: string
          provider: string
          operation_type: string | null
          contratante_id: string | null
          contratado_id: string | null
          subcontratado_id: string | null
          valor_operacao: number | null
          piso_minimo_aplicavel: number | null
          generated_at: string | null
          generated_by: string | null
          blocked_reason: string | null
          raw_response: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          freight_id: string
          ciot_number?: string | null
          status?: string
          provider?: string
          operation_type?: string | null
          contratante_id?: string | null
          contratado_id?: string | null
          subcontratado_id?: string | null
          valor_operacao?: number | null
          piso_minimo_aplicavel?: number | null
          generated_at?: string | null
          generated_by?: string | null
          blocked_reason?: string | null
          raw_response?: Json
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['ciot_operations']['Insert']>
      }
      mdfe_records: {
        Row: {
          id: string
          freight_id: string
          numero_mdfe: string | null
          chave_acesso: string | null
          status: string
          ciot_operation_id: string | null
          issued_at: string | null
          issued_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          freight_id: string
          numero_mdfe?: string | null
          chave_acesso?: string | null
          status?: string
          ciot_operation_id?: string | null
          issued_at?: string | null
          issued_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['mdfe_records']['Insert']>
      }
      vale_pedagio_records: {
        Row: {
          id: string
          freight_id: string
          provider: string
          tag_number: string | null
          valor: number | null
          status: string
          registered_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          freight_id: string
          provider?: string
          tag_number?: string | null
          valor?: number | null
          status?: string
          registered_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['vale_pedagio_records']['Insert']>
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}