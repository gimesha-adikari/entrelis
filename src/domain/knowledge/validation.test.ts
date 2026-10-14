import { describe, expect, it } from "vitest";
import { isSafeUrl } from "./validation";

describe("SEC-02 Bibliographic URL Scheme Validation", () => {
  it("permits standard secure HTTP and HTTPS protocols", () => {
    expect(isSafeUrl("https://doc.rust-lang.org/book/")).toBe(true);
    expect(isSafeUrl("http://example.com/spec")).toBe(true);
    expect(isSafeUrl("HTTPS://WIKIPEDIA.ORG/WIKI/RUST")).toBe(true);
    expect(isSafeUrl("   https://arxiv.org/abs/1234.5678   ")).toBe(true);
  });

  it("strictly rejects executable javascript: schemes", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeUrl("javascript:void(0)")).toBe(false);
    expect(isSafeUrl("JAVASCRIPT:console.log('xss')")).toBe(false);
    expect(isSafeUrl(" javascript:evil()")).toBe(false);
  });

  it("strictly rejects inline data: and vbscript: URIs", () => {
    expect(isSafeUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeUrl("data:application/json;base64,ey...==")).toBe(false);
    expect(isSafeUrl("vbscript:MsgBox(1)")).toBe(false);
  });

  it("strictly rejects relative schemes, file: schemes, and malformed inputs", () => {
    expect(isSafeUrl("file:///etc/passwd")).toBe(false);
    expect(isSafeUrl("/relative/path")).toBe(false);
    expect(isSafeUrl("//schemeless.org/path")).toBe(false);
    expect(isSafeUrl("")).toBe(false);
    expect(isSafeUrl("   ")).toBe(false);
    expect(isSafeUrl(null)).toBe(false);
    expect(isSafeUrl(undefined)).toBe(false);
    expect(isSafeUrl(12345)).toBe(false);
    expect(isSafeUrl({})).toBe(false);
  });
});
