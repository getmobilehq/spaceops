import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// Mock @/lib/supabase/client
vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: vi.fn(),
}));

// Mock @/lib/supabase/server
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}));

// Mock @/lib/supabase/admin
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
});
