/*
	Audio-Player is part of 3LAS (Low Latency Live Audio Streaming)
	https://github.com/JoJoBond/3LAS
*/

function PCMAudioPlayer() {
  // Create audio context
  if (typeof AudioContext !== "undefined")
    this._SoundContext = new AudioContext();
  else if (typeof webkitAudioContext !== "undefined")
    this._SoundContext = new webkitAudioContext();
  else if (typeof mozAudioContext !== "undefined")
    this._SoundContext = new mozAudioContext();
  else
    throw new Error('PCMAudioPlayer: Browser does not support "AudioContext".');

  // Set speed to default
  this._Speed = 1.0;

  // Prepare variable for scheduling times
  this._NextTime = 0.0;

  // Create gain node for volume control
  this._GainNode = this._SoundContext.createGain();

  // Set volume to max
  this._GainNode.gain.value = 1.0;

  // Connect gain node to context
  this._GainNode.connect(this._SoundContext.destination);
}


// Settings:
// =========

PCMAudioPlayer.prototype._VariSpeed = false;

PCMAudioPlayer.prototype._StartOffset = 0.4;


// Constants:
// ==========

// Crystal oscillator have a variance of about +/- 100ppm
// So worst case would be a difference of 200ppm between two oscillators.
PCMAudioPlayer.prototype._SpeedCorrectionParameter = 200 / 1.0e6;

PCMAudioPlayer.prototype._OffsetVariance = 0.2;

PCMAudioPlayer.prototype._OffsetMin = PCMAudioPlayer.prototype._StartOffset - PCMAudioPlayer.prototype._OffsetVariance;
PCMAudioPlayer.prototype._OffsetMax = PCMAudioPlayer.prototype._StartOffset + PCMAudioPlayer.prototype._OffsetVariance;


// Pubic methods (external functions):
// ===================================

// Sets the playback volome
PCMAudioPlayer.prototype.SetVolume = function (Value) {
	// Limit value to [0.0 ; 1.0]
	/*if (Value > 1.0)
		Value = 1.0;
	else */if (Value <= 0.0)
    Value = 1e-20;

  // Cancel any scheduled ramps
  this._GainNode.gain.cancelScheduledValues(this._SoundContext.currentTime);

  // Change volume following a ramp (more userfriendly)
  this._GainNode.gain.exponentialRampToValueAtTime(Value, this._SoundContext.currentTime + 0.5);
};

// Gets the playback volume
PCMAudioPlayer.prototype.GetVolume = function () {
  // Get volume from gain node
  return this._GainNode.gain.value;
};

// Unmutes mobile devices (e.g. iPhones)
PCMAudioPlayer.prototype.MobileUnmute = function () {
  // Create one second buffer with silence		
  var audioBuffer = this._SoundContext.createBuffer(2, this._SoundContext.sampleRate, this._SoundContext.sampleRate);

  // Create new audio source for the buffer
  var SourceNode = this._SoundContext.createBufferSource();

  // Make sure the node deletes itself after playback
  SourceNode.onended = function () {
    var ThisNode = SourceNode;
    ThisNode.disconnect();
    ThisNode = null;
  };

  // Pass audio data to source
  SourceNode.buffer = audioBuffer;

  // Connect the source to the gain node
  SourceNode.connect(this._GainNode);

  // Play source		
  SourceNode.start(0);
};

// Decodes audio data
PCMAudioPlayer.prototype.DecodeAudioData = function (audioData, successCallback, errorCallback) {
  if (typeof errorCallback !== 'function')
    errorCallback = function () { };
  // Call decoder
  return this._SoundContext.decodeAudioData(audioData, successCallback, errorCallback);
};

// Creates audio buffers
PCMAudioPlayer.prototype.CreateBuffer = function (numberOfChannels, length, sampleRate) {
  // Call decoder
  return this._SoundContext.createBuffer(numberOfChannels, length, sampleRate);
};

