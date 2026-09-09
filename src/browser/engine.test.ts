import { describe, expect, it, beforeEach } from "vitest";
import { SafeBrowserEngine, MockBrowserProvider } from "./engine.js";

describe("SafeBrowserEngine", () => {
  let browser: SafeBrowserEngine;

  beforeEach(() => {
    browser = new SafeBrowserEngine(new MockBrowserProvider());
  });

  it("should navigate safely to public domains", async () => {
    const res = await browser.execute("navigate", { url: "https://example.com" }, "t1");
    expect(res).toBe("Navigated to https://example.com");
  });

  it("should block navigation to internal domains", async () => {
    await expect(browser.execute("navigate", { url: "http://127.0.0.1/admin" }, "t1"))
      .rejects.toThrow("SECURITY_VIOLATION: Navigation to internal or blocked domain");

    await expect(browser.execute("navigate", { url: "http://169.254.169.254/latest/meta-data/" }, "t1"))
      .rejects.toThrow("SECURITY_VIOLATION: Navigation to internal or blocked domain");
  });

  it("should perform other actions", async () => {
    const res = await browser.execute("extractContent", { selector: "h1" }, "t1");
    expect(res).toBe("Content for h1");
  });
});
