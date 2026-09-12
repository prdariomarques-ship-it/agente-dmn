import { DARIUSPlugin, PluginHost } from "../host.js";

export class FinancePlugin implements DARIUSPlugin {
    id = "darius-finance";
    version = "1.0.0";

    onRegister(host: PluginHost): void {
        host.registerTool({
            name: "get_stock_price",
            description: "Fetches current stock price",
            schema: { symbol: "string" },
            risk: "LOW",
            execute: async (params) => {
                // Mock provider
                if (params.symbol === "AAPL") return "150.00";
                return "100.00";
            }
        });

        host.registerSkill({
            id: "finance_research",
            name: "Market Research",
            description: "Researches market trends",
            version: "1.0", execute: async () => "OK"
        });

        // Register custom verify logic for Finance
        // e.g. host.engine.verificationEngine.registerCustomVerifier(...)
    }
}
