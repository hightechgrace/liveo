import { ROUTES } from "@liveo/constants";
import { Injectable, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Request, Response } from "express";
import { AppConfig, APP_CONFIG_TOKEN } from "../../config/configuration";

@Injectable()
export class FallbackRoutesMiddleware implements NestMiddleware {

  constructor(
    private readonly _configService: ConfigService) {
  }

  use(req: Request, res: Response, next: () => void) {
    const appConfig = this._configService.get<AppConfig>(APP_CONFIG_TOKEN);
    const staticFilesBaseDirectory = appConfig.staticFilesBaseDirectory;

    if (req.path.includes(ROUTES.api)) {
      return next();
    } else if (req.path.includes(ROUTES.admin)) {
      const adminIndex = `${staticFilesBaseDirectory}/${ROUTES.admin}/index.html`;
      res.sendFile(adminIndex);
    }

    const clientIndex = `${staticFilesBaseDirectory}/${ROUTES.client}/index.html`;
    res.sendFile(clientIndex);
  }
}