﻿using AutoMapper;
using LivestreamService.Server.Configuration;
using LivestreamService.Server.Streaming;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Moq;
using Ninject.Extensions.Logging;

namespace LivestreamService.Server.Test
{
    [TestClass]
    public class LivestreamsConfigurationTest
    {
        [TestMethod]
        public void GetAvailableStreams_ValidConfig()
        {
            // Arrange
            const string validConfig = "TestResources\\config\\ValidLivestreams.config";
            var mockLogger = new Mock<ILogger>();
            Mapper.Initialize(config => config.AddProfiles(new[] {
                    typeof(AppConfiguration.AutoMapperProfile)
                })
            );

            var livestreamsConfiguration =
                new LivestreamsConfiguration(mockLogger.Object, Mapper.Instance);

            var expectedLivestreamDeutsch = new Livestream
            {
                Id = "deutsch",
                Title = "Deutsch",
                CountryCode = "de",
                Description = "Originalton",
                AudioInput = "Mikrofonarray (Realtek High Definition Audio)",
                StartOnServiceStartup = true
            };

            var expectedLivestreamEnglish = new Livestream
            {
                Id = "english",
                Title = "English",
                CountryCode = "gb",
                Description = "Originalton",
                AudioInput = "Mikrofon (2- USB Audio Device)",
                StartOnServiceStartup = false
            };

            var expectedLivestreams = new Livestreams();
            expectedLivestreams.Streams.Add(expectedLivestreamDeutsch);
            expectedLivestreams.Streams.Add(expectedLivestreamEnglish);

            // Act
            var livestreams = livestreamsConfiguration.GetAvailableStreams(validConfig);

            // Assert
            Assert.IsNotNull(livestreams);
            Assert.AreEqual(expectedLivestreams.Streams.Count, livestreams.Streams.Count);
            Assert.AreEqual(expectedLivestreams.Streams[0].Id, livestreams.Streams[0].Id);
            Assert.AreEqual(expectedLivestreams.Streams[1].Title, livestreams.Streams[1].Title);
        }
    }
}
