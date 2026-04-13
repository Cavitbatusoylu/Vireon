using AutoMapper;
using Vireon.DtoLayer;
using Vireon.EntityLayer.Concrete;

namespace Vireon.PresentationLayer.Mappings
{
    public class VireonMappingProfile : Profile
    {
        public VireonMappingProfile()
        {
            // AutoMapper aradaki her şeyi kendisi kusursuzca eşleştirecek!
            CreateMap<TransferRequestDto, Transaction>();
        }
    }
}