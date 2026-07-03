using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.API.Filters;
using RNVS.ECommerce.Application.DTOs.User;
using RNVS.ECommerce.Domain.Entities.User;
using RNVS.ECommerce.Infrastructure.Data;
using System.Security.Claims;

namespace RNVS.ECommerce.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [RequireAccess("employees")]
    public class EmployeeController : ControllerBase
    {
        private readonly VendorDbContext _vendorDb;
        private readonly IPasswordHasher<Employee> _hasher;
        private readonly ILogger<EmployeeController> _logger;

        public EmployeeController(
            VendorDbContext vendorDb,
            IPasswordHasher<Employee> hasher,
            ILogger<EmployeeController> logger)
        {
            _vendorDb = vendorDb;
            _hasher = hasher;
            _logger = logger;
        }

        // ── Helpers ─────────────────────────────────────────────────────────────

        /// <summary>
        /// Returns the VendorId for the current request.
        /// Vendors: NameIdentifier IS their VendorId.
        /// Employees: carry a custom "vendorid" claim in their JWT.
        /// </summary>
        private string? GetVendorId()
        {
            var vendorIdClaim = User.FindFirst("vendorid")?.Value;
            if (!string.IsNullOrEmpty(vendorIdClaim)) return vendorIdClaim;
            return User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }

        private static EmployeeDto ToDto(Employee e) => new()
        {
            Id = e.Id,
            VendorId = e.VendorId,
            EmployeeName = $"{e.FirstName} {e.LastName}".Trim(),
            Email = e.Email,
            Designation = e.Designation,
            EmployeeCode = e.EmployeeCode,
            PhoneNumber = e.PhoneNumber,
            Address = e.Address,
            City = e.City,
            State = e.State,
            PostalCode = e.PostalCode,
            Country = e.Country,
            JoinedDate = e.JoinedDate,
            TerminatedDate = e.TerminatedDate,
            IsActive = e.IsActive,
            Permissions = e.Permissions,
            Salary = e.Salary,
            Notes = e.Notes
        };

        // ── GET /api/employee/me ─────────────────────────────────────────────────
        // Called by a logged-in employee to get their own record (designation etc.)
        [HttpGet("me")]
        public async Task<IActionResult> GetMyRecord()
        {
            try
            {
                // Employee JWT carries NameIdentifier = employee.Id
                if (!int.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var employeeId))
                    return Unauthorized(new { success = false, message = "Invalid token" });

                var employee = await _vendorDb.Employees
                    .Where(e => e.Id == employeeId && e.IsActive)
                    .FirstOrDefaultAsync();

                if (employee == null)
                    return NotFound(new { success = false, message = "Employee record not found" });

                return Ok(new { success = true, data = ToDto(employee) });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching employee record");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // ── GET /api/employee ────────────────────────────────────────────────────
        [HttpGet]
        public async Task<IActionResult> GetEmployees()
        {
            try
            {
                var vendorId = GetVendorId();
                if (string.IsNullOrEmpty(vendorId))
                    return Unauthorized(new { success = false, message = "User not authenticated" });

                var employees = await _vendorDb.Employees
                    .Where(e => e.VendorId == vendorId)
                    .OrderBy(e => e.JoinedDate)
                    .Select(e => ToDto(e))
                    .ToListAsync();

                return Ok(new { success = true, data = employees });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching employees");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // ── GET /api/employee/{id} ───────────────────────────────────────────────
        [HttpGet("{id}")]
        public async Task<IActionResult> GetEmployee(int id)
        {
            try
            {
                var vendorId = GetVendorId();
                if (string.IsNullOrEmpty(vendorId))
                    return Unauthorized(new { success = false, message = "User not authenticated" });

                var employee = await _vendorDb.Employees
                    .Where(e => e.Id == id && e.VendorId == vendorId)
                    .FirstOrDefaultAsync();

                if (employee == null)
                    return NotFound(new { success = false, message = "Employee not found" });

                return Ok(new { success = true, data = ToDto(employee) });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching employee {Id}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // ── POST /api/employee ───────────────────────────────────────────────────
        [HttpPost]
        public async Task<IActionResult> CreateEmployee([FromBody] EmployeeCreateDto model)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new { success = false, message = "Invalid input", errors = ModelState });

                var vendorId = GetVendorId();
                if (string.IsNullOrEmpty(vendorId))
                    return Unauthorized(new { success = false, message = "User not authenticated" });

                // Check email not already used by another employee of this vendor
                var emailExists = await _vendorDb.Employees
                    .AnyAsync(e => e.Email == model.Email.ToLower() && e.VendorId == vendorId);
                if (emailExists)
                    return BadRequest(new { success = false, message = "An employee with this email already exists." });

                // Create employee — everything stays in vendor DB
                var employee = new Employee
                {
                    VendorId = vendorId,
                    FirstName = model.FirstName.Trim(),
                    LastName = (model.LastName ?? string.Empty).Trim(),
                    Email = model.Email.ToLower().Trim(),
                    Designation = model.Designation,
                    PhoneNumber = model.PhoneNumber,
                    Address = model.Address,
                    City = model.City,
                    State = model.State,
                    PostalCode = model.PostalCode,
                    Country = model.Country,
                    Permissions = model.Permissions,
                    Salary = model.Salary,
                    Notes = model.Notes,
                    IsActive = true,
                    JoinedDate = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                employee.PasswordHash = _hasher.HashPassword(employee, model.Password);

                _vendorDb.Employees.Add(employee);
                await _vendorDb.SaveChangesAsync();

                _logger.LogInformation("Employee created: {EmployeeId} for vendor {VendorId}", employee.Id, vendorId);

                return CreatedAtAction(nameof(GetEmployee), new { id = employee.Id },
                    new { success = true, data = ToDto(employee), message = "Employee created successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating employee");
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // ── PUT /api/employee/{id} ───────────────────────────────────────────────
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateEmployee(int id, [FromBody] EmployeeUpdateDto model)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new { success = false, message = "Invalid input", errors = ModelState });

                var vendorId = GetVendorId();
                if (string.IsNullOrEmpty(vendorId))
                    return Unauthorized(new { success = false, message = "User not authenticated" });

                var employee = await _vendorDb.Employees
                    .Where(e => e.Id == id && e.VendorId == vendorId)
                    .FirstOrDefaultAsync();

                if (employee == null)
                    return NotFound(new { success = false, message = "Employee not found" });

                if (!string.IsNullOrEmpty(model.Designation)) employee.Designation = model.Designation;
                if (!string.IsNullOrEmpty(model.PhoneNumber))  employee.PhoneNumber = model.PhoneNumber;
                if (model.Address != null)    employee.Address = model.Address;
                if (model.City != null)       employee.City = model.City;
                if (model.State != null)      employee.State = model.State;
                if (model.PostalCode != null) employee.PostalCode = model.PostalCode;
                if (model.Country != null)    employee.Country = model.Country;
                if (model.IsActive.HasValue)  employee.IsActive = model.IsActive.Value;
                if (model.Permissions != null) employee.Permissions = model.Permissions;
                if (model.Salary.HasValue)    employee.Salary = model.Salary.Value;
                if (model.Notes != null)      employee.Notes = model.Notes;

                employee.UpdatedAt = DateTime.UtcNow;
                await _vendorDb.SaveChangesAsync();

                _logger.LogInformation("Employee updated: {EmployeeId}", employee.Id);
                return Ok(new { success = true, message = "Employee updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating employee {Id}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }

        // ── DELETE /api/employee/{id} ────────────────────────────────────────────
        // Soft delete in vendor DB + removes routing entry from main DB
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteEmployee(int id)
        {
            try
            {
                var vendorId = GetVendorId();
                if (string.IsNullOrEmpty(vendorId))
                    return Unauthorized(new { success = false, message = "User not authenticated" });

                var employee = await _vendorDb.Employees
                    .Where(e => e.Id == id && e.VendorId == vendorId)
                    .FirstOrDefaultAsync();

                if (employee == null)
                    return NotFound(new { success = false, message = "Employee not found" });

                // Soft delete in vendor DB
                employee.IsActive = false;
                employee.TerminatedDate = DateTime.UtcNow;
                employee.UpdatedAt = DateTime.UtcNow;
                await _vendorDb.SaveChangesAsync();

                _logger.LogInformation("Employee soft-deleted: {EmployeeId}", employee.Id);
                return Ok(new { success = true, message = "Employee removed successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting employee {Id}", id);
                return StatusCode(500, new { success = false, message = "Internal server error" });
            }
        }
    }
}
