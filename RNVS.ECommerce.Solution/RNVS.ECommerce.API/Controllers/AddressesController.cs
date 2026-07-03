using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.Address;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Domain.Entities.Order;
using RNVS.ECommerce.Domain.Enums;
using RNVS.ECommerce.Infrastructure.Data;
using System.Security.Claims;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AddressesController : ControllerBase
{
    private readonly VendorDbContext _context;
    private readonly ILogger<AddressesController> _logger;

    public AddressesController(
        VendorDbContext context,
        ILogger<AddressesController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get all addresses for current user
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAddresses()
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "User not authenticated"
                });
            }

            var addresses = await _context.Addresses
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.IsDefault)
                .ToListAsync();

            var addressDtos = addresses.Select(a => new AddressDto
            {
                Id = a.Id,
                FirstName = a.FirstName,
                LastName = a.LastName,
                Street = a.Street,
                City = a.City,
                State = a.State,
                PostalCode = a.PostalCode,
                Country = a.Country,
                UserId = a.UserId,
                IsDefault = a.IsDefault,
                Type = (int)a.Type
            }).ToList();

            return Ok(new ApiResponseDto<List<AddressDto>>
            {
                Success = true,
                Data = addressDtos
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting addresses");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Get address by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetAddressById(int id)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "User not authenticated"
                });
            }

            var address = await _context.Addresses
                .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

            if (address == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Address not found"
                });
            }

            var addressDto = new AddressDto
            {
                Id = address.Id,
                FirstName = address.FirstName,
                LastName = address.LastName,
                Street = address.Street,
                City = address.City,
                State = address.State,
                PostalCode = address.PostalCode,
                Country = address.Country,
                UserId = address.UserId,
                IsDefault = address.IsDefault,
                Type = (int)address.Type
            };

            return Ok(new ApiResponseDto<AddressDto>
            {
                Success = true,
                Data = addressDto
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting address {AddressId}", id);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Create new address
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateAddress([FromBody] CreateAddressDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Invalid input",
                    Errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList()
                });
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "User not authenticated"
                });
            }

            // If this is set as default, unset all other default addresses of the same type
            if (dto.IsDefault)
            {
                var addressType = (AddressType)dto.Type;
                var existingDefaults = await _context.Addresses
                    .Where(a => a.UserId == userId && a.Type == addressType && a.IsDefault)
                    .ToListAsync();

                foreach (var addr in existingDefaults)
                {
                    addr.IsDefault = false;
                }
            }

            var address = new Address
            {
                FirstName = dto.FirstName,
                LastName = dto.LastName,
                Street = dto.Street,
                City = dto.City,
                State = dto.State,
                PostalCode = dto.PostalCode,
                Country = dto.Country,
                UserId = userId,
                IsDefault = dto.IsDefault,
                Type = (AddressType)dto.Type
            };

            await _context.Addresses.AddAsync(address);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Address created for user {UserId}", userId);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Address created successfully",
                Data = new { AddressId = address.Id }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating address");
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Update address
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAddress(int id, [FromBody] CreateAddressDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Invalid input",
                    Errors = ModelState.Values
                        .SelectMany(v => v.Errors)
                        .Select(e => e.ErrorMessage)
                        .ToList()
                });
            }

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "User not authenticated"
                });
            }

            var address = await _context.Addresses
                .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

            if (address == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Address not found"
                });
            }

            // If this is set as default, unset all other default addresses of the same type
            if (dto.IsDefault && !address.IsDefault)
            {
                var addressType = (AddressType)dto.Type;
                var existingDefaults = await _context.Addresses
                    .Where(a => a.UserId == userId && a.Type == addressType && a.IsDefault && a.Id != id)
                    .ToListAsync();

                foreach (var addr in existingDefaults)
                {
                    addr.IsDefault = false;
                }
            }

            address.FirstName = dto.FirstName;
            address.LastName = dto.LastName;
            address.Street = dto.Street;
            address.City = dto.City;
            address.State = dto.State;
            address.PostalCode = dto.PostalCode;
            address.Country = dto.Country;
            address.IsDefault = dto.IsDefault;
            address.Type = (AddressType)dto.Type;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Address {AddressId} updated for user {UserId}", id, userId);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Address updated successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating address {AddressId}", id);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Delete address
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAddress(int id)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "User not authenticated"
                });
            }

            var address = await _context.Addresses
                .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

            if (address == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Address not found"
                });
            }

            _context.Addresses.Remove(address);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Address {AddressId} deleted for user {UserId}", id, userId);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Address deleted successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting address {AddressId}", id);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }

    /// <summary>
    /// Set address as default
    /// </summary>
    [HttpPost("{id}/set-default")]
    public async Task<IActionResult> SetDefaultAddress(int id)
    {
        try
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "User not authenticated"
                });
            }

            var address = await _context.Addresses
                .FirstOrDefaultAsync(a => a.Id == id && a.UserId == userId);

            if (address == null)
            {
                return NotFound(new ApiResponseDto<object>
                {
                    Success = false,
                    Message = "Address not found"
                });
            }

            // Unset all other default addresses of the same type
            var existingDefaults = await _context.Addresses
                .Where(a => a.UserId == userId && a.Type == address.Type && a.IsDefault && a.Id != id)
                .ToListAsync();

            foreach (var addr in existingDefaults)
            {
                addr.IsDefault = false;
            }

            address.IsDefault = true;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Address {AddressId} set as default for user {UserId}", id, userId);

            return Ok(new ApiResponseDto<object>
            {
                Success = true,
                Message = "Address set as default successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting default address {AddressId}", id);
            return StatusCode(500, new ApiResponseDto<object>
            {
                Success = false,
                Message = "Internal server error"
            });
        }
    }
}
