using AutoMapper;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Vireon.PresentationLayer.DTOs;
using Vireon.EntityLayer.Concrete;
using Vireon.BusinessLayer.Abstract;
using Vireon.BusinessLayer.Concrete;

namespace Vireon.PresentationLayer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TransfersController : ControllerBase
    {
        private readonly IMapper _mapper;
        private readonly IValidator<TransferRequestDto> _validator;

        // İş katmanıyla haberleşecek köprü
        private readonly ITransactionService _transactionService;

        // Yapay Zeka (AI) Servisi
        private readonly FraudModelService _fraudModelService;

        // Vezne açıldığında Çevirmen, Güvenlik, İşlem Müdürü ve artık AI Analist masaya gelir
        public TransfersController(IMapper mapper, IValidator<TransferRequestDto> validator,
            ITransactionService transactionService, FraudModelService fraudModelService)
        {
            _mapper = mapper;
            _validator = validator;
            _transactionService = transactionService;
            _fraudModelService = fraudModelService;
        }

        [HttpPost("send")]
        public IActionResult SendTransfer([FromBody] TransferRequestDto requestDto)
        {
            // 1. GÜVENLİK (FluentValidation)
            var validationResult = _validator.Validate(requestDto);
            if (!validationResult.IsValid)
            {
                return BadRequest(validationResult.Errors);
            }

            // 2. YAPAY ZEKA ANALİZİ (ML.NET) - WOW FAKTÖRÜ
            // İşlemi iş katmanına göndermeden önce AI "Şüpheli mi?" diye kontrol ediyor
            var (isFraud, probability) = _fraudModelService.Predict((float)requestDto.Amount);

            if (isFraud && probability > 0.7) // %70 üzeri risk varsa işlemi engelle
            {
                return BadRequest(new
                {
                    Mesaj = "Profesör, Yapay Zeka (ML.NET) bu işlemi yüksek riskli buldu ve otomatik olarak engelledi!",
                    RiskSkoru = probability,
                    Durum = "Engellendi"
                });
            }

            // 3. ÇEVİRİ (DTO -> Entity)
            var transactionEntity = _mapper.Map<Transaction>(requestDto);

            // 4. İŞ KATMANINA İLETİM
            try
            {
                _transactionService.ProcessTransaction(transactionEntity);

                return Ok(new
                {
                    Mesaj = "Transfer başarılı!",
                    RiskSkoru = probability,
                    GonderilenTutar = requestDto.Amount,
                    Durum = "Başarılı"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Mesaj = ex.Message });
            }
        }

        [HttpPost("send-by-account")]
        public IActionResult SendTransferByAccount([FromBody] TransferByAccountDto dto)
        {
            try
            {
                // Hesap numaralarından ID'leri bul
                var senderAccount = _transactionService.GetAccountByNumber(dto.SenderAccountNumber);
                var receiverAccount = _transactionService.GetAccountByNumber(dto.ReceiverAccountNumber);

                if (senderAccount == null || receiverAccount == null)
                    return NotFound(new { Mesaj = "Gönderici veya alıcı hesap bulunamadı." });

                // Transaction oluştur
                var transaction = new Transaction
                {
                    SenderAccountId = senderAccount.Id,
                    ReceiverAccountId = receiverAccount.Id,
                    Amount = dto.Amount,
                    Date = DateTime.Now
                };

                _transactionService.ProcessTransaction(transaction);

                return Ok(new
                {
                    Mesaj = "Transfer başarılı!",
                    GonderilenTutar = dto.Amount,
                    Gonderici = dto.SenderAccountNumber,
                    Alici = dto.ReceiverAccountNumber
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Mesaj = ex.Message });
            }
        }
    }
}
