import { describe, it, expect } from "vitest";

// ✅ Smoke test — verifies vitest + tsconfig + alias setup are wired correctly.
// Add real component tests next to their components using the .test.tsx pattern.
describe("test setup", () => {
  it("runs a basic assertion", () => {
    expect(1 + 1).toBe(2);
  });

  it("has access to jest-dom matchers via @testing-library/jest-dom", () => {
    const div = document.createElement("div");
    div.textContent = "hello";
    document.body.appendChild(div);
    expect(div).toBeInTheDocument();
    expect(div).toHaveTextContent("hello");
  });
});
