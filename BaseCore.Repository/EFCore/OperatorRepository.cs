using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public interface IOperatorRepositoryEF : IRepository<Operator>
    {
        Task<Operator?> GetByNameAsync(string name);
    }

    public class OperatorRepositoryEF : Repository<Operator>, IOperatorRepositoryEF
    {
        public OperatorRepositoryEF(MySqlDbContext context) : base(context)
        {
        }

        public async Task<Operator?> GetByNameAsync(string name)
        {
            return await _dbSet
                .FirstOrDefaultAsync(o => o.Name.ToLower() == name.ToLower());
        }
    }
}