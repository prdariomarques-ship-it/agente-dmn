import { describe, it, expect } from "vitest";
import { PluginHost } from "../host.js";
import { FinancePlugin } from "./index.js";

describe("Finance Vertical Plugin", () => {
    it("should register tools and skills without crashing", () => {
        let toolCount = 0;
        let skillCount = 0;
        const host = new PluginHost(
            {} as any,
            (t) => { toolCount++; },
            (s) => { skillCount++; }
        );

        const plugin = new FinancePlugin();
        host.registerPlugin(plugin);

        expect(toolCount).toBe(1);
        expect(skillCount).toBe(1);
    });
});
