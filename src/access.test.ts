import { describe, expect, it } from "vitest";
import { isAllowedChat } from "./access.js";

describe("isAllowedChat", () => {
  it("permite o chat configurado", () => {
    expect(isAllowedChat(883232211, "883232211")).toBe(true);
  });

  it("bloqueia outro chat", () => {
    expect(isAllowedChat(123, "883232211")).toBe(false);
  });

  it("permite qualquer chat quando não há restrição configurada", () => {
    expect(isAllowedChat(123, undefined)).toBe(true);
  });

  it("bloqueia quando o chatId é indefinido e há restrição configurada", () => {
    expect(isAllowedChat(undefined, "883232211")).toBe(false);
  });
});
