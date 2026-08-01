export type SlotStatus = 'available' | 'locked' | 'booked'
export type BookingStatus = 'pending_payment' | 'confirmed' | 'cancelled' | 'completed'
export type PromoDiscountType = 'percent' | 'fixed'

export type Database = {
  public: {
    Tables: {
      backgrounds: {
        Row: {
          id: string
          name: string
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['backgrounds']['Insert']>
        Relationships: []
      }
      pricing_rules: {
        Row: {
          duration_hours: number
          price_kopecks: number
          label: string
        }
        Insert: {
          duration_hours: number
          price_kopecks: number
          label: string
        }
        Update: Partial<Database['public']['Tables']['pricing_rules']['Insert']>
        Relationships: []
      }
      slots: {
        Row: {
          id: string
          slot_date: string
          start_time: string
          end_time: string
          status: SlotStatus
          locked_until: string | null
          locked_by_token: string | null
          created_at: string
        }
        Insert: {
          id?: string
          slot_date: string
          start_time: string
          end_time: string
          status?: SlotStatus
          locked_until?: string | null
          locked_by_token?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['slots']['Insert']>
        Relationships: []
      }
      bookings: {
        Row: {
          id: string
          booking_code: string
          client_name: string
          client_phone: string
          client_email: string
          background_id: string | null
          guests_count: number
          with_pet: boolean
          comment: string | null
          pdn_consent: boolean
          duration_hours: number
          total_price_kopecks: number
          addon_kopecks: number
          discount_kopecks: number
          promo_code: string | null
          status: BookingStatus
          payment_provider: string | null
          payment_id: string | null
          paid_at: string | null
          cancelled_at: string | null
          refund_kopecks: number | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_code: string
          client_name: string
          client_phone: string
          client_email: string
          background_id?: string | null
          guests_count?: number
          with_pet?: boolean
          comment?: string | null
          pdn_consent: boolean
          duration_hours: number
          total_price_kopecks: number
          addon_kopecks?: number
          discount_kopecks?: number
          promo_code?: string | null
          status?: BookingStatus
          payment_provider?: string | null
          payment_id?: string | null
          paid_at?: string | null
          cancelled_at?: string | null
          refund_kopecks?: number | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>
        Relationships: []
      }
      promo_codes: {
        Row: {
          id: string
          code: string
          discount_type: PromoDiscountType
          discount_value: number
          usage_limit: number | null
          usage_count: number
          is_active: boolean
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          discount_type: PromoDiscountType
          discount_value: number
          usage_limit?: number | null
          usage_count?: number
          is_active?: boolean
          expires_at?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['promo_codes']['Insert']>
        Relationships: []
      }
      booking_slots: {
        Row: {
          booking_id: string
          slot_id: string
        }
        Insert: {
          booking_id: string
          slot_id: string
        }
        Update: Partial<Database['public']['Tables']['booking_slots']['Insert']>
        Relationships: []
      }
      gallery_photos: {
        Row: {
          id: string
          storage_path: string
          caption: string | null
          is_published: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          storage_path: string
          caption?: string | null
          is_published?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['gallery_photos']['Insert']>
        Relationships: []
      }
      admin_users: {
        Row: {
          user_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['admin_users']['Insert']>
        Relationships: []
      }
    }
    Views: {
      booking_details: {
        Row: {
          id: string
          booking_code: string
          client_name: string
          client_phone: string
          client_email: string
          guests_count: number
          with_pet: boolean
          comment: string | null
          duration_hours: number
          total_price_kopecks: number
          addon_kopecks: number
          discount_kopecks: number
          promo_code: string | null
          status: BookingStatus
          payment_provider: string | null
          paid_at: string | null
          cancelled_at: string | null
          refund_kopecks: number | null
          created_at: string
          background_name: string | null
          slot_date: string | null
          start_time: string | null
          end_time: string | null
          start_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      hold_slots: {
        Args: {
          p_slot_ids: string[]
          p_hold_token: string
          p_hold_minutes?: number
        }
        Returns: void
      }
      release_hold: {
        Args: { p_hold_token: string }
        Returns: void
      }
      release_expired_holds: {
        Args: Record<string, never>
        Returns: void
      }
      create_booking: {
        Args: {
          p_hold_token: string
          p_client_name: string
          p_client_phone: string
          p_client_email: string
          p_background_id: string
          p_guests_count: number
          p_with_pet: boolean
          p_comment: string | null
          p_pdn_consent: boolean
          p_duration_hours: number
          p_with_addon: boolean
          p_promo_code: string | null
        }
        Returns: {
          booking_id: string
          booking_code: string
          total_price_kopecks: number
          addon_kopecks: number
          discount_kopecks: number
        }[]
      }
      validate_promo_code: {
        Args: { p_code: string; p_subtotal_kopecks: number }
        Returns: { valid: boolean; discount_kopecks: number; message: string }[]
      }
      admin_confirm_payment: {
        Args: { p_booking_id: string }
        Returns: void
      }
      compute_refund_kopecks: {
        Args: { p_booking_id: string }
        Returns: number
      }
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      admin_cancel_booking: {
        Args: { p_booking_id: string }
        Returns: void
      }
    }
    Enums: Record<string, never>
  }
}