// Recieves an audiobuffer and schedules it for seamless playback
PCMAudioPlayer.prototype.PushBuffer = function (AudioBuffer) {
  // Create new audio source for the buffer
  var SourceNode = this._SoundContext.createBufferSource();

  // Make sure the node deletes itself after playback
  SourceNode.onended = function () {
    var ThisNode = SourceNode;
    ThisNode.disconnect();
    ThisNode = null;
  };

  // Prevent looping (the standard says that it should be off by default)
  SourceNode.loop = false;

  // Pass audio data to source
  SourceNode.buffer = AudioBuffer;

  //Connect the source to the gain node
  SourceNode.connect(this._GainNode);

  // Check if this is the first buffer we received
  if (this._NextTime == 0.0) {
    // Start playing [StartOffset] s from now
    this._NextTime = this._SoundContext.currentTime + this._StartOffset;
  }

  if (this._VariSpeed) {
    // Check if we are to far or too close to target schedule time
    if (this._NextTime - this._SoundContext.currentTime > this._OffsetMax) {
      if (this._Speed < 1.0 + this._SpeedCorrectionParameter) {
        // We are too slow, speed up playback (somewhat noticeable)

        console.log("speed up");
        this._Speed = 1.0 + this._SpeedCorrectionParameter;
      }
    }
    else if (this._NextTime - this._SoundContext.currentTime < this._OffsetMin) {
      if (this._Speed > 1.0 - this._SpeedCorrectionParameter) {
        // We are too fast, slow down playback (somewhat noticeable)

        console.log("speed down");
        this._Speed = 1.0 - this._SpeedCorrectionParameter;
      }

      // Check if we ran out of time
      if (this._NextTime <= this._SoundContext.currentTime) {
        if (this._NextTime + AudioBuffer.duration < this._SoundContext.currentTime) {
          //this._NextTime += AudioBuffer.duration * 1.01;
          //return;
        }
        // In that case reschedule the playback to [StartOffset]/2.0 s from now
        //this._NextTime = this._SoundContext.currentTime;// + StartOffset / 2.0;
        //if (typeof this._UnderrunCallback === 'function')
        //	this._UnderrunCallback();
      }
    }
    else {
      // Check if we are in time		
      if ((this._Speed > 1.0 && (this._NextTime - this._SoundContext.currentTime < this._StartOffset)) ||
        (this._Speed < 1.0 && (this._NextTime - this._SoundContext.currentTime > this._StartOffset))) {
        // We within our min/max offset, set playpacks to default
        this._Speed = 1.0;
        console.log("normal speed");
      }
    }

    // Set playback speed
    SourceNode.playbackRate.value = this._Speed;
  }

  // Schedule playback
  SourceNode.start(this._NextTime);
  //SourceNode.start();

  // Move time forward
  if (!this._VariSpeed || this._Speed == 1.0) {
    // Use recular duration
    this._NextTime += AudioBuffer.duration;
  }
  else {
    // Use duration adjusted for playback speed
    this._NextTime += (AudioBuffer.duration / this._Speed);// - (1.0 / this._SoundContext.sampleRate);
  }
};


/*
	Format-Reader is part of 3LAS (Low Latency Live Audio Streaming)
	https://github.com/JoJoBond/3LAS
*/

function AudioFormatReader(ErrorCallback, DataReadyCallback) {
  // Check callback argument
  if (typeof ErrorCallback !== 'function')
    throw new Error('AudioFormatReader: ErrorCallback must be specified');

  if (typeof DataReadyCallback !== 'function')
    throw new Error('AudioFormatReader: DataReadyCallback must be specified');

  this._ErrorCallback = ErrorCallback;
  this._DataReadyCallback = DataReadyCallback;
}


// Pubic methods (external functions) prototypes:
// ==============================================

// Push data into reader
AudioFormatReader.prototype.PushData = function (data) {
};

// Check if samples are available
AudioFormatReader.prototype.SamplesAvailable = function () {
  return false;
};

// Get a single bunch of sampels from the reader
AudioFormatReader.prototype.PopSamples = function () {
  return null;
};

// Deletes all encoded and decoded data from the reader (does not effect headers, etc.)
AudioFormatReader.prototype.PurgeData = function () {
};

// Force the reader to analyze his data
AudioFormatReader.prototype.Poke = function () {
};


function CanDecodeTypes(MIMETypes) {
  var AudioTag = new Audio();

  for (var i = 0; i < MIMETypes.length; i++) {
    var answer = AudioTag.canPlayType(MIMETypes[i]);
    if (answer === "probably" || answer === "maybe")
      return true;
  }
  return false;
}


function CreateAudioFormatReader(UserAgentInfo, MIME, ErrorCallback, DataReadyCallback) {
  if (typeof MIME !== "string")
    throw new Error('CreateAudioFormatReader: Invalid MIME-Type, must be string');

  // Load format handler according to MIME-Type
  switch (MIME.replace(/\s/g, "")) {
    // MPEG Audio (mp3)
    case "audio/mpeg":
    case "audio/MPA":
    case "audio/mpa-robust":
      if (!CanDecodeTypes(new Array("audio/mpeg", "audio/MPA", "audio/mpa-robust")))
        throw new Error('CreateAudioFormatReader: Browser can not decode specified MIME-Type (' + MIME + ')');

      return new AudioFormatReader_MPEG(UserAgentInfo, ErrorCallback, DataReadyCallback);

    // Unknown codec
    default:
      throw new Error('CreateAudioFormatReader: Specified MIME-Type (' + MIME + ') not supported');
  }
}


/*
	Player-Controls is part of 3LAS (Low Latency Live Audio Streaming)
	https://github.com/JoJoBond/3LAS
*/

