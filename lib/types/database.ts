export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "supervisor" | "client" | "staff";
export type InspectionStatus = "in_progress" | "completed" | "expired";
export type ResponseResult = "pass" | "fail";
export type DeficiencyStatus = "open" | "in_progress" | "closed";
export type TaskStatus = "open" | "in_progress" | "closed";
export type TaskPriority = "critical" | "high" | "medium" | "low";
export type TaskSource = "auto" | "manual";
export type NotificationType =
  | "task_assigned"
  | "sla_warning"
  | "overdue"
  | "deficiency_created"
  | "inspection_completed"
  | "report_sent"
  | "invitation"
  | "inspection_scheduled";
export type ReportTriggerType = "scheduled" | "on_completion";
export type ReportType = "summary" | "detailed";
export type AuditAction = "INSERT" | "UPDATE" | "DELETE";
export type ScheduleFrequency = "daily" | "weekly" | "biweekly" | "monthly";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          contact_email: string | null;
          logo_url: string | null;
          brand_color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          contact_email?: string | null;
          logo_url?: string | null;
          brand_color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          contact_email?: string | null;
          logo_url?: string | null;
          brand_color?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      buildings: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          street: string | null;
          city: string | null;
          state: string | null;
          zip: string | null;
          sqft: number | null;
          archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          street?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          sqft?: number | null;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          street?: string | null;
          city?: string | null;
          state?: string | null;
          zip?: string | null;
          sqft?: number | null;
          archived?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      floors: {
        Row: {
          id: string;
          building_id: string;
          name: string;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          building_id: string;
          name: string;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          building_id?: string;
          name?: string;
          display_order?: number;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          org_id: string;
          client_org_id: string | null;
          email: string;
          name: string;
          phone: string | null;
          role: UserRole;
          active: boolean;
          notification_prefs: Json;
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          org_id: string;
          client_org_id?: string | null;
          email: string;
          name: string;
          phone?: string | null;
          role?: UserRole;
          active?: boolean;
          notification_prefs?: Json;
          last_login?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          client_org_id?: string | null;
          email?: string;
          name?: string;
          phone?: string | null;
          role?: UserRole;
          active?: boolean;
          notification_prefs?: Json;
          last_login?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      building_assignments: {
        Row: {
          id: string;
          user_id: string;
          building_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          building_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          building_id?: string;
        };
        Relationships: [];
      };
      client_orgs: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          contact_email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          contact_email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          contact_email?: string | null;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          id: string;
          org_id: string;
          email: string;
          role: UserRole;
          token: string;
          accepted: boolean;
          expires_at: string;
          invited_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          email: string;
          role?: UserRole;
          token: string;
          accepted?: boolean;
          expires_at?: string;
          invited_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          email?: string;
          role?: UserRole;
          token?: string;
          accepted?: boolean;
          expires_at?: string;
          invited_by?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          message: string;
          link: string | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          message: string;
          link?: string | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: NotificationType;
          message?: string;
          link?: string | null;
          read?: boolean;
        };
        Relationships: [];
      };
      checklist_templates: {
        Row: {
          id: string;
          org_id: string | null;
          name: string;
          version: number;
          is_canned: boolean;
          archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          name: string;
          version?: number;
          is_canned?: boolean;
          archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          name?: string;
          version?: number;
          is_canned?: boolean;
          archived?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      checklist_items: {
        Row: {
          id: string;
          template_id: string;
          description: string;
          category: string | null;
          photo_required: boolean;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          description: string;
          category?: string | null;
          photo_required?: boolean;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          template_id?: string;
          description?: string;
          category?: string | null;
          photo_required?: boolean;
          display_order?: number;
        };
        Relationships: [];
      };
      spaces: {
        Row: {
          id: string;
          floor_id: string;
          checklist_template_id: string | null;
          space_type_id: string | null;
          name: string;
          sqft: number | null;
          description: string | null;
          pin_x: number | null;
          pin_y: number | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          floor_id: string;
          checklist_template_id?: string | null;
          space_type_id?: string | null;
          name: string;
          sqft?: number | null;
          description?: string | null;
          pin_x?: number | null;
          pin_y?: number | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          floor_id?: string;
          checklist_template_id?: string | null;
          space_type_id?: string | null;
          name?: string;
          sqft?: number | null;
          description?: string | null;
          pin_x?: number | null;
          pin_y?: number | null;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      space_types: {
        Row: {
          id: string;
          org_id: string | null;
          name: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          name: string;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          name?: string;
          is_default?: boolean;
        };
        Relationships: [];
      };
      inspections: {
        Row: {
          id: string;
          space_id: string;
          inspector_id: string;
          template_version: number;
          status: InspectionStatus;
          started_at: string;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          space_id: string;
          inspector_id: string;
          template_version: number;
          status?: InspectionStatus;
          started_at?: string;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          space_id?: string;
          inspector_id?: string;
          template_version?: number;
          status?: InspectionStatus;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      inspection_responses: {
        Row: {
          id: string;
          inspection_id: string;
          checklist_item_id: string;
          result: ResponseResult | null;
          comment: string | null;
          responded_at: string;
        };
        Insert: {
          id?: string;
          inspection_id: string;
          checklist_item_id: string;
          result?: ResponseResult | null;
          comment?: string | null;
          responded_at?: string;
        };
        Update: {
          id?: string;
          inspection_id?: string;
          checklist_item_id?: string;
          result?: ResponseResult | null;
          comment?: string | null;
        };
        Relationships: [];
      };
      response_photos: {
        Row: {
          id: string;
          response_id: string;
          photo_url: string;
          display_order: number;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          response_id: string;
          photo_url: string;
          display_order?: number;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          response_id?: string;
          photo_url?: string;
          display_order?: number;
        };
        Relationships: [];
      };
      deficiencies: {
        Row: {
          id: string;
          space_id: string;
          inspection_id: string;
          response_id: string;
          deficiency_number: string;
          status: DeficiencyStatus;
          resolution_comment: string | null;
          resolution_photo_url: string | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          space_id: string;
          inspection_id: string;
          response_id: string;
          deficiency_number: string;
          status?: DeficiencyStatus;
          resolution_comment?: string | null;
          resolution_photo_url?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          status?: DeficiencyStatus;
          resolution_comment?: string | null;
          resolution_photo_url?: string | null;
          resolved_at?: string | null;
        };
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          deficiency_id: string | null;
          space_id: string;
          assigned_to: string | null;
          created_by: string;
          description: string;
          priority: TaskPriority;
          status: TaskStatus;
          source: TaskSource;
          due_date: string | null;
          resolution_comment: string | null;
          resolution_photo_url: string | null;
          created_at: string;
          resolved_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          deficiency_id?: string | null;
          space_id: string;
          assigned_to?: string | null;
          created_by: string;
          description: string;
          priority?: TaskPriority;
          status?: TaskStatus;
          source?: TaskSource;
          due_date?: string | null;
          resolution_comment?: string | null;
          resolution_photo_url?: string | null;
          created_at?: string;
          resolved_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          assigned_to?: string | null;
          description?: string;
          priority?: TaskPriority;
          status?: TaskStatus;
          due_date?: string | null;
          resolution_comment?: string | null;
          resolution_photo_url?: string | null;
          resolved_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      floor_plans: {
        Row: {
          id: string;
          floor_id: string;
          original_pdf_url: string;
          rendered_image_url: string | null;
          image_width: number | null;
          image_height: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          floor_id: string;
          original_pdf_url: string;
          rendered_image_url?: string | null;
          image_width?: number | null;
          image_height?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          floor_id?: string;
          original_pdf_url?: string;
          rendered_image_url?: string | null;
          image_width?: number | null;
          image_height?: number | null;
        };
        Relationships: [];
      };
      qr_codes: {
        Row: {
          id: string;
          space_id: string;
          encoded_url: string;
          svg_url: string | null;
          png_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          space_id: string;
          encoded_url: string;
          svg_url?: string | null;
          png_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          space_id?: string;
          encoded_url?: string;
          svg_url?: string | null;
          png_url?: string | null;
        };
        Relationships: [];
      };
      client_building_links: {
        Row: {
          id: string;
          client_org_id: string;
          building_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_org_id: string;
          building_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_org_id?: string;
          building_id?: string;
        };
        Relationships: [];
      };
      report_configs: {
        Row: {
          id: string;
          building_id: string;
          trigger_type: ReportTriggerType;
          schedule_cron: string | null;
          recipient_emails: Json;
          report_type: ReportType;
          enabled: boolean;
          last_sent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          building_id: string;
          trigger_type: ReportTriggerType;
          schedule_cron?: string | null;
          recipient_emails?: Json;
          report_type?: ReportType;
          enabled?: boolean;
          last_sent_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          building_id?: string;
          trigger_type?: ReportTriggerType;
          schedule_cron?: string | null;
          recipient_emails?: Json;
          report_type?: ReportType;
          enabled?: boolean;
          last_sent_at?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          org_id: string | null;
          table_name: string;
          record_id: string;
          action: AuditAction;
          user_id: string | null;
          old_values: Json | null;
          new_values: Json | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id?: string | null;
          table_name: string;
          record_id: string;
          action: AuditAction;
          user_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          table_name?: string;
          record_id?: string;
          action?: AuditAction;
          user_id?: string | null;
          old_values?: Json | null;
          new_values?: Json | null;
          metadata?: Json;
        };
        Relationships: [];
      };
      shared_dashboards: {
        Row: {
          id: string;
          building_id: string;
          token: string;
          created_by: string;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          building_id: string;
          token: string;
          created_by: string;
          expires_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          building_id?: string;
          token?: string;
          created_by?: string;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      inspection_schedules: {
        Row: {
          id: string;
          org_id: string;
          building_id: string;
          checklist_template_id: string | null;
          frequency: ScheduleFrequency;
          day_of_week: number | null;
          day_of_month: number | null;
          time_of_day: string;
          assigned_to: string | null;
          enabled: boolean;
          last_triggered_at: string | null;
          next_due_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          building_id: string;
          checklist_template_id?: string | null;
          frequency?: ScheduleFrequency;
          day_of_week?: number | null;
          day_of_month?: number | null;
          time_of_day?: string;
          assigned_to?: string | null;
          enabled?: boolean;
          last_triggered_at?: string | null;
          next_due_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          building_id?: string;
          checklist_template_id?: string | null;
          frequency?: ScheduleFrequency;
          day_of_week?: number | null;
          day_of_month?: number | null;
          time_of_day?: string;
          assigned_to?: string | null;
          enabled?: boolean;
          last_triggered_at?: string | null;
          next_due_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      inspection_status: InspectionStatus;
      response_result: ResponseResult;
      deficiency_status: DeficiencyStatus;
      task_status: TaskStatus;
      task_priority: TaskPriority;
      task_source: TaskSource;
      notification_type: NotificationType;
      report_trigger_type: ReportTriggerType;
      report_type: ReportType;
      audit_action: AuditAction;
      schedule_frequency: ScheduleFrequency;
    };
  };
}
