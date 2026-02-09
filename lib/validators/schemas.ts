import { z } from "zod";

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signupSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    token: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const newPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// Organization schemas
export const createOrgSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(100),
  contact_email: z
    .string()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
  brand_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format")
    .optional(),
});

// Building schemas
export const createBuildingSchema = z.object({
  name: z
    .string()
    .min(2, "Building name must be at least 2 characters")
    .max(100),
  street: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  zip: z.string().optional().or(z.literal("")),
  sqft: z.coerce.number().int().positive().optional().or(z.literal("")),
});

// Floor schemas
export const createFloorSchema = z.object({
  name: z.string().min(1, "Floor name is required").max(50),
  display_order: z.coerce.number().int().min(0).optional(),
});

// Invitation schemas
export const inviteUserSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["admin", "supervisor", "client", "staff"], {
    message: "Please select a role",
  }),
});

// User management schemas
export const updateUserSchema = z.object({
  role: z.enum(["admin", "supervisor", "client", "staff"]).optional(),
  active: z.boolean().optional(),
  name: z.string().min(2).optional(),
  phone: z.string().optional().or(z.literal("")),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;
export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type CreateBuildingInput = z.infer<typeof createBuildingSchema>;
export type CreateFloorInput = z.infer<typeof createFloorSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// Space schemas
export const createSpaceSchema = z.object({
  name: z.string().min(1, "Space name is required").max(100),
  floor_id: z.string().uuid("Please select a floor"),
  space_type_id: z.string().uuid("Please select a space type").optional().or(z.literal("")),
});

export const bulkImportSpaceSchema = z.object({
  name: z.string().min(1),
  space_type: z.string().optional(),
});

// Checklist schemas
export const createChecklistTemplateSchema = z.object({
  name: z.string().min(2, "Template name must be at least 2 characters").max(100),
});

export const createChecklistItemSchema = z.object({
  description: z.string().min(2, "Description must be at least 2 characters").max(500),
  category: z.string().max(100).optional().or(z.literal("")),
  photo_required: z.boolean().optional(),
});

export const assignChecklistSchema = z.object({
  checklist_template_id: z.string().uuid("Please select a checklist template"),
});

// Space type schemas
export const createSpaceTypeSchema = z.object({
  name: z.string().min(1, "Space type name is required").max(50),
});

export type CreateSpaceInput = z.infer<typeof createSpaceSchema>;
export type CreateChecklistTemplateInput = z.infer<typeof createChecklistTemplateSchema>;
export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>;
export type AssignChecklistInput = z.infer<typeof assignChecklistSchema>;
export type CreateSpaceTypeInput = z.infer<typeof createSpaceTypeSchema>;

// Floor plan schemas
export const updatePinPositionSchema = z.object({
  space_id: z.string().uuid("Invalid space ID"),
  pin_x: z.number().min(0).max(100).nullable(),
  pin_y: z.number().min(0).max(100).nullable(),
});

// Deficiency filter schemas
export const deficiencyFilterSchema = z.object({
  status: z.enum(["all", "open", "in_progress", "closed"]).default("all"),
  building_id: z.string().uuid().optional(),
});

export type UpdatePinPositionInput = z.infer<typeof updatePinPositionSchema>;
export type DeficiencyFilterInput = z.infer<typeof deficiencyFilterSchema>;

// Client org schemas
export const createClientOrgSchema = z.object({
  name: z.string().min(2, "Client name must be at least 2 characters").max(100),
  contact_email: z
    .string()
    .email("Please enter a valid email")
    .optional()
    .or(z.literal("")),
});

export type CreateClientOrgInput = z.infer<typeof createClientOrgSchema>;

// Report schemas
export const generateReportSchema = z.object({
  building_id: z.string().uuid("Invalid building ID"),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  report_type: z.enum(["summary", "detailed"]).default("summary"),
});

export type GenerateReportInput = z.infer<typeof generateReportSchema>;

// Task schemas
export const createTaskSchema = z.object({
  space_id: z.string().uuid("Please select a space"),
  description: z
    .string()
    .min(2, "Description must be at least 2 characters")
    .max(1000),
  priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
  assigned_to: z.string().uuid().optional().or(z.literal("")),
  due_date: z.string().optional().or(z.literal("")),
});

export const updateTaskSchema = z.object({
  assigned_to: z.string().uuid().nullable().optional(),
  description: z.string().min(2).max(1000).optional(),
  priority: z.enum(["critical", "high", "medium", "low"]).optional(),
  status: z.enum(["open", "in_progress", "closed"]).optional(),
  due_date: z.string().nullable().optional(),
  resolution_comment: z.string().max(2000).optional().or(z.literal("")),
});

export const taskFilterSchema = z.object({
  status: z
    .enum(["all", "open", "in_progress", "closed"])
    .default("all"),
  priority: z
    .enum(["all", "critical", "high", "medium", "low"])
    .default("all"),
  building_id: z.string().uuid().optional(),
  assignee_id: z.string().uuid().optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskFilterInput = z.infer<typeof taskFilterSchema>;
