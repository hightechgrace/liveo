﻿using LivestreamService.Server.Streaming;
using Ninject.Modules;

namespace LivestreamService.Service.Configuration
{
    public class NinjectDependencies : NinjectModule
    {
        public override void Load()
        {
            Bind<Startup.LivestreamService>().To<Startup.LivestreamService>();
            Bind<StreamingServer>().To<StreamingServer>().InSingletonScope();
        }
    }
}