function HTMLPlayerControls(DivID) {
  this._PlayerControls = document.getElementById(DivID);
  if (this._PlayerControls == null)
    throw new Error('HTMLPlayerControls: Could not find player controls via specified ID.');
  this._PlayerControls.ondragstart = function () { return false; };

  this.OnVolumeChange = null;
  this.OnPlayClick = null;

  this._VolumeDragging = false;
  this._isMuted = false;

  this._VolumeContainer = document.querySelector("div#" + DivID + " > div.volumebar");
  if (this._VolumeContainer == null)
    throw new Error('HTMLPlayerControls: Could not find volumebar via querySelector.');

  this._VolumeKnob = document.querySelector("div#" + DivID + " > div.volumebar > div.volumeknob");
  if (this._VolumeKnob == null)
    throw new Error('HTMLPlayerControls: Could not find volumeknob via querySelector.');

  this._VolumeBar = document.querySelector("div#" + DivID + " > div.volumebar > div.currentvolume");
  if (this._VolumeBar == null)
    throw new Error('HTMLPlayerControls: Could not find currentvolume via querySelector.');

  this._MaximumVolume = document.querySelector("div#" + DivID + " > div.volumebar > div.totalvolume");
  if (this._MaximumVolume == null)
    throw new Error('HTMLPlayerControls: Could not find totalvolume via querySelector.');

  this._TotalBarSize = this._MaximumVolume.clientWidth - this._VolumeKnob.clientWidth;
  this._KnobRadius = this._VolumeKnob.clientWidth / 2.0;

  this._VolumeStore = this._TotalBarSize;

  this._VolumeKnob.style.left = this._TotalBarSize + "px";

  this._VolumeContainer.addEventListener("touchstart", this.__hInteractBegin.bind(this));
  this._VolumeContainer.addEventListener("mousedown", this.__hInteractBegin.bind(this));

  this._VolumeContainer.addEventListener("touchend", this.__hInteractEnd.bind(this));
  this._VolumeContainer.addEventListener("mouseup", this.__hInteractEnd.bind(this));

  this._VolumeContainer.addEventListener("touchleave", this.__hInteractLeave.bind(this));
  this._VolumeContainer.addEventListener("mouseleave", this.__hInteractLeave.bind(this));

  this._VolumeContainer.addEventListener("touchmove", this.__hInteractMove.bind(this));
  this._VolumeContainer.addEventListener("mousemove", this.__hInteractMove.bind(this));

  this._ButtonBar = document.querySelector("div#" + DivID + " > div.controlbar");
  if (this._ButtonBar == null)
    throw new Error('HTMLPlayerControls: Could not find controlbar via querySelector.');

  this._MuteButton = document.querySelector("div#" + DivID + " > div.controlbar > div.mutebutton");
  if (this._MuteButton == null)
    throw new Error('HTMLPlayerControls: Could not find mutebutton via querySelector.');

  this._UnMuteButton = document.querySelector("div#" + DivID + " > div.controlbar > div.unmutebutton");
  if (this._UnMuteButton == null)
    throw new Error('HTMLPlayerControls: Could not find unmutebutton via querySelector.');

  this._ButtonOverlay = document.querySelector("div#" + DivID + " > div.playbuttonoverlay");
  if (this._ButtonOverlay == null)
    throw new Error('HTMLPlayerControls: Could not find playbuttonoverlay via querySelector.');

  this._PlayButton = document.querySelector("div#" + DivID + " > div.playbuttonoverlay > div.playbutton");
  if (this._PlayButton == null)
    throw new Error('HTMLPlayerControls: Could not find playbutton via querySelector.');

  this._ActivityIndicator = document.querySelector("div#" + DivID + " > div.activityindicator");
  if (this._ActivityIndicator == null)
    throw new Error('HTMLPlayerControls: Could not find activityindicator via querySelector.');

  this._ActivityLightOn = document.querySelector("div#" + DivID + " > div.activityindicator > div.redlighton");
  if (this._ActivityLightOn == null)
    throw new Error('HTMLPlayerControls: Could not find redlighton via querySelector.');

  this._ActivityLightOff = document.querySelector("div#" + DivID + " > div.activityindicator > div.redlightoff");
  if (this._ActivityLightOff == null)
    throw new Error('HTMLPlayerControls: Could not find redlighton via querySelector.');

  this._ActivityStatus = false;

  this._MuteButton.addEventListener("click", this.__Mute_Click.bind(this));

  this._UnMuteButton.addEventListener("click", this.__UnMute_Click.bind(this));

  this._PlayButton.addEventListener("click", this.__Play_Click.bind(this));
}


// Pubic methods (external functions):
// ===================================

HTMLPlayerControls.prototype.ToogleActivityLight = function () {
  if (this._ActivityStatus) {
    this._ActivityLightOff.style.visibility = "visible";
    this._ActivityLightOn.style.visibility = "hidden";
    this._ActivityStatus = false;
    return false;
  }
  else {
    this._ActivityLightOff.style.visibility = "hidden";
    this._ActivityLightOn.style.visibility = "visible";
    this._ActivityStatus = true;
    return true;
  }
};

HTMLPlayerControls.prototype.SetPlaystate = function (state) {
  if (state) {
    this._VolumeContainer.style.visibility = "visible";
    this._ButtonBar.style.visibility = "visible";
    this._PlayButton.style.visibility = "hidden";
  }
  else {
    this._VolumeContainer.style.visibility = "hidden";
    this._ButtonBar.style.visibility = "hidden";
    this._PlayButton.style.visibility = "visible";
  }
};


