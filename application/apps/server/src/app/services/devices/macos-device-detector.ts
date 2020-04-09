import { DeviceEntity, DeviceType } from "@liveo/entities";
import { EOL } from "os";
import { IdGenerator } from "../id-generation/id-generator";
import { Logger } from "../logging/logger";
import { PlatformConstants } from "../platform-constants/platform-constants";
import { ProcessExecutionService } from "../process-execution/process-execution-service";
import { Device } from "./device";
import { DeviceDetector } from "./device-detector";
import { DeviceState } from "./device-state";

/**
 * Implementation of device detection on mac os
 */
export class MacOSDeviceDetector extends DeviceDetector {

  constructor(
    logger: Logger,
    audioSystem: PlatformConstants,
    ffmpegPath: string,
    processExecutionService: ProcessExecutionService,
    idGenerator: IdGenerator,
    deviceFactory: (deviceData: DeviceEntity, deviceState: DeviceState) => Device
  ) {
    super(logger, processExecutionService, idGenerator, deviceFactory);
    this.listDevicesCommand = `${ffmpegPath} -f ${audioSystem.audioModule} -list_devices true -i '' -hide_banner`;
  }

  protected parseResponse(response: string): Device[] {
    const devices = [];
    let isVideo = true;

    const prefix = /^\[AVFoundation/;
    const audioSeparator = /AVFoundation\saudio\sdevices/;
    const deviceParams = /^\[AVFoundation.*?\]\s\[(\d*?)\]\s(.*)$/;
    const searchPrefix = (line: string) => (line.search(prefix) > -1);
    const searchAudioSeparator = (line: string) => isVideo && (line.search(audioSeparator) > -1);

    response.split(EOL)
      .filter(searchPrefix)
      .forEach((line) => {
        if (searchAudioSeparator(line)) {
          isVideo = false;
          return;
        }
        const params = line.match(deviceParams);
        if (params) {
          const id = params[1];
          const name = params[2]
          const deviceType = isVideo ? DeviceType.Video : DeviceType.Audio
          devices.push(this.instantiateDevice(id, name, deviceType, DeviceState.Available));
        }
      });

    return devices;
  }
}