import { BrowserEngine, BrowserCapabilities } from "./types.js";

// Mock provider for the MVP until Playwright/Puppeteer is attached
export class MockBrowserProvider implements BrowserCapabilities {
  async navigate(url: string): Promise<string> {
    return `Navigated to ${url}`;
  }
  async inspect(): Promise<string> {
    return `<html><body>Mock Page</body></html>`;
  }
  async extractContent(selector: string): Promise<string> {
    return `Content for ${selector}`;
  }
  async click(selector: string): Promise<void> {}
  async type(selector: string, text: string): Promise<void> {}
  async screenshot(): Promise<Buffer> {
    return Buffer.from("mock_screenshot");
  }
}

export class SafeBrowserEngine implements BrowserEngine {
  private blockedDomains = ["localhost", "127.0.0.1", "169.254.169.254"];

  constructor(private provider: BrowserCapabilities) {}

  async execute(action: string, params: any, taskId: string): Promise<any> {
    if (action === "navigate") {
       const url = new URL(params.url);
       if (this.blockedDomains.includes(url.hostname)) {
         throw new Error("SECURITY_VIOLATION: Navigation to internal or blocked domain");
       }
       return await this.provider.navigate(params.url);
    }

    switch (action) {
      case "inspect":
        return await this.provider.inspect();
      case "extractContent":
        return await this.provider.extractContent(params.selector);
      case "click":
        await this.provider.click(params.selector);
        return "Clicked";
      case "type":
        await this.provider.type(params.selector, params.text);
        return "Typed";
      case "screenshot":
        return await this.provider.screenshot();
      default:
        throw new Error(`Unknown browser action: ${action}`);
    }
  }
}
