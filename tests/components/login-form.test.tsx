import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/app/(auth)/login/login-form";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

// Need to mock the Suspense-wrapped useSearchParams
vi.mock("next/navigation", async () => {
  return {
    useRouter: () => ({
      push: vi.fn(),
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn(),
    }),
    usePathname: () => "/login",
    useSearchParams: () => new URLSearchParams(),
    redirect: vi.fn(),
    notFound: vi.fn(),
  };
});

describe("LoginForm", () => {
  const mockSignIn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue({ error: null });
    vi.mocked(createBrowserSupabaseClient).mockReturnValue({
      auth: {
        signInWithPassword: mockSignIn,
      },
    } as any);
  });

  it("renders email and password inputs", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders sign in button", () => {
    render(<LoginForm />);

    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders forgot password link", () => {
    render(<LoginForm />);

    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it("shows validation error for short password", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.type(screen.getByLabelText(/password/i), "short");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("calls signInWithPassword on valid submit", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "admin@test.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(mockSignIn).toHaveBeenCalledWith({
      email: "admin@test.com",
      password: "password123",
    });
  });

  it("shows error on auth failure", async () => {
    mockSignIn.mockResolvedValueOnce({
      error: { message: "Invalid credentials" },
    });

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), "wrong@test.com");
    await user.type(screen.getByLabelText(/password/i), "wrongpassword");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
  });
});
