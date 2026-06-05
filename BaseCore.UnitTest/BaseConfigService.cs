using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using System;
using BaseCore.Common;
using System.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using BaseCore.Repository;
using BaseCore.Repository.Authen;

namespace BaseCore.UnitTest
{
    public class BaseConfigService
    {
        public IOptions<AppSettings> Option;
        public readonly IConfiguration ConfigurationRoot;

        public BaseConfigService()
        {
            var builder = new ConfigurationBuilder()
                .SetBasePath(AppDomain.CurrentDomain.BaseDirectory)
                .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);

            ConfigurationRoot = builder.Build();
            Option = Options.Create(new AppSettings
            {
                Secret = ""
            });

            IServiceCollection service = new ServiceCollection();
            var connectionString = ConfigurationRoot.GetConnectionString("ConnectedDb");
            service.AddDbContext<MySqlDbContext>(options => options.UseSqlServer(connectionString));
            service.AddSingleton<IUserRepository, UserRepository>();
        }
    }
}
