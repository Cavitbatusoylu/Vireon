using AutoMapper;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Vireon.PresentationLayer.DTOs;
using Vireon.EntityLayer.Concrete;
using Vireon.BusinessLayer.Abstract;

namespace Vireon.PresentationLayer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TransfersController : ControllerBase
    {
        private readonly IMapper _mapper;
        private readonly IValidator<TransferRequestDto> _validator;

        //İş katmanıyla haberleşecek köprü
        private readonly ITransactionService _transactionService; 

        // Vezne açıldığında Çevirmen, Güvenlik ve İşlem Müdürü masaya gelir
        public TransfersController(IMapper mapper, IValidator<TransferRequestDto> validator , ITransactionService transactionService)
        {
            _mapper = mapper;
            _validator = validator;
            _transactionService = transactionService;
        }

        [HttpPost("send")] // "gonder" yerine evrensel "send" kullanıyoruz
        public IActionResult SendTransfer([FromBody] TransferRequestDto requestDto)
        {
            // GÜVENLİK
            var validationResult = _validator.Validate(requestDto);
            if (!validationResult.IsValid)
            {
                return BadRequest(validationResult.Errors);
            }

            // ÇEVİRİ (DTO -> Entity)
            // İngilizce formumuzu alıp, İngilizce veritabanı tablosuna (Transaction) çeviriyoruz
            var transactionEntity = _mapper.Map<Transaction>(requestDto);

            // İŞ KATMANINA İLETİM
            // Çevrilen veriyi Cavit'in servisine gönderiyoruz
            _transactionService.ProcessTransaction(transactionEntity);

            return Ok(new
            {
                Mesaj = "Profesör, havale işlemi güvenlikten geçti ve İş Katmanına başarıyla iletildi!",
                GonderilenTutar = requestDto.Amount
            });
        }
    }
}