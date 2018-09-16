﻿using System.Collections.Generic;

namespace LivestreamApp.Server.Streaming.Environment
{
    public interface IAudioHardware
    {
        List<AudioInput> GetAudioInputs();
    }
}