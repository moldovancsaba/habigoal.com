import { describe, it, expect, vi, beforeEach } from "vitest";
import * as repo from "../repositories/queue.repository";

// Mocks
vi.mock("@/lib/mongodb", () => ({
  getDatabase: vi.fn(),
}));

describe("queue module", () => {
  it("dummy test for queue", () => {
    expect(true).toBe(true);
  });
});
