using FluentValidation;
using Vireon.PresentationLayer.DTOs;

namespace Vireon.PresentationLayer.Validators
{
    public class TransferByAccountDtoValidator : AbstractValidator<TransferByAccountDto>
    {
        public TransferByAccountDtoValidator()
        {
            RuleFor(x => x.SenderAccountNumber)
                .NotEmpty().WithMessage("Gönderici hesap numarası zorunludur.")
                .Matches(@"^VR-\d{5}$").WithMessage("Geçerli bir gönderici hesap numarası giriniz (VR-XXXXX formatında).");

            RuleFor(x => x.ReceiverAccountNumber)
                .NotEmpty().WithMessage("Alıcı hesap numarası zorunludur.")
                .Matches(@"^VR-\d{5}$").WithMessage("Geçerli bir alıcı hesap numarası giriniz (VR-XXXXX formatında).")
                .NotEqual(x => x.SenderAccountNumber).WithMessage("Kendi hesabınıza transfer yapamazsınız.");

            RuleFor(x => x.Amount)
                .GreaterThan(0).WithMessage("Transfer tutarı 0'dan büyük olmalıdır.")
                .LessThanOrEqualTo(100000).WithMessage("Tek seferde en fazla 100.000 TRY transfer yapabilirsiniz.");

            RuleFor(x => x.Description)
                .MaximumLength(200).WithMessage("Açıklama en fazla 200 karakter olabilir.");
        }
    }
}
