import { TaskEngine } from "../core/engine.js";
import { Tool } from "../tools/types.js";
import { Skill } from "../skills/types.js";

export interface DARIUSPlugin {
    id: string;
    version: string;
    onRegister(host: PluginHost): void;
    onStart?(): Promise<void>;
    onStop?(): Promise<void>;
}

export class PluginHost {
    private plugins = new Map<string, DARIUSPlugin>();

    constructor(
        public readonly engine: TaskEngine,
        // Dependency Injection for core systems where plugins can register their assets
        public readonly registerTool: (tool: Tool) => void,
        public readonly registerSkill: (skill: Skill) => void
    ) {}

    registerPlugin(plugin: DARIUSPlugin) {
        if (this.plugins.has(plugin.id)) {
            throw new Error(`Plugin ${plugin.id} is already registered`);
        }
        plugin.onRegister(this);
        this.plugins.set(plugin.id, plugin);
    }

    async startAll() {
        for (const plugin of this.plugins.values()) {
            if (plugin.onStart) {
                await plugin.onStart();
            }
        }
    }
}
