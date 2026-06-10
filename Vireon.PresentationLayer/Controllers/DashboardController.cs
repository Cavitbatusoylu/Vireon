using Microsoft.AspNetCore.Mvc;
using Vireon.PresentationLayer.Models.ViewModels;

namespace Vireon.PresentationLayer.Controllers;

public class DashboardController : Controller
{
    public IActionResult Overview() => Page("dash-overview", "Account Overview");
    public IActionResult Transfer() => Page("dash-transfers", "Send Money");
    public IActionResult Deposit() => Page("dash-deposit", "Deposit Funds");
    public IActionResult Qr() => Page("dash-qr", "QR Payment");
    public IActionResult History() => Page("dash-history", "Transaction History");
    public IActionResult Limits() => Page("dash-limits", "Daily Limits");
    public IActionResult DbExplorer() => Page("dash-db-explorer", "Database Explorer");
    public IActionResult AccountInfo() => Page("dash-account-info", "Account Information");
    public IActionResult AiCoach() => Page("dash-ai-coach", "Neon AI Coach");
    public IActionResult Profile() => Page("dash-profile", "Profile Settings");
    public IActionResult Password() => Page("dash-password", "Change Password");
    public IActionResult Admin() => Page("dash-admin", "Admin Panel");

    private IActionResult Page(string sectionId, string title)
    {
        return View("Page", new DashboardPageViewModel
        {
            Title = title,
            PageKey = $"dashboard-{sectionId}",
            ActiveSection = sectionId,
            SectionPartial = $"~/Views/Dashboard/_sections/{sectionId}.cshtml"
        });
    }
}
