import { createMockInstance } from "jest-create-mock-instance";
import "reflect-metadata";
import { Logger } from "../../../core/services/logging/logger";
import { IdGenerator } from "../id-generation/id-generator";
import { Scheduler } from "./scheduler";

describe("Scheduler", () => {
  let scheduler: Scheduler;
  let logger: jest.Mocked<Logger>;
  let idGenerator: jest.Mocked<IdGenerator>;

  beforeEach(() => {
    logger = createMockInstance(Logger);
    idGenerator = createMockInstance(IdGenerator);

    scheduler = new Scheduler(logger, idGenerator);
  });

  it("should construct", async () => {
    expect(scheduler).toBeDefined();
  });
});
