import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { seedMockData } from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "テストユーザー",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("recordings router", () => {
  beforeAll(async () => {
    // Seed mock data before tests
    try {
      await seedMockData();
    } catch (e) {
      // Data may already exist
    }
  });

  it("should list recordings with pagination", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.recordings.list({
      pageSize: 10,
      sortBy: "recordedAt",
      sortOrder: "desc",
    });

    expect(result).toHaveProperty("data");
    expect(result).toHaveProperty("total");
    expect(result).toHaveProperty("page");
    expect(result).toHaveProperty("pageSize");
    expect(Array.isArray(result.data)).toBe(true);
  });

  it("should filter recordings by status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.recordings.list({
      filters: { status: "completed" },
      pageSize: 50,
    });

    expect(result).toHaveProperty("data");
    // All returned recordings should have status "completed"
    result.data.forEach((recording) => {
      expect(recording.status).toBe("completed");
    });
  });

  it("should filter recordings by meeting type", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.recordings.list({
      filters: { meetingType: "initial" },
      pageSize: 50,
    });

    expect(result).toHaveProperty("data");
    result.data.forEach((recording) => {
      expect(recording.meetingType).toBe("initial");
    });
  });

  it("should get recording by id with extraction and history", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First get the list to find a valid ID
    const listResult = await caller.recordings.list({ pageSize: 1 });
    
    if (listResult.data.length > 0) {
      const recordingId = listResult.data[0].id;
      const result = await caller.recordings.getById({ id: recordingId });

      expect(result).not.toBeNull();
      expect(result).toHaveProperty("recording");
      expect(result).toHaveProperty("extraction");
      expect(result).toHaveProperty("history");
      expect(result?.recording.id).toBe(recordingId);
    }
  });

  it("should return null for non-existent recording", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.recordings.getById({ id: 999999 });
    expect(result).toBeNull();
  });
});

describe("extractions router", () => {
  it("should get extraction result by recording id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First get a recording with extraction
    const listResult = await caller.recordings.list({
      filters: { status: "completed" },
      pageSize: 1,
    });

    if (listResult.data.length > 0) {
      const recordingId = listResult.data[0].id;
      const result = await caller.extractions.getByRecordingId({ recordingId });

      if (result) {
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("recordingId");
        expect(result).toHaveProperty("extractionData");
        expect(result).toHaveProperty("overallConfidence");
        expect(result.recordingId).toBe(recordingId);
      }
    }
  });
});

describe("history router", () => {
  it("should get change history by recording id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First get a recording
    const listResult = await caller.recordings.list({ pageSize: 1 });

    if (listResult.data.length > 0) {
      const recordingId = listResult.data[0].id;
      const result = await caller.history.getByRecordingId({ recordingId });

      expect(Array.isArray(result)).toBe(true);
      result.forEach((item) => {
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("recordingId");
        expect(item).toHaveProperty("editorId");
        expect(item).toHaveProperty("changeType");
        expect(item.recordingId).toBe(recordingId);
      });
    }
  });
});

describe("seed router", () => {
  it("should seed mock data without error", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This should not throw even if data already exists
    const result = await caller.seed.run();
    expect(result).toEqual({ success: true });
  });
});
