/**
 * Factory functions for generating test fixtures.
 * Each function returns valid defaults and accepts Partial<T> overrides.
 */

let counter = 0;
function uuid(): string {
  counter++;
  return `00000000-0000-0000-0000-${String(counter).padStart(12, "0")}`;
}

function timestamp(): string {
  return new Date().toISOString();
}

export function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    org_id: uuid(),
    email: `user${counter}@test.com`,
    name: `Test User ${counter}`,
    role: "supervisor" as const,
    phone: null,
    active: true,
    notification_prefs: { sms: true, in_app: true, email: true },
    created_at: timestamp(),
    updated_at: timestamp(),
    ...overrides,
  };
}

export function makeBuilding(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    org_id: uuid(),
    name: `Building ${counter}`,
    street: "123 Main St",
    city: "New York",
    state: "NY",
    zip: "10001",
    sqft: 50000,
    archived: false,
    created_at: timestamp(),
    updated_at: timestamp(),
    ...overrides,
  };
}

export function makeSpace(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    building_id: uuid(),
    floor_id: uuid(),
    name: `Room ${counter}`,
    space_type_id: uuid(),
    checklist_template_id: null,
    pin_x: null,
    pin_y: null,
    deleted_at: null,
    created_at: timestamp(),
    updated_at: timestamp(),
    ...overrides,
  };
}

export function makeInspection(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    space_id: uuid(),
    user_id: uuid(),
    checklist_template_id: uuid(),
    template_version: 1,
    status: "completed" as const,
    started_at: timestamp(),
    completed_at: timestamp(),
    created_at: timestamp(),
    ...overrides,
  };
}

export function makeDeficiency(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    org_id: uuid(),
    space_id: uuid(),
    inspection_id: uuid(),
    inspection_response_id: uuid(),
    deficiency_number: `DEF-${String(counter).padStart(4, "0")}`,
    description: `Test deficiency ${counter}`,
    status: "open" as const,
    resolved_at: null,
    created_at: timestamp(),
    updated_at: timestamp(),
    ...overrides,
  };
}

export function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    org_id: uuid(),
    space_id: uuid(),
    deficiency_id: null,
    assigned_to: null,
    created_by: uuid(),
    description: `Test task ${counter}`,
    priority: "medium" as const,
    status: "open" as const,
    source: "manual" as const,
    due_date: null,
    resolution_comment: null,
    resolution_photo_url: null,
    recurrence_count: 0,
    created_at: timestamp(),
    updated_at: timestamp(),
    ...overrides,
  };
}

export function makeSchedule(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    org_id: uuid(),
    building_id: uuid(),
    checklist_template_id: null,
    frequency: "daily" as const,
    day_of_week: null,
    day_of_month: null,
    time_of_day: "09:00",
    assigned_to: null,
    enabled: true,
    last_triggered_at: null,
    next_due_at: timestamp(),
    created_at: timestamp(),
    updated_at: timestamp(),
    ...overrides,
  };
}

export function makeChecklistItem(overrides: Record<string, unknown> = {}) {
  return {
    id: uuid(),
    template_id: uuid(),
    description: `Check item ${counter}`,
    category: "General",
    sort_order: counter,
    photo_required_on_fail: false,
    created_at: timestamp(),
    ...overrides,
  };
}
