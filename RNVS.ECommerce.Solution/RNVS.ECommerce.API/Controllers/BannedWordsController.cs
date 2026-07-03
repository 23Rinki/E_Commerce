using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RNVS.ECommerce.Application.DTOs.Common;
using RNVS.ECommerce.Domain.Entities.Platform;
using RNVS.ECommerce.Infrastructure.Data;

namespace RNVS.ECommerce.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class BannedWordsController : ControllerBase
{
    private readonly ApplicationDbContext _mainDb;
    private readonly ILogger<BannedWordsController> _logger;

    public BannedWordsController(ApplicationDbContext mainDb, ILogger<BannedWordsController> logger)
    {
        _mainDb = mainDb;
        _logger = logger;
    }

    public class AddBannedWordDto
    {
        public string Word { get; set; } = string.Empty;
    }

    // GET: api/bannedwords
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var words = await _mainDb.BannedWords
            .OrderBy(w => w.Word)
            .ToListAsync();

        return Ok(new ApiResponseDto<object>
        {
            Success = true,
            Data = words.Select(w => new { id = w.Id, word = w.Word, createdAt = w.CreatedAt })
        });
    }

    // POST: api/bannedwords
    [HttpPost]
    public async Task<IActionResult> Add([FromBody] AddBannedWordDto dto)
    {
        var word = dto.Word?.Trim();
        if (string.IsNullOrWhiteSpace(word))
        {
            return BadRequest(new ApiResponseDto<object>
            {
                Success = false,
                Message = "Word is required"
            });
        }

        var exists = await _mainDb.BannedWords.AnyAsync(w => w.Word.ToLower() == word.ToLower());
        if (exists)
        {
            return BadRequest(new ApiResponseDto<object>
            {
                Success = false,
                Message = "This word is already on the list"
            });
        }

        var entity = new BannedWord { Word = word };
        _mainDb.BannedWords.Add(entity);
        await _mainDb.SaveChangesAsync();

        _logger.LogInformation("Banned word added: \"{Word}\" by {UserId}", word, User.Identity?.Name);

        return Ok(new ApiResponseDto<object>
        {
            Success = true,
            Message = "Word added",
            Data = new { id = entity.Id, word = entity.Word }
        });
    }

    // DELETE: api/bannedwords/{id}
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _mainDb.BannedWords.FindAsync(id);
        if (entity == null)
        {
            return NotFound(new ApiResponseDto<object>
            {
                Success = false,
                Message = "Word not found"
            });
        }

        _mainDb.BannedWords.Remove(entity);
        await _mainDb.SaveChangesAsync();

        return Ok(new ApiResponseDto<object>
        {
            Success = true,
            Message = "Word removed"
        });
    }
}
