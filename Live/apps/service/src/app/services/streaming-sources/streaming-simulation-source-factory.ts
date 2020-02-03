import { interfaces } from "inversify";
import { WebsocketServer } from "../../core/websocket-server";
import { DeviceDetector } from "../devices/device-detector";
import { Logger } from "../logging/logger";
import { StreamingSimulationSource } from "./streaming-simulation-source";

export const StreamingSimulationSourceFactory = (context: interfaces.Context) =>
  (deviceId: string, streamId: string) => {
    const logger = context.container.get<Logger>("Logger");
    const websocketServer = context.container.get<WebsocketServer>("WebsocketServer");
    const deviceDetector = context.container.get<DeviceDetector>("DeviceDetector");

    return new StreamingSimulationSource(logger, websocketServer, deviceId, streamId);
  };
