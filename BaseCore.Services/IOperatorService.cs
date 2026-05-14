using BaseCore.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public interface IOperatorService
    {
        Task<List<Operator>> GetAllAsync();
        Task<Operator> GetByIdAsync(int id);
        Task<Operator> CreateAsync(Operator category);
        Task UpdateAsync(Operator category);
        Task DeleteAsync(int id);
    }
}
