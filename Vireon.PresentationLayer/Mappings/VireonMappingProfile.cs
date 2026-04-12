using AutoMapper;
using Vireon.PresentationLayer.DTOs;
using Vireon.EntityLayer.Concrete; // Cavit'in tablolarını içeri aldık

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