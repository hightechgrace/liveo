import { inject, injectable } from "inversify";
import { BehaviorSubject } from "rxjs";
import { Logger } from "../logging/logger";

@injectable()
export class AdminService {

  private connectedAdmins = [];
  public adminConnected$ = new BehaviorSubject(false);

  constructor(
    @inject("Logger") private _logger: Logger) {
  }

  public adminSubscribed(ip: string): void {
    this.connectedAdmins.push(ip);
    this.adminConnected$.next(true);
    this._logger.debug(`Admin subscribed, ${this.connectedAdmins.length} admins connected`);
  }

  public adminUnsubscribed(ip: string): void {
    const matchingIp = this.connectedAdmins.find(() => ip);
    if (matchingIp) {
      this.connectedAdmins.splice(this.connectedAdmins.indexOf(matchingIp), 1);
      if (this.connectedAdmins.length === 0) {
        this.adminConnected$.next(false);
      }
      this._logger.debug(`Admin unsubscribed, ${this.connectedAdmins.length} admins connected`);
    }
  }

  public clientDisconnected(ip: string): void {
    this.adminUnsubscribed(ip);
  }
}