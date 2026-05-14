using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public interface IUserRepositoryEF : IRepository<User>
    {
        Task<User?> GetByUsernameAsync(string username);
        Task<(List<User> Users, int TotalCount)> SearchAsync(string? keyword, int page, int pageSize);
    }

    public class UserRepositoryEF : Repository<User>, IUserRepositoryEF
    {
        public UserRepositoryEF(MySqlDbContext context) : base(context)
        {
        }

        public async Task<User?> GetByUsernameAsync(string username)
        {
            return await _dbSet
                .FirstOrDefaultAsync(u => u.Email == username);
        }

        public async Task<(List<User> Users, int TotalCount)> SearchAsync(string? keyword, int page, int pageSize)
        {
            var query = _dbSet.AsQueryable();

            if (!string.IsNullOrEmpty(keyword))
            {
                keyword = keyword.ToLower();

                query = query.Where(u =>
                    u.FullName.ToLower().Contains(keyword) ||
                    u.Email.ToLower().Contains(keyword) ||
                    u.Phone.ToLower().Contains(keyword) ||
                    (u.Role != null && u.Role.ToLower().Contains(keyword)));
            }

            var totalCount = await query.CountAsync();

            var users = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (users, totalCount);
        }
    }
}