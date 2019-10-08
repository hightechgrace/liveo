import { Container, interfaces } from "inversify";
import { Bootstrapper } from "../core/bootstrapper";
import { WebServer } from "../core/web-server";
import { WebsocketServer } from "../core/websocket-server";
import { AuthenticationMiddleware } from "../middleware/authentication/authentication.middleware";
import { ActivationService } from "../services/activation/activation-service";
import { AutoActivationService } from "../services/activation/auto-activation-service";
import { ApplicationStateService } from "../services/application-state/application-state.service";
import { AudioSystem } from "../services/audio-system/audio-system";
import { AudioSystems } from "../services/audio-system/audio-systems";
import { AuthenticationService } from "../services/authentication/authentication-service";
import { DataService } from "../services/data/data-service";
import { Device } from "../services/devices/device";
import { DeviceDetector } from "../services/devices/device-detector";
import { DeviceFactory } from "../services/devices/device-factory";
import { LinuxDeviceDetector } from "../services/devices/linux-device-detector";
import { MacOSDeviceDetector } from "../services/devices/macos-device-detector";
import { SimulationDeviceDetector } from "../services/devices/simulation-device-detector";
import { WindowsDeviceDetector } from "../services/devices/windows-device-detector";
import { Logger } from "../services/logging/logger";
import { NotificationService } from "../services/notifications/notification-service";
import { ProcessExecutionService } from "../services/process-execution/process-execution-service";
import { Scheduler } from "../services/scheduling/scheduler";
import { ISessionRepository } from "../services/sessions/i-session-repository";
import { Session } from "../services/sessions/session";
import { SessionFactory } from "../services/sessions/session-factory";
import { SessionService } from "../services/sessions/session-service";
import { ISettingsProvider } from "../services/settings/i-settings-provider";
import { SettingsService } from "../services/settings/settings-service";
import { ShutdownService } from "../services/shutdown/shutdown-service";
import { ShutdownSimulationService } from "../services/shutdown/shutdown-simulation-service";
import { UnixShutdownService } from "../services/shutdown/unix-shutdown-service";
import { WindowsShutdownService } from "../services/shutdown/windows-shutdown-service";
import { ConnectionHistoryService } from "../services/statistics/connection-history-service";
import { FileStreamingSourceFactory } from "../services/streaming-sources/file-streaming-source-factory";
import { IStreamingSource } from "../services/streaming-sources/i-streaming-source";
import { StreamingSimulationSourceFactory } from "../services/streaming-sources/streaming-simulation-source-factory";
import { StreamingSourceFactory } from "../services/streaming-sources/streaming-source-factory";
import { IStreamRepository } from "../services/streams/i-stream-repository";
import { Stream } from "../services/streams/stream";
import { StreamFactory } from "../services/streams/stream-factory";
import { StreamService } from "../services/streams/stream-service";
import { SystemMonitoringService } from "../services/system-monitoring/system-monitoring-service";
import { TimeService } from "../services/time/time.service";
import { FfmpegLogger, ServiceLogger } from "./logging.config";
import { config } from "./service.config";

export const container = new Container();

switch (config.os) {
  case "linux": {
    container.bind<ShutdownService>("ShutdownService").to(UnixShutdownService).inSingletonScope();
    container.bind<DeviceDetector>("DeviceDetector").to(LinuxDeviceDetector).inSingletonScope();
    container.bind<AudioSystem>("AudioSystem").toConstantValue(AudioSystems.linux);
    break;
  }
  case "darwin": {
    container.bind<ShutdownService>("ShutdownService").to(UnixShutdownService).inSingletonScope();
    container.bind<DeviceDetector>("DeviceDetector").to(MacOSDeviceDetector).inSingletonScope();
    container.bind<AudioSystem>("AudioSystem").toConstantValue(AudioSystems.darwin);
    break;
  }
  case "win32": {
    container.bind<ShutdownService>("ShutdownService").to(WindowsShutdownService).inSingletonScope();
    container.bind<DeviceDetector>("DeviceDetector").to(WindowsDeviceDetector).inSingletonScope();
    container.bind<AudioSystem>("AudioSystem").toConstantValue(AudioSystems.win32);
    break;
  }
  default: {
    throw new Error(`OS ${config.os} is unsupported.`);
  }
}

if (!config.production) {
  container.rebind<ShutdownService>("ShutdownService").to(ShutdownSimulationService).inSingletonScope();
}

if (config.simulate) {
  container.rebind<DeviceDetector>("DeviceDetector").to(SimulationDeviceDetector).inSingletonScope();
  container.bind<interfaces.Factory<IStreamingSource>>("StreamingSourceFactory").toFactory(StreamingSimulationSourceFactory);
} else if (config.filesource) {
  container.rebind<DeviceDetector>("DeviceDetector").to(SimulationDeviceDetector).inSingletonScope();
  container.bind<interfaces.Factory<IStreamingSource>>("StreamingSourceFactory").toFactory(FileStreamingSourceFactory);
} else {
  container.bind<interfaces.Factory<IStreamingSource>>("StreamingSourceFactory").toFactory(StreamingSourceFactory);
}

container.bind<interfaces.Factory<Device>>("DeviceFactory").toFactory(DeviceFactory);
container.bind<interfaces.Factory<Stream>>("StreamFactory").toFactory(StreamFactory);
container.bind<interfaces.Factory<Session>>("SessionFactory").toFactory(SessionFactory);

const dataService = new DataService(new Logger(ServiceLogger));
container.bind<DataService>("DataService").toConstantValue(dataService);
container.bind<string>("FfmpegPath").toConstantValue(config.ffmpegPath);
container.bind<ISessionRepository>("ISessionRepository").toConstantValue(dataService);
container.bind<IStreamRepository>("IStreamRepository").toConstantValue(dataService);
container.bind<ISettingsProvider>("ISettingsProvider").toConstantValue(dataService);
container.bind<Bootstrapper>("Bootstrapper").to(Bootstrapper);
container.bind<ApplicationStateService>("ActivityService").to(ApplicationStateService);
container.bind<ProcessExecutionService>("ProcessExecutionService").to(ProcessExecutionService);
container.bind<TimeService>("TimeService").to(TimeService);
container.bind<NotificationService>("NotificationService").to(NotificationService);

container.bind<Logger>("Logger").toConstantValue(new Logger(ServiceLogger));
container.bind<Logger>("FfmpegLogger").toConstantValue(new Logger(FfmpegLogger));

container.bind<StreamService>("StreamService").to(StreamService).inSingletonScope();
container.bind<SessionService>("SessionService").to(SessionService).inSingletonScope();
container.bind<SettingsService>("SettingsService").to(SettingsService);
container.bind<WebServer>("WebServer").to(WebServer).inSingletonScope();
container.bind<WebsocketServer>("WebsocketServer").to(WebsocketServer).inSingletonScope();
container.bind<ActivationService>("ActivationService").to(ActivationService).inSingletonScope();
container.bind<Scheduler>("Scheduler").to(Scheduler).inSingletonScope();
container.bind<ConnectionHistoryService>("ConnectionHistoryService").to(ConnectionHistoryService).inSingletonScope();
container.bind<SystemMonitoringService>("SystemMonitoringService").to(SystemMonitoringService);
container.bind<AutoActivationService>("AutoActivationService").to(AutoActivationService);

container.bind<AuthenticationService>("AuthenticationService").to(AuthenticationService).inSingletonScope();
container.bind<AuthenticationMiddleware>(AuthenticationMiddleware).to(AuthenticationMiddleware);