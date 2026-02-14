import { vi } from "vitest";

interface MockQueryResult {
  data: unknown;
  error: null | { message: string };
  count?: number;
}

/**
 * Creates a chainable mock Supabase client for testing.
 * Configure return values by setting the `_result` property before a query chain.
 *
 * @example
 * const mock = createMockSupabaseClient();
 * mock._result = { data: [{ id: "1", name: "Test" }], error: null };
 * const { data } = await mock.from("users").select("*");
 */
export function createMockSupabaseClient() {
  let result: MockQueryResult = { data: null, error: null };

  const chainable = () => {
    const chain: Record<string, unknown> = {};
    const methods = [
      "select",
      "insert",
      "update",
      "delete",
      "upsert",
      "eq",
      "neq",
      "gt",
      "gte",
      "lt",
      "lte",
      "in",
      "is",
      "like",
      "ilike",
      "contains",
      "order",
      "limit",
      "range",
      "single",
      "maybeSingle",
      "match",
      "not",
      "filter",
      "or",
      "textSearch",
    ];

    for (const method of methods) {
      chain[method] = vi.fn().mockImplementation(() => {
        // "single" and "maybeSingle" are terminal — return result as thenable
        if (method === "single" || method === "maybeSingle") {
          return Promise.resolve(result);
        }
        return chain;
      });
    }

    // Make the chain itself a thenable so `await supabase.from(...).select(...)` works
    chain.then = (resolve: (value: MockQueryResult) => void) =>
      Promise.resolve(result).then(resolve);

    return chain;
  };

  const client = {
    _result: result,

    from: vi.fn().mockImplementation(() => chainable()),

    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      admin: {
        createUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    },

    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: "test" }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: "https://example.com/signed" },
          error: null,
        }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },

    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),

    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    }),
  };

  // Allow setting result before query
  Object.defineProperty(client, "_result", {
    set(val: MockQueryResult) {
      result = val;
    },
    get() {
      return result;
    },
  });

  return client;
}
