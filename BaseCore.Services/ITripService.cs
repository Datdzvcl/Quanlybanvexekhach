using BaseCore.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public interface ITripService
    {
        Task<List<Trip>> GetAllTripsAsync();
        Task<Trip?> GetTripByIdAsync(int id);
        Task<List<Trip>> SearchTripsAsync(string? from, string? to, DateTime? date);
        Task<Trip> CreateTripAsync(Trip trip);
        Task UpdateTripAsync(Trip trip);
        Task DeleteTripAsync(int id);
    }
}