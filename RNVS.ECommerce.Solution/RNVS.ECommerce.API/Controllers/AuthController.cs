using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.User;
using RNVS.ECommerce.Domain.Entities.User;
using RNVS.ECommerce.Domain.Entities.Platform;
using RNVS.ECommerce.Domain.Enums;
using RNVS.ECommerce.Infrastructure.Data;
using RNVS.ECommerce.Infrastructure.Security;
using RNVS.ECommerce.Infrastructure.SMS;
using RNVS.ECommerce.Infrastructure.Email;
using System.Security.Claims;
using IVendorDbProvisioning = RNVS.ECommerce.Application.Interfaces.Services.IVendorDatabaseProvisioningService;

namespace RNVS.ECommerce.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly JwtTokenService _jwtTokenService;
        private readonly ISmsService _smsService;
        private readonly IEmailService _emailService;
        private readonly ILogger<AuthController> _logger;
        private readonly ApplicationDbContext _db;
        private readonly VendorDbContext _vendorDb;
        private readonly IPasswordHasher<Employee> _employeeHasher;
        private readonly IConfiguration _configuration;
        private readonly IVendorDbProvisioning _dbProvisioning;

        public AuthController(
            UserManager<ApplicationUser> userManager,
            SignInManager<ApplicationUser> signInManager,
            JwtTokenService jwtTokenService,
            ISmsService smsService,
            IEmailService emailService,
            ILogger<AuthController> logger,
            ApplicationDbContext db,
            VendorDbContext vendorDb,
            IPasswordHasher<Employee> employeeHasher,
            IConfiguration configuration,
            IVendorDbProvisioning dbProvisioning)
        {
            _userManager = userManager;
            _signInManager = signInManager;
            _jwtTokenService = jwtTokenService;
            _smsService = smsService;
            _emailService = emailService;
            _logger = logger;
            _db = db;
            _vendorDb = vendorDb;
            _employeeHasher = employeeHasher;
            _configuration = configuration;
            _dbProvisioning = dbProvisioning;
        }

        // ── POST /api/auth/employee-login ────────────────────────────────────────
        /// <summary>
        /// Authenticates a vendor employee without touching AspNetUsers.
        /// Flow: email → find employee directly in vendor DB
        ///       → verify password against Employee.PasswordHash
        ///       → issue JWT with (EmployeeId, VendorId, Designation) claims.
        /// </summary>
        [HttpPost("employee-login")]
        [AllowAnonymous]
        public async Task<IActionResult> EmployeeLogin([FromBody] EmployeeLoginDto model)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new { success = false, message = "Invalid input" });

                var email = model.Email.ToLower().Trim();

                // Find employee directly in vendor DB by email
                var employee = await _vendorDb.Employees
                    .Where(e => e.Email == email && e.IsActive)
                    .FirstOrDefaultAsync();

                if (employee == null)
                    return Unauthorized(new { success = false, message = "Invalid email or password." });

                // Step 3: Verify password against vendor DB hash
                var verifyResult = _employeeHasher.VerifyHashedPassword(employee, employee.PasswordHash, model.Password);
                if (verifyResult == PasswordVerificationResult.Failed)
                    return Unauthorized(new { success = false, message = "Invalid email or password." });

                // Step 4: Issue JWT — NameIdentifier = employee.Id, plus vendorid + designation claims
                var extraClaims = new List<Claim>
                {
                    new Claim("vendorid", employee.VendorId),
                    new Claim("designation", employee.Designation),
                };

                var tokenResult = _jwtTokenService.GenerateToken(
                    userId: employee.Id.ToString(),
                    email: employee.Email,
                    roles: new List<string> { ((int)UserRole.Employee).ToString() },
                    extraClaims: extraClaims
                );

                if (!tokenResult.Success)
                    return StatusCode(500, new { success = false, message = "Failed to generate token" });

                _logger.LogInformation("Employee login: {EmployeeId} for vendor {VendorId}", employee.Id, employee.VendorId);

                return Ok(new
                {
                    success = true,
                    token = tokenResult.Token,
                    refreshToken = tokenResult.RefreshToken,
                    expiresAt = tokenResult.ExpiresAt,
                    user = new
                    {
                        id = employee.Id.ToString(),
                        firstName = employee.FirstName,
                        lastName = employee.LastName,
                        email = employee.Email,
                        role = (int)UserRole.Employee,
                        designation = employee.Designation,
                        vendorId = employee.VendorId
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during employee login");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] UserRegistrationDto model)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new { success = false, message = "Invalid input", errors = ModelState });
                }

                var existingUser = await _userManager.FindByEmailAsync(model.Email);
                if (existingUser != null)
                {
                    return BadRequest(new { success = false, message = "Email already registered" });
                }

                var user = new ApplicationUser
                {
                    UserName = model.Email,
                    Email = model.Email,
                    FirstName = model.FirstName,
                    LastName = model.LastName,
                    PhoneNumber = model.PhoneNumber,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true,
                    Role = model.Role,
                    IsVendor = model.Role == Domain.Enums.UserRole.Vendor,
                    IsVendorApproved = false // Vendors need approval
                };

                var result = await _userManager.CreateAsync(user, model.Password);

                if (!result.Succeeded)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Registration failed",
                        errors = result.Errors.Select(e => e.Description)
                    });
                }

                // Auto-create TenantRegistration and provision dedicated DB for vendor signups
                if (model.Role == UserRole.Vendor)
                {
                    var tenant = new TenantRegistration
                    {
                        VendorId = user.Id,
                        StoreName = model.StoreName ?? $"{user.FirstName}'s Store",
                        ContactEmail = user.Email!,
                        ContactPhone = user.PhoneNumber,
                        Plan = PlanTier.Basic,
                        Status = TenantStatus.Trial,
                        StoragePrefix = $"vendor-{user.Id}/",
                        SubscriptionStartDate = DateTime.UtcNow,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                        UdyamCertificateNumber = model.UdyamCertificateNumber,
                        CompanyPanNumber = model.CompanyPanNumber,
                        GstNumber = model.GstNumber,
                    };
                    _db.TenantRegistrations.Add(tenant);
                    await _db.SaveChangesAsync();
                    _logger.LogInformation("TenantRegistration created for vendor {Email}", user.Email);

                    // Provision a dedicated database for this vendor automatically.
                    // Creates the PostgreSQL database and applies all VendorDbContext migrations.
                    try
                    {
                        var connStr = await _dbProvisioning.ProvisionAsync(user.Id, model.StoreName);
                        tenant.RailwayDatabaseUrl = connStr;
                        tenant.UpdatedAt = DateTime.UtcNow;
                        await _db.SaveChangesAsync();
                        _logger.LogInformation(
                            "Dedicated database provisioned for vendor {Email}: {ConnStr}",
                            user.Email, connStr[..Math.Min(60, connStr.Length)]);

                        // Write CompanyProfile into the vendor's own database so business
                        // verification details are available locally for invoicing and reports.
                        try
                        {
                            var vendorDbOpts = new DbContextOptionsBuilder<VendorDbContext>()
                                .UseNpgsql(connStr)
                                .Options;
                            await using var vendorCtx = new VendorDbContext(vendorDbOpts);
                            vendorCtx.CompanyProfiles.Add(new CompanyProfile
                            {
                                CompanyName = model.StoreName ?? $"{user.FirstName}'s Store",
                                UserId = user.Id,
                                VendorId = user.Id,
                                FirstName = user.FirstName,
                                LastName = user.LastName,
                                PhoneNumber = user.PhoneNumber,
                                UdyamCertificateNumber = model.UdyamCertificateNumber,
                                CompanyPanNumber = model.CompanyPanNumber,
                                GstNumber = model.GstNumber,
                                CreatedAt = DateTime.UtcNow,
                            });
                            await vendorCtx.SaveChangesAsync();
                            _logger.LogInformation("CompanyProfile written to vendor DB for {Email}", user.Email);
                        }
                        catch (Exception cpEx)
                        {
                            _logger.LogWarning(cpEx, "CompanyProfile insert failed for vendor {Email} — non-fatal", user.Email);
                        }
                    }
                    catch (Exception dbEx)
                    {
                        _logger.LogError(dbEx,
                            "Database provisioning failed for vendor {Email} — vendor registered but uses shared DB",
                            user.Email);
                    }
                }

                // Send welcome email — vendor gets a dedicated seller email, customers get the generic one
                try
                {
                    if (user.Role == UserRole.Vendor)
                    {
                        var storeName = model.StoreName ?? $"{user.FirstName}'s Store";
                        await _emailService.SendTemplateEmailAsync(
                            user.Email!,
                            $"Your seller account for {storeName} is ready — RNVS CommerceX",
                            "VendorWelcome",
                            new Dictionary<string, string>
                            {
                                { "VendorName", $"{user.FirstName} {user.LastName}" },
                                { "StoreName", storeName },
                                { "VendorEmail", user.Email! },
                                { "RegistrationDate", DateTime.UtcNow.ToString("dd MMM yyyy") },
                                { "DashboardUrl", "http://localhost:3000/vendor/dashboard" },
                                { "SupportEmail", "support@rnvscommercex.com" },
                            });
                    }
                    else
                    {
                        await _emailService.SendTemplateEmailAsync(
                            user.Email!,
                            "Welcome to RNVS CommerceX!",
                            "WelcomeEmail",
                            new Dictionary<string, string>
                            {
                                { "CustomerName", $"{user.FirstName} {user.LastName}" },
                                { "UserEmail", user.Email! },
                                { "AccountType", user.Role.ToString() },
                                { "RegistrationDate", DateTime.UtcNow.ToString("dd MMM yyyy") },
                                { "ShopUrl", "http://localhost:3000" },
                                { "SupportUrl", "http://localhost:3000/support" },
                            });
                    }
                }
                catch (Exception emailEx)
                {
                    _logger.LogWarning(emailEx, "Welcome email failed for {Email} — registration still succeeded", user.Email);
                }

                // Generate JWT token
                var roles = new List<string> { user.Role.ToString() };
                var token = _jwtTokenService.GenerateToken(user.Id, user.Email, roles);

                var userProfile = new UserProfileDto
                {
                    Id = user.Id,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Email = user.Email,
                    PhoneNumber = user.PhoneNumber,
                    IsVendor = user.IsVendor,
                    IsVendorApproved = user.IsVendorApproved,
                    Role = user.Role,
                    CreatedAt = user.CreatedAt.ToString("O")
                };

                return Ok(new
                {
                    success = true,
                    token = token.Token,
                    refreshToken = token.RefreshToken,
                    user = userProfile,
                    message = "Registration successful"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during registration");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] UserLoginDto model)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(new { success = false, message = "Invalid input" });
                }

                var user = await _userManager.FindByEmailAsync(model.Email);
                if (user == null)
                {
                    return Unauthorized(new { success = false, message = "Invalid email or password" });
                }

                if (!user.IsActive)
                {
                    return Unauthorized(new { success = false, message = "Account is deactivated" });
                }

                var result = await _signInManager.CheckPasswordSignInAsync(user, model.Password, false);
                if (!result.Succeeded)
                {
                    return Unauthorized(new { success = false, message = "Invalid email or password" });
                }

                // Password is correct, but if 2FA is enabled, stop short of issuing a real token —
                // hand back a short-lived pending token instead. The frontend must call
                // /api/twofactor/verify-login with the authenticator code to get the real token.
                if (user.TwoFactorEnabled && !string.IsNullOrEmpty(user.TwoFactorSecretKey))
                {
                    var pendingToken = _jwtTokenService.GeneratePendingTwoFactorToken(user.Id);
                    return Ok(new
                    {
                        success = true,
                        requiresTwoFactor = true,
                        pendingToken,
                        message = "Enter your two-factor authentication code"
                    });
                }

                // Generate JWT token
                var roles = new List<string> { user.Role.ToString() };
                var token = _jwtTokenService.GenerateToken(user.Id, user.Email, roles);

                var userProfile = new UserProfileDto
                {
                    Id = user.Id,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Email = user.Email,
                    PhoneNumber = user.PhoneNumber,
                    IsVendor = user.IsVendor,
                    IsVendorApproved = user.IsVendorApproved,
                    Role = user.Role,
                    CreatedAt = user.CreatedAt.ToString("O")
                };

                return Ok(new
                {
                    success = true,
                    token = token.Token,
                    refreshToken = token.RefreshToken,
                    user = userProfile,
                    message = "Login successful"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during login");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpPost("logout")]
        [Authorize]
        public async Task<IActionResult> Logout()
        {
            await _signInManager.SignOutAsync();
            return Ok(new { success = true, message = "Logout successful" });
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<IActionResult> GetCurrentUser()
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userId))
                {
                    return Unauthorized(new { success = false, message = "User not authenticated" });
                }

                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                var userProfile = new UserProfileDto
                {
                    Id = user.Id,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Email = user.Email,
                    PhoneNumber = user.PhoneNumber,
                    IsVendor = user.IsVendor,
                    IsVendorApproved = user.IsVendorApproved,
                    Role = user.Role,
                    CreatedAt = user.CreatedAt.ToString("O")
                };

                return Ok(userProfile);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting current user");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpPost("refresh-token")]
        public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
        {
            try
            {
                var principal = _jwtTokenService.GetPrincipalFromExpiredToken(request.Token);
                if (principal == null)
                {
                    return Unauthorized(new { success = false, message = "Invalid token" });
                }

                var userId = principal.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var user = await _userManager.FindByIdAsync(userId);

                if (user == null)
                {
                    return Unauthorized(new { success = false, message = "User not found" });
                }

                var roles = await _userManager.GetRolesAsync(user);
                var newToken = _jwtTokenService.GenerateToken(user.Id, user.Email, roles.ToList());

                return Ok(new
                {
                    success = true,
                    token = newToken.Token,
                    message = "Token refreshed"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing token");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            try
            {
                var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                var user = await _userManager.FindByIdAsync(userId);

                if (user == null)
                {
                    return NotFound(new { success = false, message = "User not found" });
                }

                var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);

                if (!result.Succeeded)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Failed to change password",
                        errors = result.Errors.Select(e => e.Description)
                    });
                }

                return Ok(new { success = true, message = "Password changed successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing password");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            try
            {
                var user = await _userManager.FindByEmailAsync(request.Email);
                if (user == null)
                {
                    // Don't reveal that the user doesn't exist
                    return Ok(new { success = true, message = "If the email exists, a reset link has been sent" });
                }

                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                var encodedToken = Uri.EscapeDataString(token);
                var encodedEmail = Uri.EscapeDataString(user.Email!);
                var frontendUrl = _configuration["FrontendUrl"] ?? "http://localhost:3000";
                var resetLink = $"{frontendUrl}/reset-password?token={encodedToken}&email={encodedEmail}";

                var emailBody = $"""
                    <p>Hi {user.UserName},</p>
                    <p>You requested a password reset. Click the link below to set a new password:</p>
                    <p><a href="{resetLink}">Reset Password</a></p>
                    <p>This link is valid for 24 hours. If you did not request this, ignore this email.</p>
                    """;

                await _emailService.SendEmailAsync(user.Email!, "Reset your password", emailBody);

                return Ok(new { success = true, message = "If the email exists, a reset link has been sent" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in forgot password");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            try
            {
                var user = await _userManager.FindByEmailAsync(request.Email);
                if (user == null)
                {
                    return BadRequest(new { success = false, message = "Invalid request" });
                }

                var result = await _userManager.ResetPasswordAsync(user, request.Token, request.NewPassword);

                if (!result.Succeeded)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Failed to reset password",
                        errors = result.Errors.Select(e => e.Description)
                    });
                }

                return Ok(new { success = true, message = "Password reset successful" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resetting password");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // Phone OTP Verification Endpoints
        [HttpPost("send-phone-otp")]
        public async Task<IActionResult> SendPhoneOtp([FromBody] SendOtpRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.PhoneNumber))
                {
                    return BadRequest(new { success = false, message = "Phone number is required" });
                }

                var otp = await _smsService.GenerateOtpAsync(request.PhoneNumber);

                _logger.LogInformation($"OTP sent to {request.PhoneNumber}");

                return Ok(new
                {
                    success = true,
                    message = "OTP sent successfully"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending OTP");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpPost("verify-phone-otp")]
        public async Task<IActionResult> VerifyPhoneOtp([FromBody] VerifyOtpRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.PhoneNumber) || string.IsNullOrEmpty(request.Otp))
                {
                    return BadRequest(new { success = false, message = "Phone number and OTP are required" });
                }

                var isValid = await _smsService.VerifyOtpAsync(request.PhoneNumber, request.Otp);

                if (!isValid)
                {
                    return BadRequest(new { success = false, message = "Invalid or expired OTP" });
                }

                return Ok(new { success = true, message = "Phone number verified successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying OTP");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // Email Verification Endpoints
        [HttpPost("send-email-verification")]
        public async Task<IActionResult> SendEmailVerification([FromBody] SendEmailVerificationRequest request)
        {
            try
            {
                var user = await _userManager.FindByEmailAsync(request.Email);
                if (user == null)
                {
                    // Don't reveal that the user doesn't exist
                    return Ok(new { success = true, message = "If the email exists, a verification link has been sent" });
                }

                if (user.EmailConfirmed)
                {
                    return BadRequest(new { success = false, message = "Email is already verified" });
                }

                var token = await _userManager.GenerateEmailConfirmationTokenAsync(user);

                // TODO: Create proper email verification link
                var verificationLink = $"{Request.Scheme}://{Request.Host}/api/auth/verify-email?userId={user.Id}&token={Uri.EscapeDataString(token)}";

                // Send verification email
                await _emailService.SendEmailAsync(
                    user.Email,
                    "Email Verification",
                    $"Please verify your email by clicking this link: {verificationLink}"
                );

                _logger.LogInformation($"Email verification sent to {user.Email}");

                return Ok(new
                {
                    success = true,
                    message = "Verification email sent"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending email verification");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        [HttpPost("verify-email")]
        public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailRequest request)
        {
            try
            {
                var user = await _userManager.FindByIdAsync(request.UserId);
                if (user == null)
                {
                    return BadRequest(new { success = false, message = "Invalid verification request" });
                }

                if (user.EmailConfirmed)
                {
                    return BadRequest(new { success = false, message = "Email is already verified" });
                }

                var result = await _userManager.ConfirmEmailAsync(user, request.Token);

                if (!result.Succeeded)
                {
                    return BadRequest(new
                    {
                        success = false,
                        message = "Email verification failed",
                        errors = result.Errors.Select(e => e.Description)
                    });
                }

                _logger.LogInformation($"Email verified for user {user.Email}");

                return Ok(new { success = true, message = "Email verified successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error verifying email");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // ── POST /api/auth/mark-vendor-paid ─────────────────────────────────────
        [HttpPost("mark-vendor-paid")]
        [Authorize]
        public async Task<IActionResult> MarkVendorPaid([FromBody] MarkVendorPaidRequest model)
        {
            try
            {
                var userId = User.FindFirstValue(System.Security.Claims.ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized(new { success = false, message = "Unauthorized" });

                var tenant = await _db.TenantRegistrations.FirstOrDefaultAsync(t => t.VendorId == userId);
                if (tenant == null)
                    return NotFound(new { success = false, message = "Vendor tenant record not found" });

                tenant.Status = TenantStatus.Active;
                tenant.SubscriptionType = string.IsNullOrWhiteSpace(model.SubscriptionType) ? "Monthly" : model.SubscriptionType;
                if (tenant.SubscriptionType == "Yearly")
                    tenant.SubscriptionEndDate = DateTime.UtcNow.AddYears(1);
                tenant.UpdatedAt = DateTime.UtcNow;

                if (!string.IsNullOrWhiteSpace(model.PaymentId))
                {
                    var note = $"Razorpay | PaymentId: {model.PaymentId} | OrderId: {model.OrderId} | {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC";
                    tenant.MaintenanceNotes = string.IsNullOrWhiteSpace(tenant.MaintenanceNotes)
                        ? note
                        : tenant.MaintenanceNotes + "\n" + note;
                }

                await _db.SaveChangesAsync();
                _logger.LogInformation("Vendor {VendorId} payment verified, status → Active. PaymentId: {PaymentId}", userId, model.PaymentId);

                return Ok(new { success = true, message = "Payment confirmed. Your store is now active!" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error marking vendor as paid");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }
    }

    // Request models
    public class RefreshTokenRequest
    {
        public string Token { get; set; }
    }

    public class ChangePasswordRequest
    {
        public string CurrentPassword { get; set; }
        public string NewPassword { get; set; }
    }

    public class ForgotPasswordRequest
    {
        public string Email { get; set; }
    }

    public class ResetPasswordRequest
    {
        public string Email { get; set; }
        public string Token { get; set; }
        public string NewPassword { get; set; }
    }

    public class SendOtpRequest
    {
        public string PhoneNumber { get; set; }
    }

    public class VerifyOtpRequest
    {
        public string PhoneNumber { get; set; }
        public string Otp { get; set; }
    }

    public class SendEmailVerificationRequest
    {
        public string Email { get; set; }
    }

    public class VerifyEmailRequest
    {
        public string UserId { get; set; }
        public string Token { get; set; }
    }

    public class MarkVendorPaidRequest
    {
        public string PaymentId { get; set; } = string.Empty;
        public string OrderId { get; set; } = string.Empty;
        public string SubscriptionType { get; set; } = "Monthly";
    }
}
