using Ocelot.DependencyInjection;
using Ocelot.Middleware;

var builder = WebApplication.CreateBuilder(args);

// Add Ocelot configuration
builder.Configuration.AddJsonFile("ocelot.json", optional: false, reloadOnChange: true);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Add Ocelot
builder.Services.AddOcelot();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");

// Ocelot must be last
await app.UseOcelot();

Console.WriteLine(@"
╔══════════════════════════════════════════════════════════════╗
║              VeXeAZ API Gateway                              ║
║══════════════════════════════════════════════════════════════║
║  Gateway:        http://localhost:5000                       ║
║  Auth Service:   http://localhost:5002                       ║
║  Booking API:    http://localhost:5001                       ║
║  Routes: trips, bookings, tickets, buses, operators          ║
╚══════════════════════════════════════════════════════════════╝
");

app.Run();
