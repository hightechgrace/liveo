import { SessionEntityBuilder } from "@live/test-utilities";
import { Container, interfaces } from "inversify";
import createMockInstance from "jest-create-mock-instance";
import "reflect-metadata";
import { DataService } from "../data/data-service";
import { Logger } from "../logging/logger";
import { NotificationService } from "../notifications/notification-service";
import { Stream } from "../streams/stream";
import { StreamService } from "../streams/stream-service";
import { Session } from "./session";
import { SessionFactory } from "./session-factory";
import { SessionService } from "./session-service";

describe("SessionService", () => {
  let sessionService: SessionService;
  let logger: jest.Mocked<Logger>;
  let sessionRepository: jest.Mocked<DataService>;
  let streamService: jest.Mocked<StreamService>;
  let notificationService: jest.Mocked<NotificationService>;

  const firstSessionId = "bcf4";
  const secondSessionId = "43kv";

  const firstStreamId = "vfg3";
  const secondStreamId = "2gus";

  const sessions = [
    new SessionEntityBuilder().withId(firstSessionId).withStreams([firstStreamId]).build(),
    new SessionEntityBuilder().withId(secondSessionId).withStreams([secondStreamId]).build()
  ];

  beforeEach(() => {
    const container = new Container();

    logger = createMockInstance(Logger);
    sessionRepository = createMockInstance(DataService);
    sessionRepository.loadSessionEntities.mockReturnValue(sessions);
    streamService = createMockInstance(StreamService);
    notificationService = createMockInstance(NotificationService);

    container.bind<Logger>("Logger").toConstantValue(logger);
    container.bind<DataService>("ISessionRepository").toConstantValue(sessionRepository);
    container.bind<StreamService>("StreamService").toConstantValue(streamService);
    container.bind<interfaces.Factory<Session>>("SessionFactory").toFactory(SessionFactory);
    container.bind<SessionService>("SessionService").to(SessionService).inSingletonScope();
    container.bind<NotificationService>("NotificationService").toConstantValue(notificationService);

    sessionService = container.get<SessionService>("SessionService");
  });

  it("should construct", async () => {
    expect(sessionService).toBeDefined();
  });

  it("should have loaded sessions when load session is called", () => {
    sessionService.loadSessions();
    expect(sessionRepository.loadSessionEntities).toBeCalled();
    expect(sessionService.sessionEntities.length).toBe(2);
  });

  it("should have called logger warn if no streams are available", () => {
    sessionService.loadSessions();
    expect(sessionService.sessionEntities.length).toBe(2);
    expect(logger.warn).toHaveBeenCalled();
  });

  it("should have loaded the streams of the sessions correctly when streams are available", () => {
    const stream = createMockInstance(Stream);
    sessionService.loadSessions();
    const streams = [stream];

    // ToDo
    // jest.spyOn(streamService, "streams", "get").mockReturnValue(streams);
    // streamService.streams.mockReturnValue(null);

    expect(sessionService.sessionEntities.length).toBe(2);
  });

  it("should return correct session on get session when session is available", () => {
    sessionService.loadSessions();
    expect(sessionService.sessionEntities.length).toBe(2);
    expect(logger.warn).toHaveBeenCalled();
    const sessionEntity = sessionService.getSessionEntity("43kv");
    expect(sessionEntity).toBe(sessions[1]);
  });

  it("should throw on get session when session is not available", () => {
    sessionService.loadSessions();
    expect(sessionService.getSessionEntity.bind(null, "83kv")).toThrowError();
  });

  it("should validate session existence correctly", () => {
    sessionService.loadSessions();
    expect(() => sessionService.validateSessionExists("83kv")).toThrowError();
    sessionService.validateSessionExists("bcf4");
  });
});