// Private methods (Internal functions):
// =====================================

HTMLPlayerControls.prototype._UpdateVolumeBar = function (value) {
  this._VolumeKnob.style.left = value + "px";
  this._VolumeBar.style.width = value + this._KnobRadius + "px";
}

HTMLPlayerControls.prototype._UpdateVolume = function (value) {
  if (value > this._TotalBarSize)
    value = this._TotalBarSize;
  else if (value < 0)
    value = 0;

  this._UpdateVolumeBar(value);


  if (this._isMuted) {
    this._isMuted = false;
    this._MuteButton.style.visibility = "visible";
    this._UnMuteButton.style.visibility = "hidden";
  }

  if (typeof this.OnVolumeChange === 'function')
    this.OnVolumeChange(value / this._TotalBarSize);
};


// Internal callback functions
// ===========================

HTMLPlayerControls.prototype.__hInteractBegin = function (e) {
  this._VolumeDragging = true;
  if (window.e)
    e = window.e;

  if (!e.pageX && e.changedTouches && e.changedTouches.length >= 1) {
    e.pageX = e.changedTouches[0].pageX;
  }

  var mousex = e.pageX - getOffsetSum(this.VolumeContainer).left;

  this._UpdateVolume(mousex - this._KnobRadius);
};

HTMLPlayerControls.prototype.__hInteractEnd = function (e) {
  this._VolumeDragging = false;
};

HTMLPlayerControls.prototype.__hInteractLeave = function (e) {
  this._VolumeDragging = false;
};

HTMLPlayerControls.prototype.__hInteractMove = function (e) {
  if (this._VolumeDragging) {
    if (window.e)
      e = window.e;


    if (!e.pageX && e.changedTouches && e.changedTouches.length >= 1) {
      e.pageX = e.changedTouches[0].pageX;
    }

    var mousex = e.pageX - getOffsetSum(this._VolumeContainer).left;

    this._UpdateVolume(mousex - this._KnobRadius);
  }
};

HTMLPlayerControls.prototype.__Mute_Click = function (e) {
  this._isMuted = true;
  this._UnMuteButton.style.visibility = "visible";
  this._MuteButton.style.visibility = "hidden";

  this._VolumeStore = parseInt(this._VolumeKnob.style.left);
  this._UpdateVolumeBar(0);
  if (typeof this.OnVolumeChange === 'function')
    this.OnVolumeChange(0.0);
};

HTMLPlayerControls.prototype.__UnMute_Click = function (e) {
  this._isMuted = false;
  this._MuteButton.style.visibility = "visible";
  this._UnMuteButton.style.visibility = "hidden";

  this._UpdateVolumeBar(this._VolumeStore);
  if (typeof this.OnVolumeChange === 'function')
    this.OnVolumeChange(this._VolumeStore / this._TotalBarSize);
};

HTMLPlayerControls.prototype.__Play_Click = function (e) {
  if (typeof this.OnPlayClick === 'function')
    this.OnPlayClick();
};


function getOffsetSum(elem) {
  var top = 0, left = 0;
  while (elem) {
    top = top + parseInt(elem.offsetTop);
    left = left + parseInt(elem.offsetLeft);
    elem = elem.offsetParent;
  }
  return { top: top, left: left };
}

/*
	Socket-Client is part of 3LAS (Low Latency Live Audio Streaming)
	https://github.com/JoJoBond/3LAS
*/

function WebSocketClient(URI, ErrorCallback, ConnectCallback, DataReadyCallback, DisconnectCallback) {
  // Check callback argument
  if (typeof ErrorCallback !== 'function')
    throw new Error('WebSocketClient: ErrorCallback must be specified');
  if (typeof ConnectCallback !== 'function')
    throw new Error('WebSocketClient: ConnectCallback must be specified');
  if (typeof DataReadyCallback !== 'function')
    throw new Error('WebSocketClient: DataReadyCallback must be specified');
  if (typeof DisconnectCallback !== 'function')
    throw new Error('WebSocketClient: DisconnectCallback must be specified');

  this._ErrorCallback = ErrorCallback;
  this._ConnectCallback = ConnectCallback;
  this._DataReadyCallback = DataReadyCallback;
  this._DisconnectCallback = DisconnectCallback;

  // Client is not yet connected
  this._IsConnected = false;

  // Create socket, connect to URI
  if (typeof WebSocket !== "undefined")
    this._Socket = new WebSocket(URI);
  else if (typeof webkitWebSocket !== "undefined")
    this._Socket = new webkitWebSocket(URI);
  else if (typeof mozWebSocket !== "undefined")
    this._Socket = new mozWebSocket(URI);
  else
    throw new Error('WebSocketClient: Browser does not support "WebSocket".');

  this._Socket.addEventListener("open", this.__Socket_OnOpen.bind(this), false);
  this._Socket.addEventListener("error", this.__Socket_OnError.bind(this), false);
  this._Socket.addEventListener("close", this.__Socket_OnClose.bind(this), false);
  this._Socket.addEventListener("message", this.__Socket_OnMessage.bind(this), false);

  this._Socket.binaryType = 'arraybuffer';
}


