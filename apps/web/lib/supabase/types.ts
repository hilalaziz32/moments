/**
 * GENERATED FILE -- do not edit by hand.
 * Regenerate with:  pnpm db:types
 * Source: the live `moments` schema (scripts/gen-db-types.mjs).
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  moments: {
    Tables: {
      action_tokens: {
        Row: {
          id: string;
          org_id: string | null;
          purpose: Database["moments"]["Enums"]["token_purpose"];
          token_hash: string;
          token_lookup: string;
          subject_type: string;
          subject_id: string;
          moment_event_id: string | null;
          issued_to_email: string | null;
          issued_to_phone: string | null;
          expires_at: string;
          max_uses: number;
          use_count: number;
          first_used_at: string | null;
          last_used_at: string | null;
          consumed_at: string | null;
          revoked_at: string | null;
          revoked_reason: string | null;
          last_ip: string | null;
          last_user_agent: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          purpose: Database["moments"]["Enums"]["token_purpose"];
          token_hash: string;
          token_lookup: string;
          subject_type: string;
          subject_id: string;
          moment_event_id?: string | null;
          issued_to_email?: string | null;
          issued_to_phone?: string | null;
          expires_at: string;
          max_uses?: number;
          use_count?: number;
          first_used_at?: string | null;
          last_used_at?: string | null;
          consumed_at?: string | null;
          revoked_at?: string | null;
          revoked_reason?: string | null;
          last_ip?: string | null;
          last_user_agent?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          purpose?: Database["moments"]["Enums"]["token_purpose"];
          token_hash?: string;
          token_lookup?: string;
          subject_type?: string;
          subject_id?: string;
          moment_event_id?: string | null;
          issued_to_email?: string | null;
          issued_to_phone?: string | null;
          expires_at?: string;
          max_uses?: number;
          use_count?: number;
          first_used_at?: string | null;
          last_used_at?: string | null;
          consumed_at?: string | null;
          revoked_at?: string | null;
          revoked_reason?: string | null;
          last_ip?: string | null;
          last_user_agent?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "action_tokens_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "action_tokens_moment_event_id_fkey";
            columns: ["moment_event_id"];
            isOneToOne: false;
            referencedRelation: "moment_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "action_tokens_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      addresses: {
        Row: {
          id: string;
          org_id: string;
          employee_id: string;
          kind: Database["moments"]["Enums"]["address_kind"];
          recipient_name: string | null;
          recipient_phone: string | null;
          line1: string;
          line2: string | null;
          area: string | null;
          landmark: string | null;
          city_id: string | null;
          city_text: string | null;
          postal_code: string | null;
          google_maps_url: string | null;
          latitude: number | null;
          longitude: number | null;
          delivery_notes: string | null;
          verification_status: Database["moments"]["Enums"]["address_verification_status"];
          verified_at: string | null;
          verified_by_kind: Database["moments"]["Enums"]["actor_kind"] | null;
          verified_by: string | null;
          verification_expires_at: string | null;
          last_delivery_ok_at: string | null;
          failed_delivery_count: number;
          is_primary: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          employee_id: string;
          kind?: Database["moments"]["Enums"]["address_kind"];
          recipient_name?: string | null;
          recipient_phone?: string | null;
          line1: string;
          line2?: string | null;
          area?: string | null;
          landmark?: string | null;
          city_id?: string | null;
          city_text?: string | null;
          postal_code?: string | null;
          google_maps_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          delivery_notes?: string | null;
          verification_status?: Database["moments"]["Enums"]["address_verification_status"];
          verified_at?: string | null;
          verified_by_kind?: Database["moments"]["Enums"]["actor_kind"] | null;
          verified_by?: string | null;
          verification_expires_at?: string | null;
          last_delivery_ok_at?: string | null;
          failed_delivery_count?: number;
          is_primary?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          employee_id?: string;
          kind?: Database["moments"]["Enums"]["address_kind"];
          recipient_name?: string | null;
          recipient_phone?: string | null;
          line1?: string;
          line2?: string | null;
          area?: string | null;
          landmark?: string | null;
          city_id?: string | null;
          city_text?: string | null;
          postal_code?: string | null;
          google_maps_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          delivery_notes?: string | null;
          verification_status?: Database["moments"]["Enums"]["address_verification_status"];
          verified_at?: string | null;
          verified_by_kind?: Database["moments"]["Enums"]["actor_kind"] | null;
          verified_by?: string | null;
          verification_expires_at?: string | null;
          last_delivery_ok_at?: string | null;
          failed_delivery_count?: number;
          is_primary?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "addresses_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "addresses_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: true;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "addresses_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "addresses_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      alerts: {
        Row: {
          id: string;
          severity: Database["moments"]["Enums"]["alert_severity"];
          status: Database["moments"]["Enums"]["alert_status"];
          kind: string;
          org_id: string | null;
          entity: string | null;
          entity_id: string | null;
          title: string;
          body: string | null;
          dedupe_key: string;
          acked_by: string | null;
          acked_at: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          severity: Database["moments"]["Enums"]["alert_severity"];
          status?: Database["moments"]["Enums"]["alert_status"];
          kind: string;
          org_id?: string | null;
          entity?: string | null;
          entity_id?: string | null;
          title: string;
          body?: string | null;
          dedupe_key: string;
          acked_by?: string | null;
          acked_at?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          severity?: Database["moments"]["Enums"]["alert_severity"];
          status?: Database["moments"]["Enums"]["alert_status"];
          kind?: string;
          org_id?: string | null;
          entity?: string | null;
          entity_id?: string | null;
          title?: string;
          body?: string | null;
          dedupe_key?: string;
          acked_by?: string | null;
          acked_at?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alerts_acked_by_fkey";
            columns: ["acked_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      approval_requests: {
        Row: {
          id: string;
          org_id: string;
          moment_event_id: string;
          gift_order_id: string | null;
          task_id: string | null;
          requested_amount_paisa: number;
          budget_paisa: number;
          summary: string | null;
          approver_kind: Database["moments"]["Enums"]["approver_kind"];
          approver_user_id: string | null;
          approver_employee_id: string | null;
          approver_email: string | null;
          approver_phone: string | null;
          channel: Database["moments"]["Enums"]["channel"];
          token_id: string | null;
          requires_otp: boolean;
          otp_hash: string | null;
          otp_expires_at: string | null;
          status: Database["moments"]["Enums"]["approval_decision"];
          sent_at: string | null;
          expires_at: string;
          auto_approve_at: string | null;
          auto_approve_on_timeout: boolean;
          reminder_count: number;
          last_reminded_at: string | null;
          responded_at: string | null;
          responded_via: Database["moments"]["Enums"]["response_channel"] | null;
          responder_user_id: string | null;
          responder_label: string | null;
          responder_ip: string | null;
          responder_user_agent: string | null;
          decision_note: string | null;
          counter_amount_paisa: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          moment_event_id: string;
          gift_order_id?: string | null;
          task_id?: string | null;
          requested_amount_paisa: number;
          budget_paisa?: number;
          summary?: string | null;
          approver_kind: Database["moments"]["Enums"]["approver_kind"];
          approver_user_id?: string | null;
          approver_employee_id?: string | null;
          approver_email?: string | null;
          approver_phone?: string | null;
          channel?: Database["moments"]["Enums"]["channel"];
          token_id?: string | null;
          requires_otp?: boolean;
          otp_hash?: string | null;
          otp_expires_at?: string | null;
          status?: Database["moments"]["Enums"]["approval_decision"];
          sent_at?: string | null;
          expires_at: string;
          auto_approve_at?: string | null;
          auto_approve_on_timeout?: boolean;
          reminder_count?: number;
          last_reminded_at?: string | null;
          responded_at?: string | null;
          responded_via?: Database["moments"]["Enums"]["response_channel"] | null;
          responder_user_id?: string | null;
          responder_label?: string | null;
          responder_ip?: string | null;
          responder_user_agent?: string | null;
          decision_note?: string | null;
          counter_amount_paisa?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          moment_event_id?: string;
          gift_order_id?: string | null;
          task_id?: string | null;
          requested_amount_paisa?: number;
          budget_paisa?: number;
          summary?: string | null;
          approver_kind?: Database["moments"]["Enums"]["approver_kind"];
          approver_user_id?: string | null;
          approver_employee_id?: string | null;
          approver_email?: string | null;
          approver_phone?: string | null;
          channel?: Database["moments"]["Enums"]["channel"];
          token_id?: string | null;
          requires_otp?: boolean;
          otp_hash?: string | null;
          otp_expires_at?: string | null;
          status?: Database["moments"]["Enums"]["approval_decision"];
          sent_at?: string | null;
          expires_at?: string;
          auto_approve_at?: string | null;
          auto_approve_on_timeout?: boolean;
          reminder_count?: number;
          last_reminded_at?: string | null;
          responded_at?: string | null;
          responded_via?: Database["moments"]["Enums"]["response_channel"] | null;
          responder_user_id?: string | null;
          responder_label?: string | null;
          responder_ip?: string | null;
          responder_user_agent?: string | null;
          decision_note?: string | null;
          counter_amount_paisa?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "approval_requests_approver_employee_id_fkey";
            columns: ["approver_employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "approval_requests_approver_user_id_fkey";
            columns: ["approver_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "approval_requests_gift_order_id_fkey";
            columns: ["gift_order_id"];
            isOneToOne: false;
            referencedRelation: "gift_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "approval_requests_moment_event_id_fkey";
            columns: ["moment_event_id"];
            isOneToOne: true;
            referencedRelation: "moment_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "approval_requests_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "approval_requests_responder_user_id_fkey";
            columns: ["responder_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "approval_requests_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "moment_tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "approval_requests_token_id_fkey";
            columns: ["token_id"];
            isOneToOne: false;
            referencedRelation: "action_tokens";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          id: number;
          org_id: string | null;
          actor_kind: Database["moments"]["Enums"]["actor_kind"];
          actor_user_id: string | null;
          actor_label: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          before: Json | null;
          after: Json | null;
          reason: string | null;
          ip: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id: number;
          org_id?: string | null;
          actor_kind?: Database["moments"]["Enums"]["actor_kind"];
          actor_user_id?: string | null;
          actor_label?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          before?: Json | null;
          after?: Json | null;
          reason?: string | null;
          ip?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          org_id?: string | null;
          actor_kind?: Database["moments"]["Enums"]["actor_kind"];
          actor_user_id?: string | null;
          actor_label?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string | null;
          before?: Json | null;
          after?: Json | null;
          reason?: string | null;
          ip?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_user_id_fkey";
            columns: ["actor_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_log_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      cities: {
        Row: {
          id: string;
          name: string;
          name_ur: string | null;
          province: string;
          country_code: string;
          is_serviceable: boolean;
          tier: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          name_ur?: string | null;
          province: string;
          country_code?: string;
          is_serviceable?: boolean;
          tier?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          name_ur?: string | null;
          province?: string;
          country_code?: string;
          is_serviceable?: boolean;
          tier?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
        ];
      };
      dead_letters: {
        Row: {
          id: string;
          task_id: string | null;
          org_id: string | null;
          task_type: Database["moments"]["Enums"]["task_type"];
          moment_event_id: string | null;
          payload: Json;
          errors: Json;
          replayed_at: string | null;
          replayed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id?: string | null;
          org_id?: string | null;
          task_type: Database["moments"]["Enums"]["task_type"];
          moment_event_id?: string | null;
          payload?: Json;
          errors?: Json;
          replayed_at?: string | null;
          replayed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string | null;
          org_id?: string | null;
          task_type?: Database["moments"]["Enums"]["task_type"];
          moment_event_id?: string | null;
          payload?: Json;
          errors?: Json;
          replayed_at?: string | null;
          replayed_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dead_letters_moment_event_id_fkey";
            columns: ["moment_event_id"];
            isOneToOne: false;
            referencedRelation: "moment_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dead_letters_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dead_letters_replayed_by_fkey";
            columns: ["replayed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dead_letters_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "moment_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_proofs: {
        Row: {
          id: string;
          order_id: string;
          org_id: string;
          kind: Database["moments"]["Enums"]["proof_kind"];
          storage_path: string | null;
          reference: string | null;
          received_by: string | null;
          captured_at: string;
          uploaded_by: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          org_id: string;
          kind: Database["moments"]["Enums"]["proof_kind"];
          storage_path?: string | null;
          reference?: string | null;
          received_by?: string | null;
          captured_at?: string;
          uploaded_by?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          org_id?: string;
          kind?: Database["moments"]["Enums"]["proof_kind"];
          storage_path?: string | null;
          reference?: string | null;
          received_by?: string | null;
          captured_at?: string;
          uploaded_by?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_proofs_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "gift_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_proofs_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "delivery_proofs_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      employee_events: {
        Row: {
          id: string;
          org_id: string;
          employee_id: string;
          moment_type_id: string;
          event_date: string;
          details: Json;
          is_celebrated: boolean;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          employee_id: string;
          moment_type_id: string;
          event_date: string;
          details?: Json;
          is_celebrated?: boolean;
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          employee_id?: string;
          moment_type_id?: string;
          event_date?: string;
          details?: Json;
          is_celebrated?: boolean;
          recorded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "employee_events_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employee_events_moment_type_id_fkey";
            columns: ["moment_type_id"];
            isOneToOne: false;
            referencedRelation: "moment_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employee_events_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employee_events_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      employee_import_batches: {
        Row: {
          id: string;
          org_id: string;
          uploaded_by: string | null;
          filename: string;
          storage_path: string | null;
          status: Database["moments"]["Enums"]["import_batch_status"];
          column_mapping: Json;
          options: Json;
          total_rows: number;
          valid_rows: number;
          error_rows: number;
          imported_rows: number;
          error_summary: Json;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          uploaded_by?: string | null;
          filename: string;
          storage_path?: string | null;
          status?: Database["moments"]["Enums"]["import_batch_status"];
          column_mapping?: Json;
          options?: Json;
          total_rows?: number;
          valid_rows?: number;
          error_rows?: number;
          imported_rows?: number;
          error_summary?: Json;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          uploaded_by?: string | null;
          filename?: string;
          storage_path?: string | null;
          status?: Database["moments"]["Enums"]["import_batch_status"];
          column_mapping?: Json;
          options?: Json;
          total_rows?: number;
          valid_rows?: number;
          error_rows?: number;
          imported_rows?: number;
          error_summary?: Json;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "employee_import_batches_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employee_import_batches_uploaded_by_fkey";
            columns: ["uploaded_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      employee_import_rows: {
        Row: {
          id: string;
          batch_id: string;
          org_id: string;
          row_number: number;
          raw: Json;
          normalized: Json;
          status: Database["moments"]["Enums"]["import_row_status"];
          errors: Json;
          employee_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          batch_id: string;
          org_id: string;
          row_number: number;
          raw: Json;
          normalized?: Json;
          status?: Database["moments"]["Enums"]["import_row_status"];
          errors?: Json;
          employee_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          batch_id?: string;
          org_id?: string;
          row_number?: number;
          raw?: Json;
          normalized?: Json;
          status?: Database["moments"]["Enums"]["import_row_status"];
          errors?: Json;
          employee_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "employee_import_rows_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "employee_import_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employee_import_rows_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employee_import_rows_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      employees: {
        Row: {
          id: string;
          org_id: string;
          user_id: string | null;
          employee_code: string | null;
          full_name: string;
          full_name_ur: string | null;
          preferred_name: string | null;
          work_email: string | null;
          personal_email: string | null;
          phone_e164: string | null;
          whatsapp_e164: string | null;
          whatsapp_opt_in_at: string | null;
          whatsapp_opted_out: boolean;
          slack_user_id: string | null;
          gender: string | null;
          date_of_birth: string | null;
          hire_date: string | null;
          exit_date: string | null;
          exit_reason: string | null;
          job_title: string | null;
          department: string | null;
          office_id: string | null;
          manager_id: string | null;
          status: Database["moments"]["Enums"]["employee_status"];
          timezone: string | null;
          locale: string;
          halal_only: boolean;
          is_vegetarian: boolean;
          needs_eggless: boolean;
          allergies: string[];
          dietary_notes: string | null;
          shirt_size: string | null;
          celebration_opt_out: boolean;
          hide_birth_year: boolean;
          birth_mmdd: number | null;
          hire_mmdd: number | null;
          custom_fields: Json;
          import_batch_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id?: string | null;
          employee_code?: string | null;
          full_name: string;
          full_name_ur?: string | null;
          preferred_name?: string | null;
          work_email?: string | null;
          personal_email?: string | null;
          phone_e164?: string | null;
          whatsapp_e164?: string | null;
          whatsapp_opt_in_at?: string | null;
          whatsapp_opted_out?: boolean;
          slack_user_id?: string | null;
          gender?: string | null;
          date_of_birth?: string | null;
          hire_date?: string | null;
          exit_date?: string | null;
          exit_reason?: string | null;
          job_title?: string | null;
          department?: string | null;
          office_id?: string | null;
          manager_id?: string | null;
          status?: Database["moments"]["Enums"]["employee_status"];
          timezone?: string | null;
          locale?: string;
          halal_only?: boolean;
          is_vegetarian?: boolean;
          needs_eggless?: boolean;
          allergies?: string[];
          dietary_notes?: string | null;
          shirt_size?: string | null;
          celebration_opt_out?: boolean;
          hide_birth_year?: boolean;
          custom_fields?: Json;
          import_batch_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string | null;
          employee_code?: string | null;
          full_name?: string;
          full_name_ur?: string | null;
          preferred_name?: string | null;
          work_email?: string | null;
          personal_email?: string | null;
          phone_e164?: string | null;
          whatsapp_e164?: string | null;
          whatsapp_opt_in_at?: string | null;
          whatsapp_opted_out?: boolean;
          slack_user_id?: string | null;
          gender?: string | null;
          date_of_birth?: string | null;
          hire_date?: string | null;
          exit_date?: string | null;
          exit_reason?: string | null;
          job_title?: string | null;
          department?: string | null;
          office_id?: string | null;
          manager_id?: string | null;
          status?: Database["moments"]["Enums"]["employee_status"];
          timezone?: string | null;
          locale?: string;
          halal_only?: boolean;
          is_vegetarian?: boolean;
          needs_eggless?: boolean;
          allergies?: string[];
          dietary_notes?: string | null;
          shirt_size?: string | null;
          celebration_opt_out?: boolean;
          hide_birth_year?: boolean;
          custom_fields?: Json;
          import_batch_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "employees_import_batch_id_fkey";
            columns: ["import_batch_id"];
            isOneToOne: false;
            referencedRelation: "employee_import_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employees_manager_id_fkey";
            columns: ["manager_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employees_office_id_fkey";
            columns: ["office_id"];
            isOneToOne: false;
            referencedRelation: "offices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employees_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "employees_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      feature_flags: {
        Row: {
          key: string;
          description: string | null;
          is_enabled: boolean;
          org_ids: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          description?: string | null;
          is_enabled?: boolean;
          org_ids?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          description?: string | null;
          is_enabled?: boolean;
          org_ids?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
        ];
      };
      gift_bundle_items: {
        Row: {
          bundle_id: string;
          product_id: string;
          quantity: number;
          is_optional: boolean;
        };
        Insert: {
          bundle_id: string;
          product_id: string;
          quantity?: number;
          is_optional?: boolean;
        };
        Update: {
          bundle_id?: string;
          product_id?: string;
          quantity?: number;
          is_optional?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "gift_bundle_items_bundle_id_fkey";
            columns: ["bundle_id"];
            isOneToOne: false;
            referencedRelation: "gift_bundles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gift_bundle_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "gift_products";
            referencedColumns: ["id"];
          },
        ];
      };
      gift_bundles: {
        Row: {
          id: string;
          org_id: string | null;
          name: string;
          description: string | null;
          target_budget_paisa: number;
          suitable_moment_keys: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          name: string;
          description?: string | null;
          target_budget_paisa: number;
          suitable_moment_keys?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          name?: string;
          description?: string | null;
          target_budget_paisa?: number;
          suitable_moment_keys?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gift_bundles_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      gift_order_items: {
        Row: {
          id: string;
          order_id: string;
          org_id: string;
          product_id: string | null;
          name_snapshot: string;
          category: Database["moments"]["Enums"]["product_category"];
          quantity: number;
          unit_cost_paisa: number;
          unit_price_paisa: number;
          line_cost_paisa: number | null;
          line_price_paisa: number | null;
          personalisation: Json;
          dietary_snapshot: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          org_id: string;
          product_id?: string | null;
          name_snapshot: string;
          category: Database["moments"]["Enums"]["product_category"];
          quantity?: number;
          unit_cost_paisa: number;
          unit_price_paisa: number;
          personalisation?: Json;
          dietary_snapshot?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          org_id?: string;
          product_id?: string | null;
          name_snapshot?: string;
          category?: Database["moments"]["Enums"]["product_category"];
          quantity?: number;
          unit_cost_paisa?: number;
          unit_price_paisa?: number;
          personalisation?: Json;
          dietary_snapshot?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gift_order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "gift_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gift_order_items_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gift_order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "gift_products";
            referencedColumns: ["id"];
          },
        ];
      };
      gift_order_status_history: {
        Row: {
          id: number;
          order_id: string;
          org_id: string;
          from_status: Database["moments"]["Enums"]["order_status"] | null;
          to_status: Database["moments"]["Enums"]["order_status"];
          actor_kind: Database["moments"]["Enums"]["actor_kind"];
          actor_id: string | null;
          reason: string | null;
          meta: Json;
          occurred_at: string;
        };
        Insert: {
          id: number;
          order_id: string;
          org_id: string;
          from_status?: Database["moments"]["Enums"]["order_status"] | null;
          to_status: Database["moments"]["Enums"]["order_status"];
          actor_kind?: Database["moments"]["Enums"]["actor_kind"];
          actor_id?: string | null;
          reason?: string | null;
          meta?: Json;
          occurred_at?: string;
        };
        Update: {
          id?: number;
          order_id?: string;
          org_id?: string;
          from_status?: Database["moments"]["Enums"]["order_status"] | null;
          to_status?: Database["moments"]["Enums"]["order_status"];
          actor_kind?: Database["moments"]["Enums"]["actor_kind"];
          actor_id?: string | null;
          reason?: string | null;
          meta?: Json;
          occurred_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gift_order_status_history_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "gift_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gift_order_status_history_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      gift_orders: {
        Row: {
          id: string;
          org_id: string;
          moment_event_id: string;
          employee_id: string | null;
          vendor_id: string | null;
          order_number: string;
          status: Database["moments"]["Enums"]["order_status"];
          address_id: string | null;
          address_snapshot: Json;
          recipient_name: string;
          recipient_phone: string | null;
          city_id: string | null;
          deliver_on: string;
          delivery_slot: string | null;
          delivery_instructions: string | null;
          dietary_snapshot: Json;
          currency: string;
          items_cost_paisa: number;
          delivery_cost_paisa: number;
          total_cost_paisa: number | null;
          items_price_paisa: number;
          delivery_price_paisa: number;
          total_price_paisa: number | null;
          margin_paisa: number | null;
          budget_paisa: number;
          is_over_budget: boolean | null;
          over_budget_approved_by: string | null;
          assigned_staff_id: string | null;
          ops_sla_due_at: string | null;
          is_fallback: boolean;
          vendor_order_ref: string | null;
          vendor_invoice_ref: string | null;
          vendor_paid_at: string | null;
          placed_at: string | null;
          placed_by: string | null;
          delivered_at: string | null;
          failure_reason: string | null;
          cancelled_at: string | null;
          invoice_id: string | null;
          invoiced_at: string | null;
          internal_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          moment_event_id: string;
          employee_id?: string | null;
          vendor_id?: string | null;
          order_number: string;
          status?: Database["moments"]["Enums"]["order_status"];
          address_id?: string | null;
          address_snapshot: Json;
          recipient_name: string;
          recipient_phone?: string | null;
          city_id?: string | null;
          deliver_on: string;
          delivery_slot?: string | null;
          delivery_instructions?: string | null;
          dietary_snapshot?: Json;
          currency?: string;
          items_cost_paisa?: number;
          delivery_cost_paisa?: number;
          items_price_paisa?: number;
          delivery_price_paisa?: number;
          budget_paisa?: number;
          over_budget_approved_by?: string | null;
          assigned_staff_id?: string | null;
          ops_sla_due_at?: string | null;
          is_fallback?: boolean;
          vendor_order_ref?: string | null;
          vendor_invoice_ref?: string | null;
          vendor_paid_at?: string | null;
          placed_at?: string | null;
          placed_by?: string | null;
          delivered_at?: string | null;
          failure_reason?: string | null;
          cancelled_at?: string | null;
          invoice_id?: string | null;
          invoiced_at?: string | null;
          internal_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          moment_event_id?: string;
          employee_id?: string | null;
          vendor_id?: string | null;
          order_number?: string;
          status?: Database["moments"]["Enums"]["order_status"];
          address_id?: string | null;
          address_snapshot?: Json;
          recipient_name?: string;
          recipient_phone?: string | null;
          city_id?: string | null;
          deliver_on?: string;
          delivery_slot?: string | null;
          delivery_instructions?: string | null;
          dietary_snapshot?: Json;
          currency?: string;
          items_cost_paisa?: number;
          delivery_cost_paisa?: number;
          items_price_paisa?: number;
          delivery_price_paisa?: number;
          budget_paisa?: number;
          over_budget_approved_by?: string | null;
          assigned_staff_id?: string | null;
          ops_sla_due_at?: string | null;
          is_fallback?: boolean;
          vendor_order_ref?: string | null;
          vendor_invoice_ref?: string | null;
          vendor_paid_at?: string | null;
          placed_at?: string | null;
          placed_by?: string | null;
          delivered_at?: string | null;
          failure_reason?: string | null;
          cancelled_at?: string | null;
          invoice_id?: string | null;
          invoiced_at?: string | null;
          internal_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gift_orders_address_id_fkey";
            columns: ["address_id"];
            isOneToOne: false;
            referencedRelation: "addresses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gift_orders_assigned_staff_id_fkey";
            columns: ["assigned_staff_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gift_orders_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gift_orders_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gift_orders_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gift_orders_moment_event_id_fkey";
            columns: ["moment_event_id"];
            isOneToOne: true;
            referencedRelation: "moment_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gift_orders_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gift_orders_over_budget_approved_by_fkey";
            columns: ["over_budget_approved_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gift_orders_placed_by_fkey";
            columns: ["placed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "gift_orders_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      gift_products: {
        Row: {
          id: string;
          vendor_id: string;
          sku: string | null;
          name: string;
          name_ur: string | null;
          description: string | null;
          category: Database["moments"]["Enums"]["product_category"];
          cost_paisa: number;
          list_price_paisa: number;
          margin_paisa: number | null;
          margin_bps: number | null;
          is_food: boolean;
          is_halal_certified: boolean;
          is_eggless: boolean;
          is_vegetarian: boolean;
          contains_nuts: boolean;
          contains_gelatin: boolean;
          allergen_notes: string | null;
          suitable_moment_keys: string[];
          gender_suitability: string;
          personalisation_fields: string[];
          min_lead_days: number;
          is_digital: boolean;
          image_url: string | null;
          tags: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          vendor_id: string;
          sku?: string | null;
          name: string;
          name_ur?: string | null;
          description?: string | null;
          category: Database["moments"]["Enums"]["product_category"];
          cost_paisa: number;
          list_price_paisa: number;
          is_food?: boolean;
          is_halal_certified?: boolean;
          is_eggless?: boolean;
          is_vegetarian?: boolean;
          contains_nuts?: boolean;
          contains_gelatin?: boolean;
          allergen_notes?: string | null;
          suitable_moment_keys?: string[];
          gender_suitability?: string;
          personalisation_fields?: string[];
          min_lead_days?: number;
          is_digital?: boolean;
          image_url?: string | null;
          tags?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          vendor_id?: string;
          sku?: string | null;
          name?: string;
          name_ur?: string | null;
          description?: string | null;
          category?: Database["moments"]["Enums"]["product_category"];
          cost_paisa?: number;
          list_price_paisa?: number;
          is_food?: boolean;
          is_halal_certified?: boolean;
          is_eggless?: boolean;
          is_vegetarian?: boolean;
          contains_nuts?: boolean;
          contains_gelatin?: boolean;
          allergen_notes?: string | null;
          suitable_moment_keys?: string[];
          gender_suitability?: string;
          personalisation_fields?: string[];
          min_lead_days?: number;
          is_digital?: boolean;
          image_url?: string | null;
          tags?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gift_products_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      invitations: {
        Row: {
          id: string;
          org_id: string;
          email: string;
          role: Database["moments"]["Enums"]["org_role"];
          token_id: string | null;
          invited_by: string | null;
          accepted_at: string | null;
          accepted_by: string | null;
          revoked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          email: string;
          role?: Database["moments"]["Enums"]["org_role"];
          token_id?: string | null;
          invited_by?: string | null;
          accepted_at?: string | null;
          accepted_by?: string | null;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          email?: string;
          role?: Database["moments"]["Enums"]["org_role"];
          token_id?: string | null;
          invited_by?: string | null;
          accepted_at?: string | null;
          accepted_by?: string | null;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invitations_accepted_by_fkey";
            columns: ["accepted_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invitations_token_id_fkey";
            columns: ["token_id"];
            isOneToOne: false;
            referencedRelation: "action_tokens";
            referencedColumns: ["id"];
          },
        ];
      };
      invoice_lines: {
        Row: {
          id: string;
          invoice_id: string;
          org_id: string;
          kind: string;
          description: string;
          quantity: number;
          unit_price_paisa: number;
          amount_paisa: number;
          gift_order_id: string | null;
          moment_event_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          org_id: string;
          kind: string;
          description: string;
          quantity?: number;
          unit_price_paisa: number;
          amount_paisa: number;
          gift_order_id?: string | null;
          moment_event_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          org_id?: string;
          kind?: string;
          description?: string;
          quantity?: number;
          unit_price_paisa?: number;
          amount_paisa?: number;
          gift_order_id?: string | null;
          moment_event_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoice_lines_gift_order_id_fkey";
            columns: ["gift_order_id"];
            isOneToOne: false;
            referencedRelation: "gift_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_lines_moment_event_id_fkey";
            columns: ["moment_event_id"];
            isOneToOne: false;
            referencedRelation: "moment_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoice_lines_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      invoices: {
        Row: {
          id: string;
          org_id: string;
          number: string;
          kind: Database["moments"]["Enums"]["invoice_kind"];
          status: Database["moments"]["Enums"]["invoice_status"];
          period_start: string;
          period_end: string;
          currency: string;
          subtotal_subscription_paisa: number;
          subtotal_gifts_paisa: number;
          subtotal_delivery_paisa: number;
          adjustments_paisa: number;
          tax_rate_bps: number;
          tax_paisa: number;
          total_paisa: number;
          paid_paisa: number;
          wht_paisa: number;
          wht_certificate_ref: string | null;
          employee_count_snapshot: number | null;
          notes: string | null;
          pdf_path: string | null;
          issued_at: string | null;
          due_on: string | null;
          paid_at: string | null;
          voided_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          number: string;
          kind?: Database["moments"]["Enums"]["invoice_kind"];
          status?: Database["moments"]["Enums"]["invoice_status"];
          period_start: string;
          period_end: string;
          currency?: string;
          subtotal_subscription_paisa?: number;
          subtotal_gifts_paisa?: number;
          subtotal_delivery_paisa?: number;
          adjustments_paisa?: number;
          tax_rate_bps?: number;
          tax_paisa?: number;
          total_paisa?: number;
          paid_paisa?: number;
          wht_paisa?: number;
          wht_certificate_ref?: string | null;
          employee_count_snapshot?: number | null;
          notes?: string | null;
          pdf_path?: string | null;
          issued_at?: string | null;
          due_on?: string | null;
          paid_at?: string | null;
          voided_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          number?: string;
          kind?: Database["moments"]["Enums"]["invoice_kind"];
          status?: Database["moments"]["Enums"]["invoice_status"];
          period_start?: string;
          period_end?: string;
          currency?: string;
          subtotal_subscription_paisa?: number;
          subtotal_gifts_paisa?: number;
          subtotal_delivery_paisa?: number;
          adjustments_paisa?: number;
          tax_rate_bps?: number;
          tax_paisa?: number;
          total_paisa?: number;
          paid_paisa?: number;
          wht_paisa?: number;
          wht_certificate_ref?: string | null;
          employee_count_snapshot?: number | null;
          notes?: string | null;
          pdf_path?: string | null;
          issued_at?: string | null;
          due_on?: string | null;
          paid_at?: string | null;
          voided_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "invoices_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      job_runs: {
        Row: {
          id: number;
          kind: string;
          org_id: string | null;
          status: string;
          started_at: string;
          finished_at: string | null;
          duration_ms: number | null;
          counts: Json;
          error: string | null;
          worker_id: string | null;
        };
        Insert: {
          id: number;
          kind: string;
          org_id?: string | null;
          status?: string;
          started_at?: string;
          finished_at?: string | null;
          duration_ms?: number | null;
          counts?: Json;
          error?: string | null;
          worker_id?: string | null;
        };
        Update: {
          id?: number;
          kind?: string;
          org_id?: string | null;
          status?: string;
          started_at?: string;
          finished_at?: string | null;
          duration_ms?: number | null;
          counts?: Json;
          error?: string | null;
          worker_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "job_runs_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      message_templates: {
        Row: {
          id: string;
          org_id: string | null;
          moment_type_id: string | null;
          channel: Database["moments"]["Enums"]["channel"];
          audience: Database["moments"]["Enums"]["message_audience"];
          locale: string;
          tone: string;
          subject: string | null;
          body: string;
          whatsapp_template_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          moment_type_id?: string | null;
          channel: Database["moments"]["Enums"]["channel"];
          audience: Database["moments"]["Enums"]["message_audience"];
          locale?: string;
          tone?: string;
          subject?: string | null;
          body: string;
          whatsapp_template_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          moment_type_id?: string | null;
          channel?: Database["moments"]["Enums"]["channel"];
          audience?: Database["moments"]["Enums"]["message_audience"];
          locale?: string;
          tone?: string;
          subject?: string | null;
          body?: string;
          whatsapp_template_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "message_templates_moment_type_id_fkey";
            columns: ["moment_type_id"];
            isOneToOne: false;
            referencedRelation: "moment_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_templates_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "message_templates_whatsapp_template_id_fkey";
            columns: ["whatsapp_template_id"];
            isOneToOne: false;
            referencedRelation: "whatsapp_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      milestone_tiers: {
        Row: {
          id: string;
          org_id: string;
          moment_type_id: string;
          label: string;
          years_range: string;
          budget_paisa: number;
          bundle_id: string | null;
          extra_perks: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          moment_type_id: string;
          label: string;
          years_range: string;
          budget_paisa: number;
          bundle_id?: string | null;
          extra_perks?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          moment_type_id?: string;
          label?: string;
          years_range?: string;
          budget_paisa?: number;
          bundle_id?: string | null;
          extra_perks?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "milestone_tiers_bundle_id_fkey";
            columns: ["bundle_id"];
            isOneToOne: false;
            referencedRelation: "gift_bundles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "milestone_tiers_moment_type_id_fkey";
            columns: ["moment_type_id"];
            isOneToOne: false;
            referencedRelation: "moment_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "milestone_tiers_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      moment_events: {
        Row: {
          id: string;
          org_id: string;
          employee_id: string | null;
          moment_type_id: string;
          policy_id: string | null;
          occurrence_key: string;
          occurs_on: string;
          occurrence_year: number | null;
          timezone: string;
          announce_local_time: string;
          announce_at: string | null;
          status: Database["moments"]["Enums"]["moment_status"];
          title: string | null;
          milestone_years: number | null;
          milestone_tier_id: string | null;
          budget_paisa: number;
          approval_required: boolean;
          delivery_target: Database["moments"]["Enums"]["delivery_target"];
          gift_enabled: boolean;
          announcement_enabled: boolean;
          announce_publicly: boolean;
          policy_snapshot: Json;
          source: Database["moments"]["Enums"]["moment_date_source"];
          source_ref_id: string | null;
          is_provisional: boolean;
          occurrence_note: string | null;
          gift_order_id: string | null;
          announcement_payload: Json | null;
          completed_at: string | null;
          cancelled_at: string | null;
          cancel_reason: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          employee_id?: string | null;
          moment_type_id: string;
          policy_id?: string | null;
          occurrence_key: string;
          occurs_on: string;
          timezone?: string;
          announce_local_time?: string;
          announce_at?: string | null;
          status?: Database["moments"]["Enums"]["moment_status"];
          title?: string | null;
          milestone_years?: number | null;
          milestone_tier_id?: string | null;
          budget_paisa?: number;
          approval_required?: boolean;
          delivery_target?: Database["moments"]["Enums"]["delivery_target"];
          gift_enabled?: boolean;
          announcement_enabled?: boolean;
          announce_publicly?: boolean;
          policy_snapshot?: Json;
          source?: Database["moments"]["Enums"]["moment_date_source"];
          source_ref_id?: string | null;
          is_provisional?: boolean;
          occurrence_note?: string | null;
          gift_order_id?: string | null;
          announcement_payload?: Json | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
          cancel_reason?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          employee_id?: string | null;
          moment_type_id?: string;
          policy_id?: string | null;
          occurrence_key?: string;
          occurs_on?: string;
          timezone?: string;
          announce_local_time?: string;
          announce_at?: string | null;
          status?: Database["moments"]["Enums"]["moment_status"];
          title?: string | null;
          milestone_years?: number | null;
          milestone_tier_id?: string | null;
          budget_paisa?: number;
          approval_required?: boolean;
          delivery_target?: Database["moments"]["Enums"]["delivery_target"];
          gift_enabled?: boolean;
          announcement_enabled?: boolean;
          announce_publicly?: boolean;
          policy_snapshot?: Json;
          source?: Database["moments"]["Enums"]["moment_date_source"];
          source_ref_id?: string | null;
          is_provisional?: boolean;
          occurrence_note?: string | null;
          gift_order_id?: string | null;
          announcement_payload?: Json | null;
          completed_at?: string | null;
          cancelled_at?: string | null;
          cancel_reason?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "moment_events_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moment_events_gift_order_id_fkey";
            columns: ["gift_order_id"];
            isOneToOne: false;
            referencedRelation: "gift_orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moment_events_milestone_tier_id_fkey";
            columns: ["milestone_tier_id"];
            isOneToOne: false;
            referencedRelation: "milestone_tiers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moment_events_moment_type_id_fkey";
            columns: ["moment_type_id"];
            isOneToOne: false;
            referencedRelation: "moment_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moment_events_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moment_events_policy_id_fkey";
            columns: ["policy_id"];
            isOneToOne: false;
            referencedRelation: "moment_policies";
            referencedColumns: ["id"];
          },
        ];
      };
      moment_policies: {
        Row: {
          id: string;
          org_id: string;
          moment_type_id: string;
          is_enabled: boolean;
          budget_paisa: number;
          budget_includes_delivery: boolean;
          verify_offset_days: number;
          select_offset_days: number;
          approval_offset_days: number;
          approval_required: boolean;
          approval_threshold_paisa: number | null;
          approver_kind: Database["moments"]["Enums"]["approver_kind"];
          approval_channel: Database["moments"]["Enums"]["channel"];
          auto_approve_after_hours: number;
          gift_enabled: boolean;
          card_enabled: boolean;
          delivery_target: Database["moments"]["Enums"]["delivery_target"];
          allowed_categories: Database["moments"]["Enums"]["product_category"][];
          default_bundle_id: string | null;
          announcement_enabled: boolean;
          announcement_channels: Database["moments"]["Enums"]["channel"][];
          announcement_local_time: string;
          announcement_locale: string;
          announce_publicly: boolean;
          skip_on_weekend: boolean;
          manager_nudge_enabled: boolean;
          manager_nudge_channel: Database["moments"]["Enums"]["channel"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          moment_type_id: string;
          is_enabled?: boolean;
          budget_paisa: number;
          budget_includes_delivery?: boolean;
          verify_offset_days?: number;
          select_offset_days?: number;
          approval_offset_days?: number;
          approval_required?: boolean;
          approval_threshold_paisa?: number | null;
          approver_kind?: Database["moments"]["Enums"]["approver_kind"];
          approval_channel?: Database["moments"]["Enums"]["channel"];
          auto_approve_after_hours?: number;
          gift_enabled?: boolean;
          card_enabled?: boolean;
          delivery_target?: Database["moments"]["Enums"]["delivery_target"];
          allowed_categories?: Database["moments"]["Enums"]["product_category"][];
          default_bundle_id?: string | null;
          announcement_enabled?: boolean;
          announcement_channels?: Database["moments"]["Enums"]["channel"][];
          announcement_local_time?: string;
          announcement_locale?: string;
          announce_publicly?: boolean;
          skip_on_weekend?: boolean;
          manager_nudge_enabled?: boolean;
          manager_nudge_channel?: Database["moments"]["Enums"]["channel"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          moment_type_id?: string;
          is_enabled?: boolean;
          budget_paisa?: number;
          budget_includes_delivery?: boolean;
          verify_offset_days?: number;
          select_offset_days?: number;
          approval_offset_days?: number;
          approval_required?: boolean;
          approval_threshold_paisa?: number | null;
          approver_kind?: Database["moments"]["Enums"]["approver_kind"];
          approval_channel?: Database["moments"]["Enums"]["channel"];
          auto_approve_after_hours?: number;
          gift_enabled?: boolean;
          card_enabled?: boolean;
          delivery_target?: Database["moments"]["Enums"]["delivery_target"];
          allowed_categories?: Database["moments"]["Enums"]["product_category"][];
          default_bundle_id?: string | null;
          announcement_enabled?: boolean;
          announcement_channels?: Database["moments"]["Enums"]["channel"][];
          announcement_local_time?: string;
          announcement_locale?: string;
          announce_publicly?: boolean;
          skip_on_weekend?: boolean;
          manager_nudge_enabled?: boolean;
          manager_nudge_channel?: Database["moments"]["Enums"]["channel"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "moment_policies_default_bundle_id_fkey";
            columns: ["default_bundle_id"];
            isOneToOne: false;
            referencedRelation: "gift_bundles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moment_policies_moment_type_id_fkey";
            columns: ["moment_type_id"];
            isOneToOne: false;
            referencedRelation: "moment_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moment_policies_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      moment_tasks: {
        Row: {
          id: string;
          org_id: string;
          moment_event_id: string;
          task_type: Database["moments"]["Enums"]["task_type"];
          lane: Database["moments"]["Enums"]["task_lane"];
          status: Database["moments"]["Enums"]["task_status"];
          scheduled_for: string;
          next_attempt_at: string;
          priority: number;
          attempts: number;
          max_attempts: number;
          late_threshold_seconds: number;
          locked_by: string | null;
          locked_at: string | null;
          lease_expires_at: string | null;
          last_error: string | null;
          error_class: string | null;
          last_error_at: string | null;
          payload: Json;
          result: Json | null;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          moment_event_id: string;
          task_type: Database["moments"]["Enums"]["task_type"];
          lane?: Database["moments"]["Enums"]["task_lane"];
          status?: Database["moments"]["Enums"]["task_status"];
          scheduled_for: string;
          next_attempt_at: string;
          priority?: number;
          attempts?: number;
          max_attempts?: number;
          late_threshold_seconds?: number;
          locked_by?: string | null;
          locked_at?: string | null;
          lease_expires_at?: string | null;
          last_error?: string | null;
          error_class?: string | null;
          last_error_at?: string | null;
          payload?: Json;
          result?: Json | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          moment_event_id?: string;
          task_type?: Database["moments"]["Enums"]["task_type"];
          lane?: Database["moments"]["Enums"]["task_lane"];
          status?: Database["moments"]["Enums"]["task_status"];
          scheduled_for?: string;
          next_attempt_at?: string;
          priority?: number;
          attempts?: number;
          max_attempts?: number;
          late_threshold_seconds?: number;
          locked_by?: string | null;
          locked_at?: string | null;
          lease_expires_at?: string | null;
          last_error?: string | null;
          error_class?: string | null;
          last_error_at?: string | null;
          payload?: Json;
          result?: Json | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "moment_tasks_moment_event_id_fkey";
            columns: ["moment_event_id"];
            isOneToOne: false;
            referencedRelation: "moment_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "moment_tasks_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      moment_types: {
        Row: {
          id: string;
          org_id: string | null;
          key: string;
          label: string;
          label_ur: string | null;
          description: string | null;
          category: Database["moments"]["Enums"]["moment_category"];
          date_source: Database["moments"]["Enums"]["moment_date_source"];
          source_field: string | null;
          source_observance: Database["moments"]["Enums"]["observance_key"] | null;
          is_recurring_annual: boolean;
          supports_milestones: boolean;
          default_budget_paisa: number;
          default_verify_offset_days: number;
          default_select_offset_days: number;
          default_approval_offset_days: number;
          default_announce_local_time: string;
          default_announce_publicly: boolean;
          default_gift_categories: Database["moments"]["Enums"]["product_category"][];
          is_system: boolean;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          key: string;
          label: string;
          label_ur?: string | null;
          description?: string | null;
          category: Database["moments"]["Enums"]["moment_category"];
          date_source: Database["moments"]["Enums"]["moment_date_source"];
          source_field?: string | null;
          source_observance?: Database["moments"]["Enums"]["observance_key"] | null;
          is_recurring_annual?: boolean;
          supports_milestones?: boolean;
          default_budget_paisa?: number;
          default_verify_offset_days?: number;
          default_select_offset_days?: number;
          default_approval_offset_days?: number;
          default_announce_local_time?: string;
          default_announce_publicly?: boolean;
          default_gift_categories?: Database["moments"]["Enums"]["product_category"][];
          is_system?: boolean;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          key?: string;
          label?: string;
          label_ur?: string | null;
          description?: string | null;
          category?: Database["moments"]["Enums"]["moment_category"];
          date_source?: Database["moments"]["Enums"]["moment_date_source"];
          source_field?: string | null;
          source_observance?: Database["moments"]["Enums"]["observance_key"] | null;
          is_recurring_annual?: boolean;
          supports_milestones?: boolean;
          default_budget_paisa?: number;
          default_verify_offset_days?: number;
          default_select_offset_days?: number;
          default_approval_offset_days?: number;
          default_announce_local_time?: string;
          default_announce_publicly?: boolean;
          default_gift_categories?: Database["moments"]["Enums"]["product_category"][];
          is_system?: boolean;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "moment_types_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      observance_dates: {
        Row: {
          id: string;
          country_code: string;
          observance: Database["moments"]["Enums"]["observance_key"];
          hijri_year: number;
          gregorian_date: string;
          end_date: string | null;
          status: Database["moments"]["Enums"]["observance_status"];
          source: string | null;
          source_url: string | null;
          confirmed_by: string | null;
          confirmed_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          country_code?: string;
          observance: Database["moments"]["Enums"]["observance_key"];
          hijri_year: number;
          gregorian_date: string;
          end_date?: string | null;
          status?: Database["moments"]["Enums"]["observance_status"];
          source?: string | null;
          source_url?: string | null;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          country_code?: string;
          observance?: Database["moments"]["Enums"]["observance_key"];
          hijri_year?: number;
          gregorian_date?: string;
          end_date?: string | null;
          status?: Database["moments"]["Enums"]["observance_status"];
          source?: string | null;
          source_url?: string | null;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "observance_dates_confirmed_by_fkey";
            columns: ["confirmed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      offices: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          city_id: string | null;
          address_line: string | null;
          area: string | null;
          landmark: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          timezone: string;
          is_default: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          city_id?: string | null;
          address_line?: string | null;
          area?: string | null;
          landmark?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          timezone?: string;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          city_id?: string | null;
          address_line?: string | null;
          area?: string | null;
          landmark?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          timezone?: string;
          is_default?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offices_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "offices_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      org_integrations: {
        Row: {
          id: string;
          org_id: string;
          provider: Database["moments"]["Enums"]["integration_provider"];
          status: Database["moments"]["Enums"]["integration_status"];
          display_name: string | null;
          external_team_id: string | null;
          external_account_id: string | null;
          default_channel_ref: string | null;
          config_public: Json;
          access_token_secret_id: string | null;
          refresh_token_secret_id: string | null;
          signing_secret_id: string | null;
          token_expires_at: string | null;
          scopes: string[];
          installed_by: string | null;
          last_verified_at: string | null;
          last_error: string | null;
          last_error_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          provider: Database["moments"]["Enums"]["integration_provider"];
          status?: Database["moments"]["Enums"]["integration_status"];
          display_name?: string | null;
          external_team_id?: string | null;
          external_account_id?: string | null;
          default_channel_ref?: string | null;
          config_public?: Json;
          access_token_secret_id?: string | null;
          refresh_token_secret_id?: string | null;
          signing_secret_id?: string | null;
          token_expires_at?: string | null;
          scopes?: string[];
          installed_by?: string | null;
          last_verified_at?: string | null;
          last_error?: string | null;
          last_error_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          provider?: Database["moments"]["Enums"]["integration_provider"];
          status?: Database["moments"]["Enums"]["integration_status"];
          display_name?: string | null;
          external_team_id?: string | null;
          external_account_id?: string | null;
          default_channel_ref?: string | null;
          config_public?: Json;
          access_token_secret_id?: string | null;
          refresh_token_secret_id?: string | null;
          signing_secret_id?: string | null;
          token_expires_at?: string | null;
          scopes?: string[];
          installed_by?: string | null;
          last_verified_at?: string | null;
          last_error?: string | null;
          last_error_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "org_integrations_installed_by_fkey";
            columns: ["installed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "org_integrations_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      org_members: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          role: Database["moments"]["Enums"]["org_role"];
          status: Database["moments"]["Enums"]["membership_status"];
          employee_id: string | null;
          invited_by: string | null;
          joined_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          role?: Database["moments"]["Enums"]["org_role"];
          status?: Database["moments"]["Enums"]["membership_status"];
          employee_id?: string | null;
          invited_by?: string | null;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          role?: Database["moments"]["Enums"]["org_role"];
          status?: Database["moments"]["Enums"]["membership_status"];
          employee_id?: string | null;
          invited_by?: string | null;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "org_members_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "org_members_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "org_members_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "org_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          id: string;
          slug: string;
          name: string;
          legal_name: string | null;
          status: Database["moments"]["Enums"]["org_status"];
          timezone: string;
          currency: string;
          default_locale: string;
          ntn: string | null;
          strn: string | null;
          tax_jurisdiction: string | null;
          billing_email: string | null;
          billing_address: Json;
          billing_city_id: string | null;
          feb29_observed_on: string;
          late_announcement_policy: string;
          announcement_digest_threshold: number;
          celebrate_on_terminated_exit: boolean;
          dry_run_until: string | null;
          employee_count_hint: number | null;
          logo_url: string | null;
          brand_color: string | null;
          onboarding_state: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          legal_name?: string | null;
          status?: Database["moments"]["Enums"]["org_status"];
          timezone?: string;
          currency?: string;
          default_locale?: string;
          ntn?: string | null;
          strn?: string | null;
          tax_jurisdiction?: string | null;
          billing_email?: string | null;
          billing_address?: Json;
          billing_city_id?: string | null;
          feb29_observed_on?: string;
          late_announcement_policy?: string;
          announcement_digest_threshold?: number;
          celebrate_on_terminated_exit?: boolean;
          dry_run_until?: string | null;
          employee_count_hint?: number | null;
          logo_url?: string | null;
          brand_color?: string | null;
          onboarding_state?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          legal_name?: string | null;
          status?: Database["moments"]["Enums"]["org_status"];
          timezone?: string;
          currency?: string;
          default_locale?: string;
          ntn?: string | null;
          strn?: string | null;
          tax_jurisdiction?: string | null;
          billing_email?: string | null;
          billing_address?: Json;
          billing_city_id?: string | null;
          feb29_observed_on?: string;
          late_announcement_policy?: string;
          announcement_digest_threshold?: number;
          celebrate_on_terminated_exit?: boolean;
          dry_run_until?: string | null;
          employee_count_hint?: number | null;
          logo_url?: string | null;
          brand_color?: string | null;
          onboarding_state?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "organizations_billing_city_id_fkey";
            columns: ["billing_city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "organizations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      outbound_message_events: {
        Row: {
          id: number;
          message_id: string;
          org_id: string | null;
          status: Database["moments"]["Enums"]["message_status"];
          detail: Json;
          occurred_at: string;
        };
        Insert: {
          id: number;
          message_id: string;
          org_id?: string | null;
          status: Database["moments"]["Enums"]["message_status"];
          detail?: Json;
          occurred_at?: string;
        };
        Update: {
          id?: number;
          message_id?: string;
          org_id?: string | null;
          status?: Database["moments"]["Enums"]["message_status"];
          detail?: Json;
          occurred_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "outbound_message_events_message_id_fkey";
            columns: ["message_id"];
            isOneToOne: false;
            referencedRelation: "outbound_messages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outbound_message_events_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      outbound_messages: {
        Row: {
          id: string;
          org_id: string;
          moment_event_id: string | null;
          task_id: string | null;
          employee_id: string | null;
          channel: Database["moments"]["Enums"]["channel"];
          audience: Database["moments"]["Enums"]["message_audience"];
          template_id: string | null;
          idempotency_key: string;
          recipient_ref: string;
          rendered_subject: string | null;
          rendered_body: string | null;
          payload: Json;
          status: Database["moments"]["Enums"]["message_status"];
          scheduled_for: string | null;
          sent_at: string | null;
          delivered_at: string | null;
          read_at: string | null;
          failed_at: string | null;
          provider_message_id: string | null;
          provider_response: Json | null;
          error_code: string | null;
          error_message: string | null;
          is_preview: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          moment_event_id?: string | null;
          task_id?: string | null;
          employee_id?: string | null;
          channel: Database["moments"]["Enums"]["channel"];
          audience: Database["moments"]["Enums"]["message_audience"];
          template_id?: string | null;
          idempotency_key: string;
          recipient_ref: string;
          rendered_subject?: string | null;
          rendered_body?: string | null;
          payload?: Json;
          status?: Database["moments"]["Enums"]["message_status"];
          scheduled_for?: string | null;
          sent_at?: string | null;
          delivered_at?: string | null;
          read_at?: string | null;
          failed_at?: string | null;
          provider_message_id?: string | null;
          provider_response?: Json | null;
          error_code?: string | null;
          error_message?: string | null;
          is_preview?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          moment_event_id?: string | null;
          task_id?: string | null;
          employee_id?: string | null;
          channel?: Database["moments"]["Enums"]["channel"];
          audience?: Database["moments"]["Enums"]["message_audience"];
          template_id?: string | null;
          idempotency_key?: string;
          recipient_ref?: string;
          rendered_subject?: string | null;
          rendered_body?: string | null;
          payload?: Json;
          status?: Database["moments"]["Enums"]["message_status"];
          scheduled_for?: string | null;
          sent_at?: string | null;
          delivered_at?: string | null;
          read_at?: string | null;
          failed_at?: string | null;
          provider_message_id?: string | null;
          provider_response?: Json | null;
          error_code?: string | null;
          error_message?: string | null;
          is_preview?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "outbound_messages_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outbound_messages_moment_event_id_fkey";
            columns: ["moment_event_id"];
            isOneToOne: false;
            referencedRelation: "moment_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outbound_messages_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outbound_messages_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "moment_tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outbound_messages_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "message_templates";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          org_id: string;
          invoice_id: string | null;
          method: Database["moments"]["Enums"]["payment_method"];
          status: Database["moments"]["Enums"]["payment_status"];
          amount_paisa: number;
          wht_paisa: number;
          paid_on: string | null;
          bank_reference: string | null;
          proof_path: string | null;
          submitted_by: string | null;
          submitted_at: string;
          verified_by: string | null;
          verified_at: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          invoice_id?: string | null;
          method?: Database["moments"]["Enums"]["payment_method"];
          status?: Database["moments"]["Enums"]["payment_status"];
          amount_paisa: number;
          wht_paisa?: number;
          paid_on?: string | null;
          bank_reference?: string | null;
          proof_path?: string | null;
          submitted_by?: string | null;
          submitted_at?: string;
          verified_by?: string | null;
          verified_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          invoice_id?: string | null;
          method?: Database["moments"]["Enums"]["payment_method"];
          status?: Database["moments"]["Enums"]["payment_status"];
          amount_paisa?: number;
          wht_paisa?: number;
          paid_on?: string | null;
          bank_reference?: string | null;
          proof_path?: string | null;
          submitted_by?: string | null;
          submitted_at?: string;
          verified_by?: string | null;
          verified_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_submitted_by_fkey";
            columns: ["submitted_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      plans: {
        Row: {
          id: string;
          code: string;
          name: string;
          base_price_paisa: number;
          included_employees: number;
          per_employee_paisa: number;
          gift_margin_bps: number;
          min_margin_paisa: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          base_price_paisa: number;
          included_employees?: number;
          per_employee_paisa?: number;
          gift_margin_bps?: number;
          min_margin_paisa?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          base_price_paisa?: number;
          included_employees?: number;
          per_employee_paisa?: number;
          gift_margin_bps?: number;
          min_margin_paisa?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
        ];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string | null;
          phone_e164: string | null;
          avatar_url: string | null;
          locale: string;
          timezone: string;
          default_org_id: string | null;
          last_seen_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          email?: string | null;
          phone_e164?: string | null;
          avatar_url?: string | null;
          locale?: string;
          timezone?: string;
          default_org_id?: string | null;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string | null;
          phone_e164?: string | null;
          avatar_url?: string | null;
          locale?: string;
          timezone?: string;
          default_org_id?: string | null;
          last_seen_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_default_org_id_fkey";
            columns: ["default_org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limit_buckets: {
        Row: {
          bucket_key: string;
          window_start: string;
          count: number;
        };
        Insert: {
          bucket_key: string;
          window_start: string;
          count?: number;
        };
        Update: {
          bucket_key?: string;
          window_start?: string;
          count?: number;
        };
        Relationships: [
        ];
      };
      staff_users: {
        Row: {
          user_id: string;
          role: Database["moments"]["Enums"]["staff_role"];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          role?: Database["moments"]["Enums"]["staff_role"];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          role?: Database["moments"]["Enums"]["staff_role"];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_users_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          org_id: string;
          plan_id: string;
          status: Database["moments"]["Enums"]["subscription_status"];
          period: string;
          billing_day: number;
          committed_employees: number | null;
          trial_ends_on: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          plan_id: string;
          status?: Database["moments"]["Enums"]["subscription_status"];
          period: string;
          billing_day?: number;
          committed_employees?: number | null;
          trial_ends_on?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          plan_id?: string;
          status?: Database["moments"]["Enums"]["subscription_status"];
          period?: string;
          billing_day?: number;
          committed_employees?: number | null;
          trial_ends_on?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      suppressions: {
        Row: {
          id: string;
          org_id: string | null;
          channel: Database["moments"]["Enums"]["channel"];
          target: string;
          reason: string;
          detail: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          channel: Database["moments"]["Enums"]["channel"];
          target: string;
          reason: string;
          detail?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          channel?: Database["moments"]["Enums"]["channel"];
          target?: string;
          reason?: string;
          detail?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "suppressions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      task_attempts: {
        Row: {
          id: number;
          task_id: string;
          org_id: string | null;
          attempt: number;
          worker_id: string | null;
          started_at: string;
          finished_at: string | null;
          duration_ms: number | null;
          outcome: string | null;
          error_class: string | null;
          error: string | null;
          result: Json | null;
        };
        Insert: {
          id: number;
          task_id: string;
          org_id?: string | null;
          attempt: number;
          worker_id?: string | null;
          started_at?: string;
          finished_at?: string | null;
          duration_ms?: number | null;
          outcome?: string | null;
          error_class?: string | null;
          error?: string | null;
          result?: Json | null;
        };
        Update: {
          id?: number;
          task_id?: string;
          org_id?: string | null;
          attempt?: number;
          worker_id?: string | null;
          started_at?: string;
          finished_at?: string | null;
          duration_ms?: number | null;
          outcome?: string | null;
          error_class?: string | null;
          error?: string | null;
          result?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "task_attempts_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_attempts_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "moment_tasks";
            referencedColumns: ["id"];
          },
        ];
      };
      token_events: {
        Row: {
          id: number;
          token_id: string;
          org_id: string | null;
          kind: string;
          ip: string | null;
          user_agent: string | null;
          detail: Json;
          occurred_at: string;
        };
        Insert: {
          id: number;
          token_id: string;
          org_id?: string | null;
          kind: string;
          ip?: string | null;
          user_agent?: string | null;
          detail?: Json;
          occurred_at?: string;
        };
        Update: {
          id?: number;
          token_id?: string;
          org_id?: string | null;
          kind?: string;
          ip?: string | null;
          user_agent?: string | null;
          detail?: Json;
          occurred_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "token_events_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "token_events_token_id_fkey";
            columns: ["token_id"];
            isOneToOne: false;
            referencedRelation: "action_tokens";
            referencedColumns: ["id"];
          },
        ];
      };
      vendor_city_coverage: {
        Row: {
          vendor_id: string;
          city_id: string;
          lead_time_days: number;
          delivery_fee_paisa: number;
          min_order_paisa: number;
          order_cutoff_local: string | null;
          covered_areas: string[];
          same_day_available: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          vendor_id: string;
          city_id: string;
          lead_time_days?: number;
          delivery_fee_paisa?: number;
          min_order_paisa?: number;
          order_cutoff_local?: string | null;
          covered_areas?: string[];
          same_day_available?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          vendor_id?: string;
          city_id?: string;
          lead_time_days?: number;
          delivery_fee_paisa?: number;
          min_order_paisa?: number;
          order_cutoff_local?: string | null;
          covered_areas?: string[];
          same_day_available?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vendor_city_coverage_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendor_city_coverage_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      vendors: {
        Row: {
          id: string;
          name: string;
          legal_name: string | null;
          category: string | null;
          contact_name: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          whatsapp_e164: string | null;
          ntn: string | null;
          payment_terms: string | null;
          ordering_method: string | null;
          default_lead_days: number;
          reliability_score: number | null;
          is_active: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          legal_name?: string | null;
          category?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          whatsapp_e164?: string | null;
          ntn?: string | null;
          payment_terms?: string | null;
          ordering_method?: string | null;
          default_lead_days?: number;
          reliability_score?: number | null;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          legal_name?: string | null;
          category?: string | null;
          contact_name?: string | null;
          contact_phone?: string | null;
          contact_email?: string | null;
          whatsapp_e164?: string | null;
          ntn?: string | null;
          payment_terms?: string | null;
          ordering_method?: string | null;
          default_lead_days?: number;
          reliability_score?: number | null;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
        ];
      };
      wallet_accounts: {
        Row: {
          org_id: string;
          balance_paisa: number;
          held_paisa: number;
          low_balance_threshold_paisa: number;
          on_insufficient: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          org_id: string;
          balance_paisa?: number;
          held_paisa?: number;
          low_balance_threshold_paisa?: number;
          on_insufficient?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          org_id?: string;
          balance_paisa?: number;
          held_paisa?: number;
          low_balance_threshold_paisa?: number;
          on_insufficient?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallet_accounts_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      wallet_ledger: {
        Row: {
          id: number;
          org_id: string;
          direction: Database["moments"]["Enums"]["wallet_direction"];
          reason: Database["moments"]["Enums"]["wallet_reason"];
          amount_paisa: number;
          balance_after_paisa: number;
          ref_type: string | null;
          ref_id: string | null;
          description: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id: number;
          org_id: string;
          direction: Database["moments"]["Enums"]["wallet_direction"];
          reason: Database["moments"]["Enums"]["wallet_reason"];
          amount_paisa: number;
          balance_after_paisa: number;
          ref_type?: string | null;
          ref_id?: string | null;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          org_id?: string;
          direction?: Database["moments"]["Enums"]["wallet_direction"];
          reason?: Database["moments"]["Enums"]["wallet_reason"];
          amount_paisa?: number;
          balance_after_paisa?: number;
          ref_type?: string | null;
          ref_id?: string | null;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wallet_ledger_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wallet_ledger_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_sessions: {
        Row: {
          id: string;
          org_id: string;
          employee_id: string | null;
          wa_id: string;
          window_expires_at: string;
          last_inbound_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          employee_id?: string | null;
          wa_id: string;
          window_expires_at: string;
          last_inbound_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          employee_id?: string | null;
          wa_id?: string;
          window_expires_at?: string;
          last_inbound_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_employee_id_fkey";
            columns: ["employee_id"];
            isOneToOne: false;
            referencedRelation: "employees";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "whatsapp_sessions_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      whatsapp_templates: {
        Row: {
          id: string;
          org_id: string | null;
          name: string;
          language: string;
          category: string;
          status: string;
          body: string;
          variable_map: Json;
          external_id: string | null;
          rejected_reason: string | null;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          name: string;
          language?: string;
          category: string;
          status?: string;
          body: string;
          variable_map?: Json;
          external_id?: string | null;
          rejected_reason?: string | null;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          name?: string;
          language?: string;
          category?: string;
          status?: string;
          body?: string;
          variable_map?: Json;
          external_id?: string | null;
          rejected_reason?: string | null;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      v_finance_employees: {
        Row: {
          id: string | null;
          org_id: string | null;
          display_name: string | null;
          department: string | null;
          status: Database["moments"]["Enums"]["employee_status"] | null;
        };
        Relationships: [];
      };
      v_ops_employees: {
        Row: {
          id: string | null;
          org_id: string | null;
          display_name: string | null;
          full_name_ur: string | null;
          phone_e164: string | null;
          whatsapp_e164: string | null;
          halal_only: boolean | null;
          is_vegetarian: boolean | null;
          needs_eggless: boolean | null;
          allergies: string[] | null;
          dietary_notes: string | null;
          shirt_size: string | null;
          line1: string | null;
          line2: string | null;
          area: string | null;
          landmark: string | null;
          city_id: string | null;
          delivery_notes: string | null;
          google_maps_url: string | null;
          verification_status: Database["moments"]["Enums"]["address_verification_status"] | null;
        };
        Relationships: [];
      };
      v_task_health: {
        Row: {
          id: string | null;
          org_id: string | null;
          moment_event_id: string | null;
          task_type: Database["moments"]["Enums"]["task_type"] | null;
          lane: Database["moments"]["Enums"]["task_lane"] | null;
          status: Database["moments"]["Enums"]["task_status"] | null;
          scheduled_for: string | null;
          next_attempt_at: string | null;
          attempts: number | null;
          max_attempts: number | null;
          last_error: string | null;
          error_class: string | null;
          is_late: boolean | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    CompositeTypes: Record<string, never>;
    Enums: {
      actor_kind: "user" | "staff" | "system" | "anon_token" | "service";
      address_kind: "home" | "office" | "other";
      address_verification_status: "unverified" | "link_sent" | "employee_confirmed" | "hr_confirmed" | "employee_updated" | "undeliverable" | "stale";
      alert_severity: "p1" | "p2" | "p3";
      alert_status: "open" | "acknowledged" | "resolved";
      approval_decision: "pending" | "approved" | "rejected" | "expired" | "auto_approved" | "cancelled";
      approver_kind: "hr" | "manager" | "finance" | "owner";
      channel: "email" | "whatsapp" | "slack" | "in_app" | "sms";
      delivery_target: "home" | "office" | "none" | "employee_choice";
      employee_status: "active" | "on_leave" | "notice_period" | "exited";
      import_batch_status: "uploaded" | "validating" | "validated" | "importing" | "completed" | "completed_with_errors" | "failed" | "reverted";
      import_row_status: "pending" | "valid" | "invalid" | "imported" | "updated" | "skipped" | "duplicate";
      integration_provider: "slack" | "whatsapp_cloud" | "email_resend" | "email_smtp" | "webhook" | "twilio";
      integration_status: "pending" | "connected" | "error" | "revoked" | "disconnected";
      invoice_kind: "subscription" | "gifts" | "combined" | "credit_note" | "wallet_topup";
      invoice_status: "draft" | "issued" | "sent" | "partially_paid" | "paid" | "overdue" | "void" | "written_off";
      membership_status: "active" | "invited" | "suspended" | "removed";
      message_audience: "company_announcement" | "manager_nudge" | "employee_dm" | "hr_digest" | "approval_request" | "address_verification" | "ops_alert";
      message_status: "queued" | "sending" | "sent" | "delivered" | "read" | "failed" | "cancelled" | "suppressed";
      moment_category: "personal" | "work" | "religious" | "company" | "custom";
      moment_date_source: "employee_date_field" | "employee_event" | "observance_calendar" | "manual" | "recurring_monthly";
      moment_status: "detected" | "scheduled" | "needs_info" | "awaiting_approval" | "approved" | "rejected" | "fulfilling" | "delivered" | "announced" | "completed" | "skipped" | "cancelled" | "failed";
      observance_key: "ramadan_start" | "ramadan_end" | "eid_ul_fitr" | "eid_ul_adha" | "ashura" | "eid_milad_un_nabi";
      observance_status: "predicted" | "confirmed" | "cancelled";
      order_status: "draft" | "pending_selection" | "awaiting_approval" | "approved" | "queued_for_ops" | "placed_with_vendor" | "in_transit" | "delivered" | "failed" | "cancelled" | "returned";
      org_role: "owner" | "admin" | "hr_manager" | "finance" | "manager" | "viewer";
      org_status: "trial" | "active" | "past_due" | "suspended" | "churned";
      payment_method: "bank_transfer" | "ibft" | "cheque" | "cash" | "card" | "wallet" | "adjustment" | "write_off";
      payment_status: "reported" | "under_review" | "verified" | "rejected" | "refunded";
      product_category: "cake" | "flowers" | "chocolate" | "hamper" | "voucher" | "electronics" | "apparel" | "book" | "toy" | "plant" | "card" | "custom";
      proof_kind: "photo" | "signature" | "otp" | "courier_ref" | "recipient_reply";
      response_channel: "link" | "dashboard" | "slack_action" | "whatsapp_reply" | "email_reply" | "auto" | "api";
      staff_role: "platform_admin" | "ops" | "support" | "finance";
      subscription_status: "trialing" | "active" | "past_due" | "paused" | "cancelled";
      task_lane: "announce" | "default" | "slow";
      task_status: "pending" | "running" | "succeeded" | "failed" | "cancelled" | "skipped" | "dead";
      task_type: "verify_details_send" | "verify_details_remind" | "verify_details_finalize" | "select_gift" | "request_approval" | "approval_remind" | "approval_auto_decide" | "place_order" | "order_chase" | "order_fallback" | "prepare_announcement" | "announce" | "deliver_message" | "nudge_manager" | "confirm_delivery" | "collect_feedback" | "close_moment" | "reschedule_anchor" | "sync_slack_users" | "sync_whatsapp_templates" | "data_hygiene_digest" | "billing_usage_rollup" | "billing_generate_invoice" | "billing_send_invoice" | "billing_payment_reminder" | "wallet_low_balance_alert" | "integration_health_check";
      token_purpose: "address_verification" | "approval" | "invitation" | "employee_optout" | "magic_view" | "feedback";
      wallet_direction: "credit" | "debit";
      wallet_reason: "topup" | "gift_charge" | "delivery_fee" | "subscription_charge" | "refund" | "adjustment" | "reversal";
    };
  };
}

// Convenience aliases for the tables the app touches most.
type T = Database["moments"]["Tables"];
export type ActionTokensRow = T["action_tokens"]["Row"];
export type AddressesRow = T["addresses"]["Row"];
export type AlertsRow = T["alerts"]["Row"];
export type ApprovalRequestsRow = T["approval_requests"]["Row"];
export type AuditLogRow = T["audit_log"]["Row"];
export type CitiesRow = T["cities"]["Row"];
export type DeadLettersRow = T["dead_letters"]["Row"];
export type DeliveryProofsRow = T["delivery_proofs"]["Row"];
export type EmployeeEventsRow = T["employee_events"]["Row"];
export type EmployeeImportBatchesRow = T["employee_import_batches"]["Row"];
export type EmployeeImportRowsRow = T["employee_import_rows"]["Row"];
export type EmployeesRow = T["employees"]["Row"];
export type FeatureFlagsRow = T["feature_flags"]["Row"];
export type GiftBundleItemsRow = T["gift_bundle_items"]["Row"];
export type GiftBundlesRow = T["gift_bundles"]["Row"];
export type GiftOrderItemsRow = T["gift_order_items"]["Row"];
export type GiftOrderStatusHistoryRow = T["gift_order_status_history"]["Row"];
export type GiftOrdersRow = T["gift_orders"]["Row"];
export type GiftProductsRow = T["gift_products"]["Row"];
export type InvitationsRow = T["invitations"]["Row"];
export type InvoiceLinesRow = T["invoice_lines"]["Row"];
export type InvoicesRow = T["invoices"]["Row"];
export type JobRunsRow = T["job_runs"]["Row"];
export type MessageTemplatesRow = T["message_templates"]["Row"];
export type MilestoneTiersRow = T["milestone_tiers"]["Row"];
export type MomentEventsRow = T["moment_events"]["Row"];
export type MomentPoliciesRow = T["moment_policies"]["Row"];
export type MomentTasksRow = T["moment_tasks"]["Row"];
export type MomentTypesRow = T["moment_types"]["Row"];
export type ObservanceDatesRow = T["observance_dates"]["Row"];
export type OfficesRow = T["offices"]["Row"];
export type OrgIntegrationsRow = T["org_integrations"]["Row"];
export type OrgMembersRow = T["org_members"]["Row"];
export type OrganizationsRow = T["organizations"]["Row"];
export type OutboundMessageEventsRow = T["outbound_message_events"]["Row"];
export type OutboundMessagesRow = T["outbound_messages"]["Row"];
export type PaymentsRow = T["payments"]["Row"];
export type PlansRow = T["plans"]["Row"];
export type ProfilesRow = T["profiles"]["Row"];
export type RateLimitBucketsRow = T["rate_limit_buckets"]["Row"];
export type StaffUsersRow = T["staff_users"]["Row"];
export type SubscriptionsRow = T["subscriptions"]["Row"];
export type SuppressionsRow = T["suppressions"]["Row"];
export type TaskAttemptsRow = T["task_attempts"]["Row"];
export type TokenEventsRow = T["token_events"]["Row"];
export type VendorCityCoverageRow = T["vendor_city_coverage"]["Row"];
export type VendorsRow = T["vendors"]["Row"];
export type WalletAccountsRow = T["wallet_accounts"]["Row"];
export type WalletLedgerRow = T["wallet_ledger"]["Row"];
export type WhatsappSessionsRow = T["whatsapp_sessions"]["Row"];
export type WhatsappTemplatesRow = T["whatsapp_templates"]["Row"];
export type MomentsEnums = Database["moments"]["Enums"];
