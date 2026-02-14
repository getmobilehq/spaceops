import { describe, it, expect } from "vitest";
import {
  loginSchema,
  signupSchema,
  createBuildingSchema,
  inviteUserSchema,
  createTaskSchema,
} from "@/lib/validators/schemas";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({
      email: "admin@test.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = loginSchema.safeParse({
      email: "admin@test.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });
});

describe("signupSchema", () => {
  it("accepts valid signup", () => {
    const result = signupSchema.safeParse({
      name: "John Doe",
      email: "john@test.com",
      password: "password123",
      confirmPassword: "password123",
      token: "some-token",
    });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = signupSchema.safeParse({
      name: "John Doe",
      email: "john@test.com",
      password: "password123",
      confirmPassword: "different456",
      token: "some-token",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short name", () => {
    const result = signupSchema.safeParse({
      name: "J",
      email: "john@test.com",
      password: "password123",
      confirmPassword: "password123",
      token: "some-token",
    });
    expect(result.success).toBe(false);
  });
});

describe("createBuildingSchema", () => {
  it("accepts valid building with required fields only", () => {
    const result = createBuildingSchema.safeParse({
      name: "Horizon Tower",
    });
    expect(result.success).toBe(true);
  });

  it("accepts building with all optional fields", () => {
    const result = createBuildingSchema.safeParse({
      name: "Horizon Tower",
      street: "123 Main St",
      city: "New York",
      state: "NY",
      zip: "10001",
      sqft: 50000,
    });
    expect(result.success).toBe(true);
  });

  it("rejects short building name", () => {
    const result = createBuildingSchema.safeParse({ name: "A" });
    expect(result.success).toBe(false);
  });
});

describe("inviteUserSchema", () => {
  it("accepts valid invitation", () => {
    const result = inviteUserSchema.safeParse({
      email: "invite@test.com",
      role: "supervisor",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid role", () => {
    const result = inviteUserSchema.safeParse({
      email: "invite@test.com",
      role: "superadmin",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = inviteUserSchema.safeParse({
      email: "not-email",
      role: "admin",
    });
    expect(result.success).toBe(false);
  });
});

describe("createTaskSchema", () => {
  it("accepts valid task", () => {
    const result = createTaskSchema.safeParse({
      space_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      description: "Fix the broken light",
      priority: "high",
    });
    expect(result.success).toBe(true);
  });

  it("defaults priority to medium", () => {
    const result = createTaskSchema.safeParse({
      space_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      description: "Fix the broken light",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe("medium");
    }
  });

  it("rejects invalid space_id", () => {
    const result = createTaskSchema.safeParse({
      space_id: "not-a-uuid",
      description: "Fix the broken light",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short description", () => {
    const result = createTaskSchema.safeParse({
      space_id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      description: "F",
    });
    expect(result.success).toBe(false);
  });
});