// Pubic methods (external functions):
// ===================================

// Returns current connection status
WebSocketClient.prototype.GetStatus = function () {
  // Return boolean
  return this._IsConnected;
};


// Internal callback functions
// ===========================

// Handle errors
WebSocketClient.prototype.__Socket_OnError = function (event) {
  if (this._IsConnected == true)
    this._ErrorCallback("Socket fault.");
  else
    this._ErrorCallback("Could not connect to server.");
};

// Change connetion status once connected
WebSocketClient.prototype.__Socket_OnOpen = function (event) {
  if (this._Socket.readyState == 1) {
    this._IsConnected = true;
    this._ConnectCallback();
  }
};

// Change connetion status on disconnect
WebSocketClient.prototype.__Socket_OnClose = function (event) {
  if (this._IsConnected == true && (this._Socket.readyState == 2 || this._Socket.readyState == 3)) {
    this._IsConnected = false;
    this._DisconnectCallback();
  }
};

// Handle incomping data
WebSocketClient.prototype.__Socket_OnMessage = function (event) {
  // Trigger callback
  this._DataReadyCallback(event.data);
};

/*
	Log-Window is part of 3LAS (Low Latency Live Audio Streaming)
	https://github.com/JoJoBond/3LAS
*/

function LogEvent(info) {
  var logwindow = document.getElementById("logwindow");
  var line = document.createElement("p");
  var datetime = new Date();
  var linetext = "[" + (datetime.getHours() > 9 ? datetime.getHours() : "0" + datetime.getHours()) + ":" +
    (datetime.getMinutes() > 9 ? datetime.getMinutes() : "0" + datetime.getMinutes()) + ":" +
    (datetime.getSeconds() > 9 ? datetime.getSeconds() : "0" + datetime.getSeconds()) +
    "] " + info;
  line.innerHTML = linetext;

  logwindow.appendChild(line);
}

function ToggleLogWindow() {
  var logwindow = document.getElementById("logwindow");
  if (logwindow.style.display == "block") {
    logwindow.style.display = "none";
  }
  else {
    logwindow.style.display = "block";
  }
}

/*
	MPEG-Audio-Format-Reader is part of 3LAS (Low Latency Live Audio Streaming)
	https://github.com/JoJoBond/3LAS
*/

function AudioFormatReader_MPEG(UserAgentInfo, ErrorCallback, DataReadyCallback) {
  AudioFormatReader.call(this, ErrorCallback, DataReadyCallback);

  // Dependencies:
  // =============

  // Create audio context
  if (typeof AudioContext !== "undefined")
    this._SoundContext = new AudioContext();
  else if (typeof webkitAudioContext !== "undefined")
    this._SoundContext = new webkitAudioContext();
  else if (typeof mozAudioContext !== "undefined")
    this._SoundContext = new mozAudioContext();
  else
    throw new Error('AudioFormatReader_MPEG: Browser does not support "AudioContext".');


  // Internal variables:
  // ===================

  // Data buffer for "raw" framedata
  this._DataBuffer = new Uint8Array(0);

  // Array for individual frames
  this._Frames = new Array();

  // Array for individual bunches of samples
  this._Samples = new Array();

  // Indices that mark frame borders
  this._FrameStartIdx = -1;
  this._FrameEndIdx = -1;

  this._FrameSamples = 0;
  this._FrameSampleRate = 0;

  this._TimeBudget = 0;

  // Number of frames to decode together (keyword: byte-reservoir)
  // For live streaming this means that you can push the minimum number of frames
  // on connection to the client to reduce waiting time without effecting the latency.
  if (UserAgentInfo.isAndroid && UserAgentInfo.isFirefox)
    AudioFormatReader_MPEG.prototype._WindowSize = 50;
  else if (UserAgentInfo.isAndroid && UserAgentInfo.isNativeChrome)
    AudioFormatReader_MPEG.prototype._WindowSize = 30;
  else if (UserAgentInfo.isAndroid)
    AudioFormatReader_MPEG.prototype._WindowSize = 30;
  else
    AudioFormatReader_MPEG.prototype._WindowSize = 25;

  // Number of frames to use from one decoded window
  if (UserAgentInfo.isAndroid && UserAgentInfo.isFirefox)
    AudioFormatReader_MPEG.prototype._UseFrames = 40;
  else if (UserAgentInfo.isAndroid && UserAgentInfo.isNativeChrome)
    AudioFormatReader_MPEG.prototype._UseFrames = 20;
  else if (UserAgentInfo.isAndroid)
    AudioFormatReader_MPEG.prototype._UseFrames = 5;
  else
    AudioFormatReader_MPEG.prototype._UseFrames = 2;
}


// Settings:
// =========

// Adds a minimal ID3v2 tag to each frame
AudioFormatReader_MPEG.prototype._AddID3Tag = true;

// Constants:
// ==========

// MPEG versions - use [version]
AudioFormatReader_MPEG.prototype._mpeg_versions = new Array(25, 0, 2, 1);

