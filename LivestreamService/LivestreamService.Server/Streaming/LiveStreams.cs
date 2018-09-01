﻿using System.Collections.Generic;
using System.Linq;

namespace LivestreamService.Server.Streaming
{
    public class Livestreams
    {
        public List<Livestream> Streams = new List<Livestream>();

        public List<Livestream> GetStartedStreams()
        {
            return Streams.Where(ls => ls.IsStarted).ToList();
        }

        public List<Livestream> GetAvailableStreams()
        {
            return Streams;
        }

        public void Validate(List<AudioInput> validAudioInputs)
        {
            foreach (var stream in Streams)
            {
                stream.Validate(validAudioInputs);
            }
        }

        public void Initialize()
        {
            foreach (var stream in Streams)
            {
                stream.Initialize();
            }
        }

        public void StartStreams()
        {
            foreach (var stream in Streams.Where(ls => ls.StartOnServiceStartup))
            {
                stream.Start();
            }
        }

        public void StartStream(string id)
        {
            Streams.First(s => s.Id == id).Start();
        }


        public void StopStreams()
        {
            foreach (var stream in Streams)
            {
                stream.Stop();
            }
        }

        public void StopStream(string id)
        {
            Streams.First(s => s.Id == id).Stop();
        }


        public void SetIpAdress(string ipAdress)
        {
            foreach (var stream in Streams)
            {
                stream.Ip = ipAdress;
            }
        }
    }
}
