using AutoMapper;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Vireon.DtoLayer.DTOs;
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

            // 2. YAPAY ZEKA ANALİZİ - risk skoru kontrolü
            // İşlemi iş katmanına göndermeden önce AI "Şüpheli mi?" diye kontrol ediyor
            var hour = DateTime.Now.Hour;
            var frequency = _transactionService.GetRecentTransactionCount(requestDto.SenderAccountId, 60);
            var (isFraud, probability) = _fraudModelService.Predict((float)requestDto.Amount, hour, frequency);

            if (isFraud) // %70 üzeri risk varsa işlemi engelle
            {
                _transactionService.LogFraudEvent(
                    requestDto.SenderAccountId,
                    "AI_BLOCKED",
                    $"AI risk motoru engelledi: {requestDto.Amount:N2} TRY (Risk: %{probability * 100:F0})");

                return BadRequest(new
                {
                    message = "AI risk engine flagged this transaction as high risk and blocked it automatically.",
                    mesaj = "Yapay zeka risk motoru bu işlemi yüksek riskli buldu ve otomatik olarak engelledi!",
                    riskScore = probability,
                    status = "blocked"
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
                    message = "Transfer successful!",
                    mesaj = "Transfer başarılı!",
                    riskScore = probability,
                    amount = requestDto.Amount,
                    status = "completed"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message, mesaj = ex.Message, status = "failed" });
            }
        }

        [HttpPost("send-by-account")]
        public IActionResult SendTransferByAccount([FromBody] TransferByAccountDto dto)
        {
            try
            {
                // Input validation
                if (string.IsNullOrWhiteSpace(dto.SenderAccountNumber) || string.IsNullOrWhiteSpace(dto.ReceiverAccountNumber))
                {
                    return BadRequest(new { message = "Sender and receiver account numbers are required.", mesaj = "Gönderici ve alıcı hesap numaraları zorunludur." });
                }

                if (dto.Amount <= 0)
                {
                    return BadRequest(new { message = "Amount must be greater than 0.", mesaj = "Tutar 0'dan büyük olmalıdır." });
                }

                if (dto.SenderAccountNumber.Trim().ToUpperInvariant() == dto.ReceiverAccountNumber.Trim().ToUpperInvariant())
                {
                    return BadRequest(new { message = "Cannot transfer to your own account.", mesaj = "Kendi hesabınıza transfer yapamazsınız." });
                }

                // Hesap numaralarından ID'leri bul
                var senderAccount = _transactionService.GetAccountByNumber(dto.SenderAccountNumber.Trim().ToUpperInvariant());
                var receiverAccount = _transactionService.GetAccountByNumber(dto.ReceiverAccountNumber.Trim().ToUpperInvariant());

                if (senderAccount == null)
                    return NotFound(new { message = "Sender account not found.", mesaj = "Gönderici hesap bulunamadı." });

                if (receiverAccount == null)
                    return NotFound(new { message = "Receiver account not found.", mesaj = "Alıcı hesap bulunamadı." });

                // AI fraud check
                var hour = DateTime.Now.Hour;
                var frequency = _transactionService.GetRecentTransactionCount(senderAccount.Id, 60);
                var (isFraud, probability) = _fraudModelService.Predict((float)dto.Amount, hour, frequency);

                if (isFraud)
                {
                    _transactionService.LogFraudEvent(
                        senderAccount.Id,
                        "AI_BLOCKED",
                        $"AI risk motoru engelledi: {dto.Amount:N2} TRY (Risk: %{probability * 100:F0})");

                    return BadRequest(new
                    {
                        message = "AI flagged this transaction as high risk.",
                        mesaj = "Yapay Zeka bu işlemi yüksek riskli buldu.",
                        riskScore = probability,
                        status = "blocked"
                    });
                }

                // Transaction oluştur
                var transaction = new Transaction
                {
                    SenderAccountId = senderAccount.Id,
                    ReceiverAccountId = receiverAccount.Id,
                    Amount = dto.Amount,
                    Date = DateTime.Now,
                    Description = dto.Description ?? "Transfer"
                };

                _transactionService.ProcessTransaction(transaction);

                return Ok(new
                {
                    message = "Transfer successful!",
                    mesaj = "Transfer başarılı!",
                    amount = dto.Amount,
                    sender = dto.SenderAccountNumber,
                    receiver = dto.ReceiverAccountNumber,
                    status = "completed"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message, mesaj = ex.Message, status = "failed" });
            }
        }

        [HttpPost("deposit")]
        public IActionResult Deposit([FromBody] DepositDto dto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(dto.AccountNumber) || dto.Amount <= 0)
                {
                    return BadRequest(new { message = "Valid account number and amount required.", mesaj = "Geçerli hesap numarası ve tutar gereklidir." });
                }

                _transactionService.Deposit(dto.AccountNumber, dto.Amount, dto.Description);

                return Ok(new
                {
                    message = "Deposit successful!",
                    mesaj = "Para yatırma işlemi başarılı!",
                    amount = dto.Amount,
                    account = dto.AccountNumber,
                    status = "completed"
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message, mesaj = ex.Message, status = "failed" });
            }
        }
    }
}
