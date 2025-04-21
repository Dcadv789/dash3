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
      companies: {
        Row: {
          id: string
          name: string
          trading_name: string
          cnpj: string
          is_active: boolean
          created_at: string
          updated_at: string
          contract_start_date: string | null
        }
        Insert: {
          id?: string
          name: string
          trading_name: string
          cnpj: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          contract_start_date?: string | null
        }
        Update: {
          id?: string
          name?: string
          trading_name?: string
          cnpj?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
          contract_start_date?: string | null
        }
      }
      company_partners: {
        Row: {
          id: string
          company_id: string
          name: string
          cpf: string
          role: string
          ownership_percentage: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          cpf: string
          role: string
          ownership_percentage: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          cpf?: string
          role?: string
          ownership_percentage?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      system_users: {
        Row: {
          id: string
          auth_user_id: string
          name: string
          email: string
          company_id: string | null
          role: 'master' | 'consultor' | 'cliente' | 'colab'
          is_active: boolean
          phone: string | null
          avatar_url: string | null
          has_all_companies_access: boolean
          created_at: string
          updated_at: string
        }
      }
    }
  }
}