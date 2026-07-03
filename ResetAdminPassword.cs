// Run with: dotnet script ResetAdminPassword.cs
// OR: create a temp .NET console app and paste this in Program.cs

using Microsoft.AspNetCore.Identity;
using RNVS.ECommerce.Domain.Entities.User;

var hasher = new PasswordHasher<ApplicationUser>();
var user = new ApplicationUser();

// Change this to whatever new password you want
string newPassword = "Admin@1234";

string hash = hasher.HashPassword(user, newPassword);
Console.WriteLine("New password hash:");
Console.WriteLine(hash);
Console.WriteLine();
Console.WriteLine("Run this SQL in pgAdmin:");
Console.WriteLine($"""
UPDATE public."AspNetUsers"
SET "PasswordHash" = '{hash}'
WHERE "Email" = 'rinkeeverma23@gmail.com';
""");
