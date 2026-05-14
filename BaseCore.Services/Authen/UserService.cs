using BaseCore.Common;
using BaseCore.Entities;
using BaseCore.Repository.Authen;

namespace BaseCore.Services.Authen
{
    public interface IUserService
    {
        Task<User?> Authenticate(string loginIdentifier, string password);
        Task<List<User>> GetAll();
        Task<User?> GetById(int id);
        Task<User> Create(User user, string password);
        Task Update(User user, string? password = null);
        Task Delete(int id);
        Task<(List<User> Users, int TotalCount)> Search(string keyword, int page, int pageSize);
    }

    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;

        public UserService(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public async Task<User?> Authenticate(string loginIdentifier, string password)
        {
            if (string.IsNullOrWhiteSpace(loginIdentifier) || string.IsNullOrWhiteSpace(password))
                return null;

            var user = await _userRepository.GetByLoginIdentifierAsync(loginIdentifier.Trim());

            if (user == null)
                return null;

            if (!TokenHelper.VerifyPasswordHash(password, user.PasswordHash))
                return null;

            return user;
        }

        public async Task<List<User>> GetAll()
        {
            return await _userRepository.GetAllAsync();
        }

        public async Task<User?> GetById(int id)
        {
            return await _userRepository.GetByIdAsync(id);
        }

        public async Task<User> Create(User user, string password)
        {
            if (string.IsNullOrWhiteSpace(user.Email))
                throw new InvalidOperationException("Email is required");

            if (string.IsNullOrWhiteSpace(user.Phone))
                throw new InvalidOperationException("Phone is required");

            if (await _userRepository.EmailExistsAsync(user.Email))
                throw new InvalidOperationException("Email already exists");

            if (await _userRepository.PhoneExistsAsync(user.Phone))
                throw new InvalidOperationException("Phone already exists");

            user.Email = user.Email.Trim();
            user.Phone = user.Phone.Trim();
            user.FullName = string.IsNullOrWhiteSpace(user.FullName) ? user.Email : user.FullName.Trim();
            user.Role = string.IsNullOrWhiteSpace(user.Role) ? RoleConstant.Customer : user.Role;
            user.PasswordHash = TokenHelper.CreatePasswordHash(password);
            user.CreatedAt ??= DateTime.Now;

            await _userRepository.CreateAsync(user);
            return user;
        }

        public async Task Update(User user, string? password = null)
        {
            if (await _userRepository.EmailExistsAsync(user.Email, user.UserID))
                throw new InvalidOperationException("Email already exists");

            if (await _userRepository.PhoneExistsAsync(user.Phone, user.UserID))
                throw new InvalidOperationException("Phone already exists");

            if (!string.IsNullOrEmpty(password))
            {
                user.PasswordHash = TokenHelper.CreatePasswordHash(password);
            }

            await _userRepository.UpdateAsync(user);
        }

        public async Task Delete(int id)
        {
            await _userRepository.DeleteAsync(id);
        }

        public async Task<(List<User> Users, int TotalCount)> Search(string keyword, int page, int pageSize)
        {
            return await _userRepository.SearchAsync(keyword, page, pageSize);
        }
    }
}
