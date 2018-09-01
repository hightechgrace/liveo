﻿using LivestreamService.Server.Entities;
using LivestreamService.Server.Streaming;
using LivestreamService.Server.Utilities;
using NLog;
using System;
using System.IO;

namespace LivestreamService.Server.Configuration
{
    public class LiveStreamsConfiguration
    {
        private readonly ILogger _logger;
        private const string LiveStreamsConfig = "LiveStreams.config";

        public LiveStreamsConfiguration()
        {
            _logger = LogManager.GetCurrentClassLogger();
        }

        public LiveStreams GetAvailableStreams()
        {
            ValidateConfigFileExistance();

            var liveStreams = DeserializeLiveStreams();

            return liveStreams;
        }

        private LiveStreams DeserializeLiveStreams()
        {
            var liveStreamsType = XmlUtilities.ReadFromFile<LiveStreamsType>(LiveStreamsConfig);
            return null;
        }

        private void ValidateConfigFileExistance()
        {
            if (LiveStreamsConfig == null)
                throw new ArgumentException("The LiveStreams.xsd could not be found.");

            if (!File.Exists(LiveStreamsConfig))
                throw new ArgumentException("The LiveStreams.xsd could not be found.");

            _logger.Info($"{LiveStreamsConfig} exist.");
        }
    }
}
