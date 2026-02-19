import { describe, it, expect } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { size, contentType } from "@/app/icon";

describe("robots", () => {
  it("disallows /api/ and /admin/ and /inspect/", () => {
    const config = robots();
    const rules = config.rules;
    const disallow = Array.isArray(rules) ? rules[0].disallow : rules.disallow;
    expect(disallow).toContain("/api/");
    expect(disallow).toContain("/admin/");
    expect(disallow).toContain("/inspect/");
  });

  it("includes sitemap URL", () => {
    const config = robots();
    expect(config.sitemap).toContain("/sitemap.xml");
  });
});

describe("sitemap", () => {
  it("returns / and /login entries", () => {
    const entries = sitemap();
    const urls = entries.map((e) => new URL(e.url).pathname);
    expect(urls).toContain("/");
    expect(urls).toContain("/login");
  });

  it("does not include authenticated routes", () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    for (const url of urls) {
      expect(url).not.toContain("/admin");
      expect(url).not.toContain("/tasks");
      expect(url).not.toContain("/inspect");
    }
  });
});

describe("icon", () => {
  it("exports correct size and content type", () => {
    expect(size).toEqual({ width: 32, height: 32 });
    expect(contentType).toBe("image/png");
  });
});
