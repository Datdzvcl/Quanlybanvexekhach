using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using BaseCore.Repository;
using BaseCore.Repository.EFCore;
using BaseCore.APIService.Services;
using System.Text;
using BaseCore.Services;
var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

builder.Services.AddEndpointsApiExplorer();

// Swagger Configuration
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "VeXeAZ API Service",
        Version = "v1",
        Description = "VeXeAZ Bus Ticket Booking System - Trips, Bookings, Tickets, Buses, Operators, Users"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter JWT token",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

//MySQL Configuration with EF Core
//var connectionString = builder.Configuration.GetConnectionString("MySQL")
//    ?? "Server=localhost;Database=BaseCoreSales;User=root;Password=;";
//builder.Services.AddDbContext<MySqlDbContext>(options =>
//    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));



builder.Services.AddDbContext<MySqlDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("ConnectedDb"));
});


// Repository Registration - Trips, Bookings, Tickets, Buses, Operators
builder.Services.AddScoped<ITripRepositoryEF, TripRepositoryEF>();
builder.Services.AddScoped<IOperatorRepositoryEF, OperatorRepositoryEF>();
builder.Services.AddScoped<IBookingRepositoryEF, BookingRepositoryEF>();
builder.Services.AddScoped<ITicketSeatRepositoryEF, TicketSeatRepositoryEF>();
builder.Services.AddScoped<IBusRepositoryEF, BusRepositoryEF>();
builder.Services.AddScoped<BaseCore.Services.BookingService>();
// Background job: tự động xóa booking Pending quá 10 phút
builder.Services.AddHostedService<ExpiredBookingCleanupService>();
builder.Services.AddHostedService<ExpiredSeatHoldCleanupService>();
builder.Services.AddHostedService<TripCompletionService>();
builder.Services.AddHostedService<TripMonitorService>();
// JWT Authentication
var key = Encoding.ASCII.GetBytes(builder.Configuration["Jwt:SecretKey"] ?? "YourSecretKeyForAuthenticationShouldBeLongEnough");
builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(x =>
{
    x.RequireHttpsMetadata = false;
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false
    };
});

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

// Auto migrate database
//using (var scope = app.Services.CreateScope())
//{
//    var db = scope.ServiceProvider.GetRequiredService<MySqlDbContext>();
//    db.Database.EnsureCreated();
//}

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

Console.WriteLine("VeXeAZ API Service running on port 5001");
Console.WriteLine("Endpoints: /api/trips, /api/bookings, /api/seats, /api/buses, /api/operators, /api/admin");
app.Run();
