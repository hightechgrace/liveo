import { version } from "../../../../version";

export const environment = {
  production: false,
  simulate: true,
  filesource: false,
  port: 3000,
  standalone: true,
  revision: version.revision,
  version: version.version,
  environment: "executable"
};
