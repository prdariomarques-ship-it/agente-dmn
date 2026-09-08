import { ModelProvider, ModelRequest, ModelResponse } from "./types.js";

// A mock provider to be used in testing the TS Core before wiring real external APIs like Ollama/Claude.
export class MockModelProvider implements ModelProvider {
  public name = "mock-llm";

  supportsCapabilities(caps: string[]): boolean {
    // Mock supports everything except "vision"
    return !caps.includes("vision");
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const promptLen = request.context.fullPrompt.length;

    // Simulate generation time based on context size
    await new Promise(r => setTimeout(r, 10));

    let responseText = "Simulated response based on context.";
    if (request.context.fullPrompt.includes("FAIL")) {
      throw new Error("Simulated LLM Error");
    }

    // A simple heuristic for mock tests
    if (request.context.taskObjective.includes("DONE")) {
       responseText = "DONE: Task complete";
    }

    const completionTokens = Math.ceil(responseText.length / 4);

    return {
      text: responseText,
      finishReason: "stop",
      usage: {
        promptTokens: request.context.totalTokens,
        completionTokens: completionTokens,
        totalTokens: request.context.totalTokens + completionTokens
      }
    };
  }
}
