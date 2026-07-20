// Generated from the connected MaxDock Supabase project on 2026-07-19.
// Regenerate after schema migrations. This file contains schema metadata only, not row data.

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
      appointment_audit_log: {
        Row: {
          action: string
          appointment_id: string
          changed_at: string
          changed_by: string | null
          id: number
          location_id: string
          new_values: Json | null
          old_values: Json | null
        }
        Insert: {
          action: string
          appointment_id: string
          changed_at?: string
          changed_by?: string | null
          id?: never
          location_id: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Update: {
          action?: string
          appointment_id?: string
          changed_at?: string
          changed_by?: string | null
          id?: never
          location_id?: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Relationships: []
      }
      appointment_types: {
        Row: {
          code: string
          created_at: string
          default_adjustment_minutes: number
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          default_adjustment_minutes?: number
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          default_adjustment_minutes?: number
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          after_hours_confirmed_at: string | null
          after_hours_confirmed_by: string | null
          appointment_type_code: string | null
          block_reason: string | null
          booking_reference: string
          cancellation_reason: string | null
          cancelled_at: string | null
          carrier_name: string | null
          company_name: string | null
          completed_at: string | null
          counterpart_dock_id: string | null
          created_at: string
          created_by: string | null
          direction: string | null
          dock_id: string
          end_at: string
          entry_kind: string
          external_reference: string | null
          handling_type_code: string | null
          id: string
          is_after_hours_override: boolean
          is_priority: boolean
          location_id: string
          notes: string | null
          requester_email: string | null
          requester_location_id: string | null
          requester_name: string | null
          requester_type: string | null
          schedule_range: unknown
          skid_count: number
          source: string
          start_at: string
          status: string
          truck_type_code: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          after_hours_confirmed_at?: string | null
          after_hours_confirmed_by?: string | null
          appointment_type_code?: string | null
          block_reason?: string | null
          booking_reference: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          carrier_name?: string | null
          company_name?: string | null
          completed_at?: string | null
          counterpart_dock_id?: string | null
          created_at?: string
          created_by?: string | null
          direction?: string | null
          dock_id: string
          end_at: string
          entry_kind?: string
          external_reference?: string | null
          handling_type_code?: string | null
          id?: string
          is_after_hours_override?: boolean
          is_priority?: boolean
          location_id: string
          notes?: string | null
          requester_email?: string | null
          requester_location_id?: string | null
          requester_name?: string | null
          requester_type?: string | null
          schedule_range?: unknown
          skid_count?: number
          source?: string
          start_at: string
          status?: string
          truck_type_code?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          after_hours_confirmed_at?: string | null
          after_hours_confirmed_by?: string | null
          appointment_type_code?: string | null
          block_reason?: string | null
          booking_reference?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          carrier_name?: string | null
          company_name?: string | null
          completed_at?: string | null
          counterpart_dock_id?: string | null
          created_at?: string
          created_by?: string | null
          direction?: string | null
          dock_id?: string
          end_at?: string
          entry_kind?: string
          external_reference?: string | null
          handling_type_code?: string | null
          id?: string
          is_after_hours_override?: boolean
          is_priority?: boolean
          location_id?: string
          notes?: string | null
          requester_email?: string | null
          requester_location_id?: string | null
          requester_name?: string | null
          requester_type?: string | null
          schedule_range?: unknown
          skid_count?: number
          source?: string
          start_at?: string
          status?: string
          truck_type_code?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_counterpart_dock_location_fk"
            columns: ["requester_location_id", "counterpart_dock_id"]
            isOneToOne: false
            referencedRelation: "docks"
            referencedColumns: ["location_id", "id"]
          },
          {
            foreignKeyName: "appointments_dock_location_fk"
            columns: ["dock_id", "location_id"]
            isOneToOne: false
            referencedRelation: "docks"
            referencedColumns: ["id", "location_id"]
          },
          {
            foreignKeyName: "appointments_location_handling_fk"
            columns: ["location_id", "handling_type_code"]
            isOneToOne: false
            referencedRelation: "location_handling_types"
            referencedColumns: ["location_id", "handling_type_code"]
          },
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_location_truck_fk"
            columns: ["location_id", "truck_type_code"]
            isOneToOne: false
            referencedRelation: "location_truck_types"
            referencedColumns: ["location_id", "truck_type_code"]
          },
          {
            foreignKeyName: "appointments_location_type_fk"
            columns: ["location_id", "appointment_type_code"]
            isOneToOne: false
            referencedRelation: "location_appointment_types"
            referencedColumns: ["location_id", "appointment_type_code"]
          },
          {
            foreignKeyName: "appointments_requester_location_id_fkey"
            columns: ["requester_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_templates: {
        Row: {
          appointment_type_code: string
          carrier_name: string | null
          company_name: string | null
          created_at: string
          direction: string
          handling_type_code: string
          id: string
          is_priority: boolean
          location_id: string
          name: string
          owner_user_id: string
          preferred_end_time: string | null
          preferred_start_time: string | null
          requester_type: string
          skid_count: number
          truck_type_code: string
          updated_at: string
        }
        Insert: {
          appointment_type_code: string
          carrier_name?: string | null
          company_name?: string | null
          created_at?: string
          direction: string
          handling_type_code: string
          id?: string
          is_priority?: boolean
          location_id: string
          name: string
          owner_user_id: string
          preferred_end_time?: string | null
          preferred_start_time?: string | null
          requester_type: string
          skid_count?: number
          truck_type_code: string
          updated_at?: string
        }
        Update: {
          appointment_type_code?: string
          carrier_name?: string | null
          company_name?: string | null
          created_at?: string
          direction?: string
          handling_type_code?: string
          id?: string
          is_priority?: boolean
          location_id?: string
          name?: string
          owner_user_id?: string
          preferred_end_time?: string | null
          preferred_start_time?: string | null
          requester_type?: string
          skid_count?: number
          truck_type_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_templates_location_appointment_type_fk"
            columns: ["location_id", "appointment_type_code"]
            isOneToOne: false
            referencedRelation: "location_appointment_types"
            referencedColumns: ["location_id", "appointment_type_code"]
          },
          {
            foreignKeyName: "booking_templates_location_handling_type_fk"
            columns: ["location_id", "handling_type_code"]
            isOneToOne: false
            referencedRelation: "location_handling_types"
            referencedColumns: ["location_id", "handling_type_code"]
          },
          {
            foreignKeyName: "booking_templates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_templates_location_truck_type_fk"
            columns: ["location_id", "truck_type_code"]
            isOneToOne: false
            referencedRelation: "location_truck_types"
            referencedColumns: ["location_id", "truck_type_code"]
          },
        ]
      }
      dock_truck_types: {
        Row: {
          created_at: string
          created_by: string | null
          dock_id: string
          location_id: string
          truck_type_code: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dock_id: string
          location_id: string
          truck_type_code: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dock_id?: string
          location_id?: string
          truck_type_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "dock_truck_types_dock_location_fk"
            columns: ["dock_id", "location_id"]
            isOneToOne: false
            referencedRelation: "docks"
            referencedColumns: ["id", "location_id"]
          },
          {
            foreignKeyName: "dock_truck_types_location_truck_fk"
            columns: ["location_id", "truck_type_code"]
            isOneToOne: false
            referencedRelation: "location_truck_types"
            referencedColumns: ["location_id", "truck_type_code"]
          },
        ]
      }
      docks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          location_id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location_id: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "docks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      handling_types: {
        Row: {
          code: string
          created_at: string
          default_adjustment_minutes: number
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          default_adjustment_minutes?: number
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          default_adjustment_minutes?: number
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      location_appointment_types: {
        Row: {
          adjustment_minutes: number
          appointment_type_code: string
          created_at: string
          is_active: boolean
          location_id: string
          updated_at: string
        }
        Insert: {
          adjustment_minutes?: number
          appointment_type_code: string
          created_at?: string
          is_active?: boolean
          location_id: string
          updated_at?: string
        }
        Update: {
          adjustment_minutes?: number
          appointment_type_code?: string
          created_at?: string
          is_active?: boolean
          location_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_appointment_types_appointment_type_code_fkey"
            columns: ["appointment_type_code"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "location_appointment_types_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_handling_types: {
        Row: {
          adjustment_minutes: number
          created_at: string
          handling_type_code: string
          is_active: boolean
          location_id: string
          updated_at: string
        }
        Insert: {
          adjustment_minutes?: number
          created_at?: string
          handling_type_code: string
          is_active?: boolean
          location_id: string
          updated_at?: string
        }
        Update: {
          adjustment_minutes?: number
          created_at?: string
          handling_type_code?: string
          is_active?: boolean
          location_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_handling_types_handling_type_code_fkey"
            columns: ["handling_type_code"]
            isOneToOne: false
            referencedRelation: "handling_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "location_handling_types_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_inventory_snapshots: {
        Row: {
          created_at: string
          id: number
          imported_by: string | null
          location_id: string
          notes: string | null
          occupied_skids: number
          reserve_skids: number | null
          snapshot_at: string
          source: string
          source_file_name: string | null
          total_skid_capacity: number | null
        }
        Insert: {
          created_at?: string
          id?: number
          imported_by?: string | null
          location_id: string
          notes?: string | null
          occupied_skids: number
          reserve_skids?: number | null
          snapshot_at: string
          source?: string
          source_file_name?: string | null
          total_skid_capacity?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          imported_by?: string | null
          location_id?: string
          notes?: string | null
          occupied_skids?: number
          reserve_skids?: number | null
          snapshot_at?: string
          source?: string
          source_file_name?: string | null
          total_skid_capacity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "location_inventory_snapshots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_operating_hours: {
        Row: {
          close_time: string | null
          created_at: string
          day_of_week: number
          is_open: boolean
          location_id: string
          open_time: string | null
          updated_at: string
        }
        Insert: {
          close_time?: string | null
          created_at?: string
          day_of_week: number
          is_open?: boolean
          location_id: string
          open_time?: string | null
          updated_at?: string
        }
        Update: {
          close_time?: string | null
          created_at?: string
          day_of_week?: number
          is_open?: boolean
          location_id?: string
          open_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_operating_hours_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_settings: {
        Row: {
          auto_assign_dock: boolean
          base_minutes: number
          buffer_minutes: number
          capacity_enabled: boolean
          capacity_enforcement_mode: string
          capacity_last_source: string
          capacity_reserve_skids: number
          created_at: string
          current_occupied_skids: number
          dock_assignment_strategy: string
          full_truck_minimum_minutes: number
          full_truck_skid_threshold: number
          inventory_as_of: string | null
          is_active: boolean
          location_id: string
          maximum_advance_days: number
          max_concurrent_appointments: number | null
          minimum_notice_minutes: number
          minutes_per_skid: number
          priority_minimum_minutes: number
          skid_capacity: number | null
          slot_interval_minutes: number
          updated_at: string
        }
        Insert: {
          auto_assign_dock?: boolean
          base_minutes?: number
          buffer_minutes?: number
          capacity_enabled?: boolean
          capacity_enforcement_mode?: string
          capacity_last_source?: string
          capacity_reserve_skids?: number
          created_at?: string
          current_occupied_skids?: number
          dock_assignment_strategy?: string
          full_truck_minimum_minutes?: number
          full_truck_skid_threshold?: number
          inventory_as_of?: string | null
          is_active?: boolean
          location_id: string
          maximum_advance_days?: number
          max_concurrent_appointments?: number | null
          minimum_notice_minutes?: number
          minutes_per_skid?: number
          priority_minimum_minutes?: number
          skid_capacity?: number | null
          slot_interval_minutes?: number
          updated_at?: string
        }
        Update: {
          auto_assign_dock?: boolean
          base_minutes?: number
          buffer_minutes?: number
          capacity_enabled?: boolean
          capacity_enforcement_mode?: string
          capacity_last_source?: string
          capacity_reserve_skids?: number
          created_at?: string
          current_occupied_skids?: number
          dock_assignment_strategy?: string
          full_truck_minimum_minutes?: number
          full_truck_skid_threshold?: number
          inventory_as_of?: string | null
          is_active?: boolean
          location_id?: string
          maximum_advance_days?: number
          max_concurrent_appointments?: number | null
          minimum_notice_minutes?: number
          minutes_per_skid?: number
          priority_minimum_minutes?: number
          skid_capacity?: number | null
          slot_interval_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_settings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: true
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_truck_types: {
        Row: {
          created_at: string
          is_active: boolean
          location_id: string
          setup_minutes: number
          truck_type_code: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          location_id: string
          setup_minutes?: number
          truck_type_code: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          is_active?: boolean
          location_id?: string
          setup_minutes?: number
          truck_type_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_truck_types_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_truck_types_truck_type_code_fkey"
            columns: ["truck_type_code"]
            isOneToOne: false
            referencedRelation: "truck_types"
            referencedColumns: ["code"]
          },
        ]
      }
      locations: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          arrival_instructions: string | null
          city: string | null
          code: string
          country_code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          postal_zip: string | null
          province_state: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          arrival_instructions?: string | null
          city?: string | null
          code: string
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          postal_zip?: string | null
          province_state?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          arrival_instructions?: string | null
          city?: string | null
          code?: string
          country_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          postal_zip?: string | null
          province_state?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      maxdock_schema_versions: {
        Row: {
          applied_at: string
          description: string
          version: string
        }
        Insert: {
          applied_at?: string
          description: string
          version: string
        }
        Update: {
          applied_at?: string
          description?: string
          version?: string
        }
        Relationships: []
      }
      mis_import_runs: {
        Row: {
          created_at: string
          file_name: string | null
          id: number
          import_type: string
          imported_by: string | null
          row_count: number
          status: string
          summary: string | null
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          id?: number
          import_type?: string
          imported_by?: string | null
          row_count?: number
          status: string
          summary?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string | null
          id?: number
          import_type?: string
          imported_by?: string | null
          row_count?: number
          status?: string
          summary?: string | null
        }
        Relationships: []
      }
      mis_integration_settings: {
        Row: {
          created_at: string
          credential_secret_name: string | null
          daily_sync_time: string
          database_name: string | null
          database_type: string
          id: number
          is_enabled: boolean
          last_success_at: string | null
          server_name: string | null
          server_port: number | null
          source_name: string | null
          sync_mode: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          credential_secret_name?: string | null
          daily_sync_time?: string
          database_name?: string | null
          database_type?: string
          id?: number
          is_enabled?: boolean
          last_success_at?: string | null
          server_name?: string | null
          server_port?: number | null
          source_name?: string | null
          sync_mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          credential_secret_name?: string | null
          daily_sync_time?: string
          database_name?: string | null
          database_type?: string
          id?: number
          is_enabled?: boolean
          last_success_at?: string | null
          server_name?: string | null
          server_port?: number | null
          source_name?: string | null
          sync_mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          code: string
          created_at: string
          description: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          contact_email: string | null
          created_at: string
          external_party_type: string | null
          full_name: string
          id: string
          is_active: boolean
          last_login_at: string | null
          must_change_password: boolean
          organization_name: string | null
          role_code: string
          updated_at: string
          username: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          external_party_type?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          last_login_at?: string | null
          must_change_password?: boolean
          organization_name?: string | null
          role_code?: string
          updated_at?: string
          username: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          external_party_type?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          must_change_password?: boolean
          organization_name?: string | null
          role_code?: string
          updated_at?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["code"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          permission_code: string
          role_code: string
        }
        Insert: {
          created_at?: string
          permission_code: string
          role_code: string
        }
        Update: {
          created_at?: string
          permission_code?: string
          role_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "role_permissions_role_code_fkey"
            columns: ["role_code"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["code"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          description: string
          is_active: boolean
          name: string
          rank: number
        }
        Insert: {
          code: string
          created_at?: string
          description: string
          is_active?: boolean
          name: string
          rank: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string
          is_active?: boolean
          name?: string
          rank?: number
        }
        Relationships: []
      }
      truck_types: {
        Row: {
          code: string
          created_at: string
          default_setup_minutes: number
          is_active: boolean
          name: string
          qualifies_as_full_truck: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          default_setup_minutes?: number
          is_active?: boolean
          name: string
          qualifies_as_full_truck?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          default_setup_minutes?: number
          is_active?: boolean
          name?: string
          qualifies_as_full_truck?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_admin_audit_log: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          details: Json
          id: number
          target_user_id: string
          target_username: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          details?: Json
          id?: never
          target_user_id: string
          target_username?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          details?: Json
          id?: never
          target_user_id?: string
          target_username?: string | null
        }
        Relationships: []
      }
      user_location_access: {
        Row: {
          granted_at: string
          granted_by: string | null
          location_id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          location_id: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          location_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_location_access_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_location_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notifications: {
        Row: {
          appointment_id: string | null
          created_at: string
          email_address: string | null
          email_delivery_status: string
          id: number
          message: string
          notification_type: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          email_address?: string | null
          email_delivery_status?: string
          id?: never
          message: string
          notification_type: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          email_address?: string | null
          email_delivery_status?: string
          id?: never
          message?: string
          notification_type?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          preference_key: string
          preferences: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          preference_key: string
          preferences?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          preference_key?: string
          preferences?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_usage_daily: {
        Row: {
          active_seconds: number
          activity_date: string
          first_seen_at: string
          last_seen_at: string
          login_count: number
          page_view_count: number
          page_views: Json
          user_id: string
        }
        Insert: {
          active_seconds?: number
          activity_date: string
          first_seen_at?: string
          last_seen_at?: string
          login_count?: number
          page_view_count?: number
          page_views?: Json
          user_id: string
        }
        Update: {
          active_seconds?: number
          activity_date?: string
          first_seen_at?: string
          last_seen_at?: string
          login_count?: number
          page_view_count?: number
          page_views?: Json
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_mis_integration_settings: { Args: never; Returns: Json }
      admin_import_inventory_snapshots: {
        Args: { p_file_name?: string; p_rows: Json }
        Returns: Json
      }
      admin_list_mis_import_runs: {
        Args: never
        Returns: {
          created_at: string
          file_name: string
          id: number
          import_type: string
          imported_by_name: string
          row_count: number
          status: string
          summary: string
        }[]
      }
      admin_list_user_usage: {
        Args: never
        Returns: {
          active_days: number
          active_days_30: number
          active_days_7: number
          active_seconds_30: number
          first_activity_at: string
          last_activity_at: string
          page_views_30: number
          tracked_logins: number
          user_id: string
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          is_active: boolean
          last_sign_in_at: string
          location_ids: string[]
          location_names: string[]
          must_change_password: boolean
          role_code: string
          role_name: string
          user_id: string
          username: string
        }[]
      }
      admin_list_users_with_identity: {
        Args: never
        Returns: {
          created_at: string
          email: string
          external_party_type: string
          full_name: string
          is_active: boolean
          last_sign_in_at: string
          location_ids: string[]
          location_names: string[]
          must_change_password: boolean
          organization_name: string
          role_code: string
          role_name: string
          user_id: string
          username: string
        }[]
      }
      admin_save_mis_integration_settings: {
        Args: {
          p_credential_secret_name?: string
          p_daily_sync_time: string
          p_database_name: string
          p_database_type: string
          p_is_enabled: boolean
          p_server_name: string
          p_server_port: number
          p_source_name: string
          p_sync_mode: string
        }
        Returns: Json
      }
      admin_update_user:
        | {
            Args: {
              p_full_name: string
              p_is_active: boolean
              p_location_ids?: string[]
              p_role_code: string
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_external_party_type: string
              p_full_name: string
              p_is_active: boolean
              p_location_ids: string[]
              p_organization_name: string
              p_role_code: string
              p_user_id: string
            }
            Returns: Json
          }
      block_dock_time: {
        Args: {
          p_date: string
          p_dock_ids: string[]
          p_duration_minutes: number
          p_location_id: string
          p_notes?: string
          p_reason: string
          p_start_time: string
        }
        Returns: Json
      }
      book_appointment: {
        Args: {
          p_after_hours_confirmed?: boolean
          p_appointment_type_code: string
          p_carrier_name?: string
          p_company_name?: string
          p_date: string
          p_direction: string
          p_external_reference: string
          p_handling_type_code: string
          p_is_priority: boolean
          p_location_id: string
          p_notes?: string
          p_requester_email: string
          p_requester_location_id?: string
          p_requester_name: string
          p_requester_type: string
          p_skid_count: number
          p_start_time: string
          p_truck_type_code: string
        }
        Returns: Json
      }
      book_routed_appointment: {
        Args: {
          p_after_hours_confirmed?: boolean
          p_appointment_type_code: string
          p_carrier_name?: string
          p_company_name?: string
          p_date: string
          p_direction: string
          p_external_reference: string
          p_handling_type_code: string
          p_is_priority: boolean
          p_location_id: string
          p_notes?: string
          p_requester_email: string
          p_requester_location_id?: string
          p_requester_name: string
          p_requester_type: string
          p_skid_count: number
          p_start_time: string
          p_truck_type_code: string
        }
        Returns: Json
      }
      calculate_appointment_duration: {
        Args: {
          p_appointment_type_code: string
          p_handling_type_code: string
          p_is_priority?: boolean
          p_location_id: string
          p_skid_count: number
          p_truck_type_code: string
        }
        Returns: number
      }
      calculate_appointment_duration_internal: {
        Args: {
          p_appointment_type_code: string
          p_handling_type_code: string
          p_is_priority?: boolean
          p_location_id: string
          p_skid_count: number
          p_truck_type_code: string
        }
        Returns: number
      }
      cancel_my_appointment: {
        Args: { p_appointment_id: string }
        Returns: Json
      }
      change_appointment_status: {
        Args: {
          p_appointment_id: string
          p_new_status: string
          p_reason?: string
        }
        Returns: Json
      }
      complete_password_setup: { Args: never; Returns: boolean }
      current_maxdock_role: { Args: never; Returns: string }
      find_return_load_matches: {
        Args: {
          p_direction: string
          p_end_at: string
          p_location_id: string
          p_requester_location_id: string
          p_start_at: string
          p_window_hours?: number
        }
        Returns: {
          appointment_id: string
          booking_reference: string
          carrier_name: string
          destination_location_name: string
          end_at: string
          origin_location_name: string
          recommendation: string
          sequence_text: string
          skid_count: number
          start_at: string
          time_gap_minutes: number
        }[]
      }
      get_ai_operations_context: {
        Args: {
          p_end_date: string
          p_location_id: string
          p_start_date: string
        }
        Returns: Json
      }
      get_appointment_history: {
        Args: { p_appointment_id: string }
        Returns: {
          action: string
          changed_at: string
          changed_by_name: string
          details: Json
          event_id: number
          summary: string
        }[]
      }
      get_location_capacity_projection: {
        Args: {
          p_at: string
          p_direction?: string
          p_exclude_appointment_id?: string
          p_location_id: string
          p_skid_count?: number
        }
        Returns: {
          available_after: number
          baseline_occupied: number
          can_accept: boolean
          capacity_enabled: boolean
          capacity_message: string
          enforcement_mode: string
          projected_after: number
          projected_before: number
          reserve_skids: number
          total_capacity: number
        }[]
      }
      get_user_preference: { Args: { p_preference_key: string }; Returns: Json }
      has_location_access: {
        Args: { requested_location_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: { requested_permission_code: string }
        Returns: boolean
      }
      inspect_routed_appointment_window_internal: {
        Args: {
          p_appointment_type_code: string
          p_date: string
          p_direction: string
          p_exclude_appointment_id?: string
          p_handling_type_code: string
          p_is_priority?: boolean
          p_location_id: string
          p_requester_location_id: string
          p_skid_count: number
          p_start_time: string
          p_truck_type_code: string
        }
        Returns: Json
      }
      is_system_admin: { Args: never; Returns: boolean }
      list_active_location_directory: {
        Args: never
        Returns: {
          code: string
          id: string
          is_active: boolean
          name: string
          timezone: string
        }[]
      }
      list_available_appointment_slots: {
        Args: {
          p_appointment_type_code: string
          p_date: string
          p_handling_type_code: string
          p_is_priority?: boolean
          p_location_id: string
          p_skid_count: number
          p_truck_type_code: string
        }
        Returns: {
          available_docks: number
          slot_end: string
          slot_start: string
        }[]
      }
      list_capacity_aware_appointment_slots: {
        Args: {
          p_appointment_type_code: string
          p_date: string
          p_direction: string
          p_handling_type_code: string
          p_is_priority?: boolean
          p_location_id: string
          p_preferred_end_time?: string
          p_preferred_start_time?: string
          p_search_days?: number
          p_skid_count: number
          p_truck_type_code: string
        }
        Returns: {
          alternative_date: boolean
          available_docks: number
          available_skid_capacity: number
          capacity_enabled: boolean
          capacity_message: string
          capacity_warning: boolean
          projected_occupied_skids: number
          recommendation_rank: number
          recommendation_reason: string
          recommendation_score: number
          recommended_dock_id: string
          recommended_dock_name: string
          slot_end: string
          slot_start: string
        }[]
      }
      list_external_company_directory: {
        Args: never
        Returns: {
          company_name: string
          party_type: string
        }[]
      }
      list_location_schedule: {
        Args: { p_location_id: string }
        Returns: {
          schedule_record: Json
        }[]
      }
      list_my_appointments: {
        Args: never
        Returns: {
          appointment_id: string
          appointment_type: string
          booking_reference: string
          carrier_name: string
          company_name: string
          created_at: string
          direction: string
          end_at: string
          external_reference: string
          handling_type: string
          location_name: string
          location_timezone: string
          skid_count: number
          start_at: string
          status: string
          truck_type: string
        }[]
      }
      list_return_load_opportunities: {
        Args: { p_date_from: string; p_date_to: string; p_location_id: string }
        Returns: {
          combined_skids: number
          first_appointment_id: string
          first_booking_reference: string
          first_destination_name: string
          first_end_at: string
          first_origin_name: string
          first_start_at: string
          recommendation: string
          second_appointment_id: string
          second_booking_reference: string
          second_destination_name: string
          second_end_at: string
          second_origin_name: string
          second_start_at: string
          turnaround_minutes: number
        }[]
      }
      list_routed_appointment_slots: {
        Args: {
          p_appointment_type_code: string
          p_date: string
          p_direction: string
          p_handling_type_code: string
          p_is_priority?: boolean
          p_location_id: string
          p_preferred_end_time?: string
          p_preferred_start_time?: string
          p_requester_location_id: string
          p_search_days?: number
          p_skid_count: number
          p_truck_type_code: string
        }
        Returns: {
          alternative_date: boolean
          available_docks: number
          available_skid_capacity: number
          capacity_enabled: boolean
          capacity_message: string
          capacity_warning: boolean
          counterpart_dock_id: string
          counterpart_dock_name: string
          projected_occupied_skids: number
          recommendation_rank: number
          recommendation_reason: string
          recommendation_score: number
          recommended_dock_id: string
          recommended_dock_name: string
          slot_end: string
          slot_start: string
        }[]
      }
      list_smart_appointment_slots: {
        Args: {
          p_appointment_type_code: string
          p_date: string
          p_handling_type_code: string
          p_is_priority?: boolean
          p_location_id: string
          p_preferred_end_time?: string
          p_preferred_start_time?: string
          p_skid_count: number
          p_truck_type_code: string
        }
        Returns: {
          available_docks: number
          recommendation_rank: number
          recommendation_reason: string
          recommendation_score: number
          recommended_dock_id: string
          recommended_dock_name: string
          slot_end: string
          slot_start: string
        }[]
      }
      location_capacity_projection_internal: {
        Args: {
          p_at: string
          p_direction?: string
          p_exclude_appointment_id?: string
          p_location_id: string
          p_skid_count?: number
        }
        Returns: Json
      }
      preview_routed_appointment_time: {
        Args: {
          p_appointment_type_code: string
          p_date: string
          p_direction: string
          p_handling_type_code: string
          p_is_priority?: boolean
          p_location_id: string
          p_requester_location_id: string
          p_skid_count: number
          p_start_time: string
          p_truck_type_code: string
        }
        Returns: Json
      }
      preview_staff_appointment_time: {
        Args: {
          p_appointment_type_code: string
          p_date: string
          p_direction: string
          p_handling_type_code: string
          p_is_priority?: boolean
          p_location_id: string
          p_skid_count: number
          p_start_time: string
          p_truck_type_code: string
        }
        Returns: Json
      }
      record_user_usage: {
        Args: {
          p_active_seconds?: number
          p_event_type: string
          p_page_code: string
        }
        Returns: undefined
      }
      save_user_preference: {
        Args: { p_preference_key: string; p_preferences: Json }
        Returns: Json
      }
      update_appointment_details: {
        Args: {
          p_appointment_id: string
          p_appointment_type_code: string
          p_carrier_name: string
          p_company_name: string
          p_date: string
          p_direction: string
          p_dock_id: string
          p_external_reference: string
          p_handling_type_code: string
          p_is_priority: boolean
          p_notes: string
          p_requester_email: string
          p_requester_name: string
          p_skid_count: number
          p_start_time: string
          p_truck_type_code: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