// Layers - use [layer]
AudioFormatReader_MPEG.prototype._mpeg_layers = new Array(0, 3, 2, 1);

// Bitrates - use [version][layer][bitrate]
AudioFormatReader_MPEG.prototype._mpeg_bitrates = new Array(
  new Array( // Version 2.5
    new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), // Reserved
    new Array(0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0), // Layer 3
    new Array(0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0), // Layer 2
    new Array(0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0)  // Layer 1
  ),
  new Array( // Reserved
    new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), // Invalid
    new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), // Invalid
    new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), // Invalid
    new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)  // Invalid
  ),
  new Array( // Version 2
    new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), // Reserved
    new Array(0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0), // Layer 3
    new Array(0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0), // Layer 2
    new Array(0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0)  // Layer 1
  ),
  new Array( // Version 1
    new Array(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0), // Reserved
    new Array(0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0), // Layer 3
    new Array(0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0), // Layer 2
    new Array(0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0) // Layer 1
  )
);

// Sample rates - use [version][srate]
AudioFormatReader_MPEG.prototype._mpeg_srates = new Array(
  new Array(11025, 12000, 8000, 0), // MPEG 2.5
  new Array(0, 0, 0, 0), // Reserved
  new Array(22050, 24000, 16000, 0), // MPEG 2
  new Array(44100, 48000, 32000, 0)  // MPEG 1
);

// Samples per frame - use [version][layer]
AudioFormatReader_MPEG.prototype._mpeg_frame_samples = new Array(
  //             Rsvd     3     2     1  < Layer  v Version
  new Array(0, 576, 1152, 384), //       2.5
  new Array(0, 0, 0, 0), //       Reserved
  new Array(0, 576, 1152, 384), //       2
  new Array(0, 1152, 1152, 384)  //       1
);

// Slot size (MPEG unit of measurement) - use [layer]
AudioFormatReader_MPEG.prototype._mpeg_slot_size = new Array(0, 1, 1, 4); // Rsvd, 3, 2, 1

// Minimalistic ID3v2 tag
if (AudioFormatReader_MPEG.prototype._AddID3Tag) {
  AudioFormatReader_MPEG.prototype._ID3v2Tag = new Uint8Array(new Array(
    0x49, 0x44, 0x33,       // File identifier: "ID3"
    0x03, 0x00,             // Version 2.3
    0x00,                   // Flags: no unsynchronisation, no extended header, no experimental indicator
    0x00, 0x00, 0x00, 0x0D, // Size of the (tag-)frames, extended header and padding
    0x54, 0x49, 0x54, 0x32, // Title frame: "TIT2"
    0x00, 0x00, 0x00, 0x02, // Size of the frame data
    0x00, 0x00,				// Frame Flags
    0x00, 0x20, 0x00		// Frame data (space character) and padding 
  ));
}


// Pubic methods (external functions):
// ===================================

// Pushes frame data into the buffer
AudioFormatReader_MPEG.prototype.PushData = function (data) {
  // Append data to framedata buffer
  this._DataBuffer = appendBuffer(this._DataBuffer, new Uint8Array(data));
  // Try to extract frames
  this._ExtractAllFrames();
};

// Check if there are any samples ready for playback
AudioFormatReader_MPEG.prototype.SamplesAvailable = function () {
  return (this._Samples.length > 0);
};

// Returns a bunch of samples for playback and removes the from the array
AudioFormatReader_MPEG.prototype.PopSamples = function () {
  if (this._Samples.length > 0) {
    // Get first bunch of samples
    var audioBuffer = this._Samples[0];
    // Remove said bunch from the array
    this._Samples.shift();
    // Hand it back to callee
    return audioBuffer;
  }
  else
    return null;
};

// Used to force frame extraction externaly
AudioFormatReader_MPEG.prototype.Poke = function () {
  this._ExtractAllFrames();
};

// Deletes all frames from the databuffer and framearray and all samples from the samplearray
AudioFormatReader_MPEG.prototype.PurgeData = function () {
  this._DataBuffer = new Uint8Array(0);

  this._Frames = new Array();

  this._Samples = new Array();

  this._FrameStartIdx = -1;
  this._FrameEndIdx = -1;
};


// Private methods (Internal functions):
// =====================================

