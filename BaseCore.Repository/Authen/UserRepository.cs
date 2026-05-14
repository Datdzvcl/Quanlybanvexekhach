using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;

namespace BaseCore.Repository.Authen
{
    public interface IUserRepository
    {
        Task<User?> GetByUsernameAsync(string username);
        Task<User?> GetByLoginIdentifierAsync(string identifier);
        Task<User?> GetByIdAsync(int id);
        Task<bool> EmailExistsAsync(string email, int? exceptUserId = null);
        Task<bool> PhoneExistsAsync(string phone, int? exceptUserId = null);
        Task<List<User>> GetAllAsync();
        Task CreateAsync(User user);
        Task UpdateAsync(User user);
        Task DeleteAsync(int id);
        Task<(List<User> Users, int TotalCount)> SearchAsync(string keyword, int page, int pageSize);
    }

    public class UserRepository : IUserRepository
    {
        private readonly MySqlDbContext _context;

        public UserRepository(MySqlDbContext context)
        {
            _context = context;
        }

        public async Task<User?> GetByUsernameAsync(string username)
        {
            return await _context.Users
                .FirstOrDefaultAsync(u => u.Email == username);
        }

        public async Task<User?> GetByLoginIdentifierAsync(string identifier)
        {
            return await _context.Users
                .FirstOrDefaultAsync(u => u.Email == identifier || u.Phone == identifier);
        }

        public async Task<bool> EmailExistsAsync(string email, int? exceptUserId = null)
        {
            return await _context.Users
                .AnyAsync(u => u.Email == email && (!exceptUserId.HasValue || u.UserID != exceptUserId.Value));
        }

        public async Task<bool> PhoneExistsAsync(string phone, int? exceptUserId = null)
        {
            return await _context.Users
                .AnyAsync(u => u.Phone == phone && (!exceptUserId.HasValue || u.UserID != exceptUserId.Value));
        }

        public async Task<User?> GetByIdAsync(int id)
        {
            return await _context.Users
                .FirstOrDefaultAsync(u => u.UserID == id);
        }

        public async Task<List<User>> GetAllAsync()
        {
            return await _context.Users
                .OrderByDescending(u => u.CreatedAt)
                .ToListAsync();
        }

        public async Task CreateAsync(User user)
        {
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(User user)
        {
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.UserID == id);

            if (user == null)
                return;

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
        }

        public async Task<(List<User> Users, int TotalCount)> SearchAsync(string keyword, int page, int pageSize)
        {
            var query = _context.Users.AsQueryable();

            if (!string.IsNullOrEmpty(keyword))
            {
                var keywordLower = keyword.ToLower();

                query = query.Where(u =>
                    u.FullName.ToLower().Contains(keywordLower) ||
                    u.Email.ToLower().Contains(keywordLower) ||
                    u.Phone.ToLower().Contains(keywordLower) ||
                    (u.Role != null && u.Role.ToLower().Contains(keywordLower)));
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
