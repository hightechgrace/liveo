﻿using NLog;
using System.Collections.Generic;
using System.Linq;
using System.Xml.Serialization;

namespace LivestreamService.Server.Streaming
{
    public class LiveStream
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string CountryCode { get; set; }
        public string AudioInput { get; set; }
        public bool StartOnServiceStartup { get; set; }

        [XmlIgnore]
        public string Ip { get; set; }

        [XmlIgnore]
        public bool IsStarted { get; private set; }

        [XmlIgnore]
        public bool HasValidAudioInput { get; private set; }

        [XmlIgnore]
        public bool IsInitialized { get; private set; }

        [XmlIgnore]
        private StreamingServerProcess _streamingServerProcess;

        [XmlIgnore]
        private ILogger _logger;

        public void Validate(List<AudioInput> validAudioInputs)
        {
            if (validAudioInputs.Any(i => i.Id == AudioInput))
                HasValidAudioInput = true;
        }

        public void Initialize()
        {
            _logger = LogManager.GetCurrentClassLogger();

            if (!HasValidAudioInput)
            {
                _logger.Warn($"Livestream \"{Id}\" has no valid audio input.");
                return;
            }

            // ToDo: Adapt StreamingServerProcess
            _streamingServerProcess = new StreamingServerProcess(AudioInput, null);
            IsInitialized = true;

            _logger.Info($"Initialized livestream \"{Id}\"");
        }

        public void Start()
        {
            if (!IsInitialized)
                return;


            _streamingServerProcess.Start();
            IsStarted = true;

            _logger.Info($"Started livestream {Id}");
        }

        public void Stop()
        {
            if (!IsStarted)
                return;

            _streamingServerProcess.Stop();
            IsStarted = false;

            _logger.Info($"Stopped livestream {Id}");
        }
    }
}
