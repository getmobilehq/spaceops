import type { Database } from "./database";

// Helper types for table rows
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Convenience aliases
export type Organization = Tables<"organizations">;
export type Building = Tables<"buildings">;
export type Floor = Tables<"floors">;
export type UserProfile = Tables<"users">;
export type BuildingAssignment = Tables<"building_assignments">;
export type ClientOrg = Tables<"client_orgs">;
export type Invitation = Tables<"invitations">;
export type Notification = Tables<"notifications">;
export type ChecklistTemplate = Tables<"checklist_templates">;
export type ChecklistItem = Tables<"checklist_items">;
export type Space = Tables<"spaces">;
export type SpaceType = Tables<"space_types">;
export type Inspection = Tables<"inspections">;
export type InspectionResponse = Tables<"inspection_responses">;
export type ResponsePhoto = Tables<"response_photos">;
export type Deficiency = Tables<"deficiencies">;
export type Task = Tables<"tasks">;
export type QrCode = Tables<"qr_codes">;
export type FloorPlan = Tables<"floor_plans">;
export type ClientBuildingLink = Tables<"client_building_links">;
export type ReportConfig = Tables<"report_configs">;
export type SharedDashboard = Tables<"shared_dashboards">;