// Extracts all currently possible frames
AudioFormatReader_MPEG.prototype._ExtractAllFrames = function () {
  // Look for frames
  this._FindFrame();
  // Repeat as long as we can extract frames
  while (this._CanExtractFrame()) {
    // Extract frame and push into array
    this._Frames.push(this._ExtractFrame());

    // Check if we have enough frames to decode
    if (this._Frames.length >= this._WindowSize) {
      var SampleRates = new Array();
      var SampleCount = new Array();

      // Sum the lengths of the individuall frames
      var bufferlength = 0;
      for (var i = 0; i < this._WindowSize; i++) {
        SampleRates.push(this._Frames[i].rate);
        SampleCount.push(this._Frames[i].samples);
        bufferlength += this._Frames[i].data.length;
      }

      // If needed, add some space for the ID3v2 tag
      if (this._AddID3Tag)
        bufferlength += this._ID3v2Tag.length;

      // Create a buffer long enough to hold everything
      var windowbuffer = new Uint8Array(bufferlength);

      var offset = 0;

      // If needed, add ID3v2 tag to beginning of buffer
      if (this._AddID3Tag) {
        windowbuffer.set(this._ID3v2Tag, offset);
        offset += this._ID3v2Tag.length;
      }

      // Add the frames to the window
      for (var i = 0; i < this._WindowSize; i++) {
        windowbuffer.set(this._Frames[i].data, offset);
        offset += this._Frames[i].data.length;
      }

      // Remove the used frames from the array
      for (var i = 0; i < (this._UseFrames - 1); i++)
        this._Frames.shift();

      // Push window to the decoder
      this._SoundContext.decodeAudioData(
        windowbuffer.buffer,
        (function (buffer) {
          var srates = SampleRates;
          var scount = SampleCount;
          (this.__decodeSuccess.bind(this))(buffer, srates, scount);
        }).bind(this),
        this.__decodeError.bind(this)
      );
    }

    // Look for frames
    this._FindFrame();
  }
};

// Finds frame boundries within the data buffer
AudioFormatReader_MPEG.prototype._FindFrame = function () {
  // Find frame start
  if (this._FrameStartIdx < 0) {
    var i = 0;
    // Make sure we don't exceed array bounds
    while ((i + 1) < this._DataBuffer.length) {
      // Look for MPEG sync word
      if (this._DataBuffer[i] == 0xFF && (this._DataBuffer[i + 1] & 0xE0) == 0xE0) {
        // Sync found, set frame start
        this._FrameStartIdx = i;
        break;
      }
      i++;
    }
  }

  // Find frame end
  if (this._FrameStartIdx >= 0 && this._FrameEndIdx < 0) {
    // Check if we have enough data to process the header
    if ((this._FrameStartIdx + 2) < this._DataBuffer.length) {
      // Get header data

      // Version index
      var ver = (this._DataBuffer[this._FrameStartIdx + 1] & 0x18) >>> 3;
      // Layer index
      var lyr = (this._DataBuffer[this._FrameStartIdx + 1] & 0x06) >>> 1;
      // Padding? 0/1
      var pad = (this._DataBuffer[this._FrameStartIdx + 2] & 0x02) >>> 1;
      // Bitrate index
      var brx = (this._DataBuffer[this._FrameStartIdx + 2] & 0xf0) >>> 4;
      // SampRate index
      var srx = (this._DataBuffer[this._FrameStartIdx + 2] & 0x0c) >>> 2;

      // Resolve flags to real values
      var bitrate = this._mpeg_bitrates[ver][lyr][brx] * 1000;
      var samprate = this._mpeg_srates[ver][srx];
      var samples = this._mpeg_frame_samples[ver][lyr];
      var slot_size = this._mpeg_slot_size[lyr];

      // In-between calculations
      var bps = samples / 8.0;
      var fsize = ((bps * bitrate) / samprate) + ((pad == 1) ? slot_size : 0);

      // Truncate to integer
      var FrameSize = Math.floor(fsize)

      // Store number of samples and samplerate for frame
      this._FrameSamples = samples;
      this._FrameSampleRate = samprate;

      // Set end frame boundry
      this._FrameEndIdx = this._FrameStartIdx + FrameSize;
    }
  }
};

// Checks if there is a frame ready to be extracted
AudioFormatReader_MPEG.prototype._CanExtractFrame = function () {
  if (this._FrameStartIdx < 0 || this._FrameEndIdx < 0)
    return false;
  else if (this._FrameEndIdx < this._DataBuffer.length)
    return true;
  else
    return false;
};

// Extract a single frame from the buffer
AudioFormatReader_MPEG.prototype._ExtractFrame = function () {
  // Extract frame data from buffer
  var framearray = this._DataBuffer.buffer.slice(this._FrameStartIdx, this._FrameEndIdx);

  // Remove frame from buffer
  if ((this._FrameEndIdx + 1) < this._DataBuffer.length)
    this._DataBuffer = new Uint8Array(this._DataBuffer.buffer.slice(this._FrameEndIdx));
  else
    this._DataBuffer = new Uint8Array(0);

  // Reset Start/End indices
  this._FrameStartIdx = 0;
  this._FrameEndIdx = -1;

  return { 'data': new Uint8Array(framearray), 'samples': this._FrameSamples, 'rate': this._FrameSampleRate };
};


// Internal callback functions
// ===========================

