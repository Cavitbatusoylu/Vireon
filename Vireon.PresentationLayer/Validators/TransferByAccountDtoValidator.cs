using FluentValidation;
using Vireon.DtoLayer.DTOs;

namespace Vireon.PresentationLayer.Validators
{
    public class TransferByAccountDtoValidator : AbstractValidator<TransferByAccountDto>
    {
        public TransferByAccountDtoValidator()
        {
            RuleFor(x => x.SenderAccountNumber)
                .NotEmpty().WithMessage("GÃ¶nderici hesap numarasÄ± zorunludur.")
                .Matches(@"^VR-\d{5}$").WithMessage("GeÃ§erli bir gÃ¶nderici hesap numarasÄ± giriniz (VR-XXXXX formatÄ±nda).");

            RuleFor(x => x.ReceiverAccountNumber)
                .NotEmpty().WithMessage("AlÄ±cÄ± hesap numarasÄ± zorunludur.")
                .Matches(@"^VR-\d{5}$").WithMessage("GeÃ§erli bir alÄ±cÄ± hesap numarasÄ± giriniz (VR-XXXXX formatÄ±nda).")
                .NotEqual(x => x.SenderAccountNumber).WithMessage("Kendi hesabÄ±nÄ±za transfer yapamazsÄ±nÄ±z.");

            RuleFor(x => x.Amount)
                .GreaterThan(0).WithMessage("Transfer tutarÄ± 0'dan bÃ¼yÃ¼k olmalÄ±dÄ±r.")
                .LessThanOrEqualTo(100000).WithMessage("Tek seferde en fazla 100.000 TRY transfer yapabilirsiniz.");

            RuleFor(x => x.Description)
                .MaximumLength(200).WithMessage("AÃ§Ä±klama en fazla 200 karakter olabilir.");
        }
    }
}
