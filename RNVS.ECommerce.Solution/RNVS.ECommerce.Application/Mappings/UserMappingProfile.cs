using AutoMapper;
using RNVS.ECommerce.Application.DTOs.User;
using RNVS.ECommerce.Domain.Entities.User;

namespace RNVS.ECommerce.Application.Mappings;

public class UserMappingProfile : Profile
{
    public UserMappingProfile()
    {
        CreateMap<ApplicationUser, UserProfileDto>();
        CreateMap<UserUpdateDto, ApplicationUser>();
        CreateMap<CompanyProfile, CompanyProfileDto>().ReverseMap();
    }
}