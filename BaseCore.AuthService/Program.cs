using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using BaseCore.Repository;
using BaseCore.Repository.Authen;
using BaseCore.Services.Authen;
using BaseCore.Common;
using BaseCore.Entities;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });
builder.Services.AddEndpointsApiExplorer();

// CORS Configuration
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "BaseCore Auth Service API",
        Version = "v1",
        Description = "Authentication Microservice - Login, Register, User Management (Bài 10, 11)"
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
                Reference = new OpenApiReference
                {
                    Type=ReferenceType.SecurityScheme,
                    Id="Bearer"
                }
            },
            new string[]{}
        }
    });
});

// SQL Server Configuration
builder.Services.AddDbContext<MySqlDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("ConnectedDb"));
});

// DI for Authentication Services and Repositories only
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();

// JWT Authentication Key
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
        ValidateAudience = false,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole(RoleConstant.Admin));
    options.AddPolicy("CustomerOnly", policy => policy.RequireRole(RoleConstant.Customer));
    options.AddPolicy("OperatorOnly", policy => policy.RequireRole(RoleConstant.Operator));
});

var app = builder.Build();

// Ensure database exists and seed default admin account
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<MySqlDbContext>();
    //dbContext.Database.EnsureCreated();

    var existingAdmin = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == "admin@robotvibot.com");
    if (existingAdmin == null)
    {
        await dbContext.Users.AddAsync(new User
        {
            FullName = "Administrator",
            Email = "admin@robotvibot.com",
            Phone = "0123456789",
            PasswordHash = TokenHelper.CreatePasswordHash("admin123"),
            Role = RoleConstant.Admin,
            CreatedAt = DateTime.Now
        });

        await dbContext.SaveChangesAsync();
    }
    else if (!TokenHelper.VerifyPasswordHash("admin123", existingAdmin.PasswordHash))
    {
        existingAdmin.PasswordHash = TokenHelper.CreatePasswordHash("admin123");
        existingAdmin.Role = RoleConstant.Admin;
        await dbContext.SaveChangesAsync();
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

Console.WriteLine("BaseCore Auth Service running on port 5002");
Console.WriteLine("Endpoints: /api/auth, /api/users, /api/roles");
app.Run();
