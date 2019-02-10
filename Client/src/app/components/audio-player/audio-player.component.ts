import { Component, OnInit } from "@angular/core";
import { Stream } from "../../entities/stream.entity";
import { StreamService } from "src/app/services/stream/stream.service";
import { ActivatedRoute } from "@angular/router";

@Component({
  selector: "audio-player",
  templateUrl: "./audio-player.component.html",
  styleUrls: ["./audio-player.component.css"]
})
export class AudioPlayerComponent implements OnInit {

  public stream: Stream = null;
  private _isLoading: boolean;
  private _connectionError: boolean;

  constructor(private _route: ActivatedRoute, private _streamService: StreamService) {
  }

  public ngOnInit(): void {
    this.getStream();
  }

  private getStream(): void {
    const id = this._route.snapshot.paramMap.get("id");

    this._streamService.getStream(id)
      .then((stream) => {
        this.stream = stream;
        this._isLoading = false;
      }).catch((error) => {
        this._connectionError = true;
        this._isLoading = false;
      });
  }
}