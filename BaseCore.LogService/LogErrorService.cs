using Microsoft.AspNetCore.Http;
using BaseCore.LogService.Entities;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;

namespace BaseCore.LogService
{
    public interface ILogErrorService
    {
        Task<ICollection<LogError>> GetAllListAsync();
        Task CreateAsync(LogError logError);
        Task CreateLog(HttpContext httpContext, string message);
    }

    public class LogErrorService : ILogErrorService
    {
        private static readonly List<LogError> Logs = new();
        private static readonly object SyncRoot = new();

        public async Task CreateLog(HttpContext httpContext, string message)
        {
            var requestBody = string.Empty;
            httpContext.Request.EnableBuffering();
            using (var reader = new StreamReader(httpContext.Request.Body))
            {
                requestBody = reader.ReadToEnd();
                httpContext.Request.Body.Seek(0, SeekOrigin.Begin);
                requestBody = reader.ReadToEnd();
            }

            var pathUrl = string.Format("{0}://{1}{2}", httpContext.Request.Scheme, httpContext.Request.Host, httpContext.Request.Path);
            var logError = new LogError
            {
                Header = $"REQUEST HttpMethod: {httpContext.Request.Method}, Path: {pathUrl}, Content-Type: {httpContext.Request.ContentType}",
                Body = requestBody,
                CreatedUser = httpContext.User.Identity.Name, 
                Message = message
            };

            if (string.IsNullOrWhiteSpace(logError.Id))
            {
                logError.Id = Guid.NewGuid().ToString();
            }

            logError.CreatedDateTime = DateTime.UtcNow;
            lock (SyncRoot)
            {
                Logs.Add(logError);
            }

            await Task.CompletedTask;
        }

        public async Task CreateAsync(LogError logError)
        {
            if (logError == null)
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(logError.Id))
            {
                logError.Id = Guid.NewGuid().ToString();
            }

            logError.CreatedDateTime = DateTime.UtcNow;
            lock (SyncRoot)
            {
                Logs.Add(logError);
            }

            await Task.CompletedTask;
        }

        public async Task<ICollection<LogError>> GetAllListAsync()
        {
            List<LogError> snapshot;
            lock (SyncRoot)
            {
                snapshot = Logs
                    .OrderByDescending(x => x.CreatedDateTime)
                    .ToList();
            }

            return await Task.FromResult(snapshot);
        }
    }
}