// Is called if the decoding of the window succeeded
AudioFormatReader_MPEG.prototype.__decodeSuccess = function (buffer, SampleRates, SampleCount) {
  /*
  // Get sample rate from first frame
  var CalcSampleRate = SampleRates[0];
	
  // Sum up the sample count of each decoded frame
  var CalcSampleCount = 0;
  for (var i = 0; i < SampleCount.length; i++)
      CalcSampleCount += SampleCount[i];
	
  // Calculate the expected number of samples
  CalcSampleCount = Math.ceil(CalcSampleCount * buffer.sampleRate / CalcSampleRate);
  */

  // Sum up the playback time of each decoded frame
  // Note: Since mp3-Frames overlap by half of their sample-length we expect the
  // first and last frame to be only half as long. Some decoders will still output
  // the full frame length by adding zeros.

  var CalcTotalPlayTime = 0;
  CalcTotalPlayTime += SampleCount[0] / SampleRates[0] / 2.0;
  for (var i = 1; i < (SampleCount.length - 1); i++)
    CalcTotalPlayTime += SampleCount[i] / SampleRates[i];
  CalcTotalPlayTime += SampleCount[SampleCount.length - 1] / SampleRates[SampleCount.length - 1] / 2.0;

  // Calculate the expected number of samples
  var CalcSampleCount = CalcTotalPlayTime * buffer.sampleRate;

  //console.log(CalcTotalPlayTime, buffer.duration);

  var DecoderOffset;

  // Check if we got the expected number of samples
  if (CalcTotalPlayTime > buffer.duration) {
    // We got less samples than expect, we suspect that they were truncated equally at start and end.
    var OffsetTime = (CalcTotalPlayTime - buffer.duration) / 2.0;

    DecoderOffset = Math.ceil(OffsetTime * buffer.sampleRate);
  }
  else if (CalcTotalPlayTime < buffer.duration) {
    // We got more samples than expect, we suspect that zeros were added equally at start and end.
    var OffsetTime = (buffer.duration - CalcTotalPlayTime) / 2.0;

    DecoderOffset = -1.0 * Math.ceil(OffsetTime * buffer.sampleRate);
  }
  else {
    // We got the expected number of samples, no adaption needed
    DecoderOffset = 0;
  }

  // Note:
  // =====
  //	mp3 frames have an overlap of [granule size] so we can't use the first or last [granule size] samples
  // [granule size] is equal to half of a [frame size] in samples (using the mp3's sample rate)

  // Calculate the size and offset of the frame to extract
  //var OffsetRight = Math.ceil(Math.ceil(SampleCount[SampleCount.length - 1] / 2 * buffer.sampleRate / CalcSampleRate) * this._OffsetRightFactor);

  var ExtractTimeSum = 0;

  ExtractTimeSum += SampleCount[SampleCount.length - 1] / SampleRates[SampleCount.length - 1] / 2.0;

  for (var i = 1; i < (this._UseFrames - 1); i++)
    ExtractTimeSum += SampleCount[SampleCount.length - 1 - i] / SampleRates[SampleCount.length - 1 - i];

  ExtractTimeSum += SampleCount[SampleCount.length - this._UseFrames] / SampleRates[SampleCount.length - this._UseFrames] / 2.0

  var ExtractSampleNum = ExtractTimeSum * buffer.sampleRate;

  this._TimeBudget += (ExtractSampleNum - Math.floor(ExtractSampleNum)) / buffer.sampleRate;

  var BudgetSamples = 0;
  if (this._TimeBudget * buffer.sampleRate > 1.0) {
    BudgetSamples = Math.floor(this._TimeBudget * buffer.sampleRate);
    this._TimeBudget -= BudgetSamples / buffer.sampleRate;
  }
  else if (this._TimeBudget * buffer.sampleRate < -1.0) {
    BudgetSamples = -1.0 * Math.floor(Math.abs(this._TimeBudget * buffer.sampleRate));
    this._TimeBudget -= BudgetSamples / buffer.sampleRate;
  }

  ExtractSampleNum = Math.floor(ExtractSampleNum) + BudgetSamples;

  var OffsetRight = 0; //Math.ceil((SampleCount[SampleCount.length - 1] / SampleRates[SampleCount.length - 1] / 2.0) * buffer.sampleRate * this._OffsetRightFactor);

  // Create a buffer that can hold the frame to extract
  var audioBuffer = this._SoundContext.createBuffer(buffer.numberOfChannels, ExtractSampleNum, buffer.sampleRate);

  // Fill buffer with the last part of the decoded frame leave out last granule
  for (var i = 0; i < buffer.numberOfChannels; i++)
    audioBuffer.getChannelData(i).set(buffer.getChannelData(i).subarray(
      buffer.length - OffsetRight + DecoderOffset - ExtractSampleNum,
      buffer.length - OffsetRight + DecoderOffset
    ));

  // Push samples into array

  this._Samples.push(audioBuffer);
  //this._Samples.push(buffer);

  // Callback to tell that data is ready
  this._DataReadyCallback();
};

// Is called in case the decoding of the window fails
AudioFormatReader_MPEG.prototype.__decodeError = function () {
  this._ErrorCallback();
};


// Used to append two Uint8Array (buffer2 comes BEHIND buffer1)
function appendBuffer(buffer1, buffer2) {
  var tmp = new Uint8Array(buffer1.length + buffer2.length);
  tmp.set(buffer1, 0);
  tmp.set(buffer2, buffer1.length);
  return tmp;
}