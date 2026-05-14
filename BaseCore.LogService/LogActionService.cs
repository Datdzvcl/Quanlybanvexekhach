using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BaseCore.LogService.Entities;

namespace BaseCore.LogService
{
    public interface ILogActionService
    {
        Task<ICollection<LogAction>> GetAllListAsync();

        Task CreateLog(LogAction logAction);
    }

    public class LogActionService : ILogActionService
    {
        private static readonly List<LogAction> Logs = new();
        private static readonly object SyncRoot = new();

        public async Task<ICollection<LogAction>> GetAllListAsync()
        {
            List<LogAction> snapshot;
            lock (SyncRoot)
            {
                snapshot = Logs
                    .OrderByDescending(x => x.CreatedDateTime)
                    .ToList();
            }

            return await Task.FromResult(snapshot);
        }

        public async Task CreateLog(LogAction logAction)
        {
            if (logAction == null)
            {
                return;
            }

            if (string.IsNullOrWhiteSpace(logAction.Id))
            {
                logAction.Id = Guid.NewGuid().ToString();
            }

            logAction.CreatedDateTime = DateTime.UtcNow;
            lock (SyncRoot)
            {
                Logs.Add(logAction);
            }

            await Task.CompletedTask;
        }
    }
}
