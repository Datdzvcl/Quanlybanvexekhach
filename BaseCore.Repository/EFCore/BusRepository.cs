using BaseCore.Entities;

namespace BaseCore.Repository.EFCore
{
    public interface IBusRepositoryEF : IRepository<Bus>
    {
    }

    public class BusRepositoryEF : Repository<Bus>, IBusRepositoryEF
    {
        public BusRepositoryEF(MySqlDbContext context) : base(context)
        {
        }
    }
}