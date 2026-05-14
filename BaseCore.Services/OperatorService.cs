using Microsoft.EntityFrameworkCore;
using BaseCore.Entities;
using BaseCore.Repository;

namespace BaseCore.Services
{
    public class OperatorService : IOperatorService
    {
        private readonly MySqlDbContext _context;

        public OperatorService(MySqlDbContext context)
        {
            _context = context;
        }

        public async Task<List<Operator>> GetAllAsync()
        {
            return await _context.Operators.ToListAsync();
        }

        public async Task<Operator?> GetByIdAsync(int id)
        {
            return await _context.Operators
                .FirstOrDefaultAsync(o => o.OperatorID == id);
        }

        public async Task<Operator> CreateAsync(Operator operatorEntity)
        {
            await _context.Operators.AddAsync(operatorEntity);
            await _context.SaveChangesAsync();
            return operatorEntity;
        }

        public async Task UpdateAsync(Operator operatorEntity)
        {
            _context.Operators.Update(operatorEntity);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int id)
        {
            var operatorEntity = await _context.Operators
                .FirstOrDefaultAsync(o => o.OperatorID == id);

            if (operatorEntity == null)
                return;

            _context.Operators.Remove(operatorEntity);
            await _context.SaveChangesAsync();
        }
    }
}