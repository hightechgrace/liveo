import "reflect-metadata";
import createMockInstance from "jest-create-mock-instance";
import { DataService } from "../data/data-service";
import { Logger } from "../logging/logger";
import { SessionService } from "../sessions/session-service";
import { StreamService } from "../streams/stream-service";
import { Stream } from "../streams/stream";
import { SessionEntity } from "@live/entities";
import { Container, interfaces } from "inversify";
import { Session } from "./session";
import { SessionFactory } from "./session-factory";

describe("SessionService", () => {
  let sessionService: SessionService;
  let logger: jest.Mocked<Logger>;
  let sessionRepository: jest.Mocked<DataService>;
  let streamService: jest.Mocked<StreamService>;

  const sessions = [
    new SessionEntity("bcf4", "Service", "", ["vfg3"]),
    new SessionEntity("43kv", "Service2", "", ["2gus"])
  ];

  beforeEach(() => {
    const container = new Container();

    logger = createMockInstance(Logger);
    sessionRepository = createMockInstance(DataService);
    sessionRepository.loadSessionEntities.mockReturnValue(sessions);
    streamService = createMockInstance(StreamService);

    container.bind<Logger>("Logger").toConstantValue(logger);
    container.bind<DataService>("ISessionRepository").toConstantValue(sessionRepository);
    container.bind<StreamService>("StreamService").toConstantValue(streamService);
    container.bind<interfaces.Factory<Session>>("SessionFactory").toFactory(SessionFactory);
    container.bind<SessionService>("SessionService").to(SessionService).inSingletonScope();

    sessionService = container.get<SessionService>("SessionService");
  });

  it("should construct", async () => {
    expect(sessionService).toBeDefined();
  });

  it("should have loaded sessions when load session is called", async () => {
    sessionService.loadSessions();
    expect(sessionRepository.loadSessionEntities).toBeCalled();
    expect(sessionService.sessionEntities.length).toBe(2);
  });

  it("should have called logger warn if no streams are available", async () => {
    sessionService.loadSessions();
    expect(sessionService.sessionEntities.length).toBe(2);
    expect(logger.warn).toHaveBeenCalled();
  });

  it("should have loaded the streams of the sessions correctly when streams are available", async () => {
    const stream = createMockInstance(Stream);
    sessionService.loadSessions();
    const streams = [stream];

    // ToDo
    // jest.spyOn(streamService, "streams", "get").mockReturnValue(streams);
    // streamService.streams.mockReturnValue(null);

    expect(sessionService.sessionEntities.length).toBe(2);
  });

  it("should return correct session on get session when session is available", async () => {
    sessionService.loadSessions();
    expect(sessionService.sessionEntities.length).toBe(2);
    expect(logger.warn).toHaveBeenCalled();
    const sessionEntity = sessionService.getSessionEntity("43kv");
    expect(sessionEntity).toBe(sessions[1]);
  });

  it("should throw on get session when session is not available", async () => {
    sessionService.loadSessions();
    expect(sessionService.getSessionEntity.bind(null, "83kv")).toThrowError();
  });
});
