using FluentValidation;
using RNVS.ECommerce.Application.DTOs.User;

namespace RNVS.ECommerce.Application.Validators.User;

public class CompanyProfileValidator : AbstractValidator<CompanyProfileDto>
{
    public CompanyProfileValidator()
    {
        RuleFor(x => x.CompanyName).NotEmpty().MaximumLength(200);
    }
}