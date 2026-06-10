using Microsoft.AspNetCore.Mvc;
using Vireon.PresentationLayer.Models.ViewModels;

namespace Vireon.PresentationLayer.Controllers;

public class HomeController : Controller
{
    public IActionResult Index() => View(new PageViewModel
    {
        Title = "Vireon — Home",
        PageKey = "home"
    });

    public IActionResult Introduction() => Section("Introduction", "Tanıtım", "IN", "section-introduction");
    public IActionResult Components() => Section("Components", "Bileşenler", "SV", "section-components");
    public IActionResult Architecture() => Section("Architecture", "Mimari", "AR", "section-architecture");
    public IActionResult Team() => Section("Team", "Ekip", "TM", "section-team");
    public IActionResult Desktop() => Section("Desktop", "Masaüstü", "DT", "section-desktop");
    public IActionResult About() => Section("About", "Hakkında", "AB", "section-about");
    public IActionResult Contact() => Section("Contact", "İletişim", "CT", "section-contact");

    private IActionResult Section(string titleEn, string titleTr, string badge, string partial)
    {
        return View("Section", new SectionPageViewModel
        {
            Title = titleEn,
            TitleEn = titleEn,
            TitleTr = titleTr,
            PageKey = "home-section",
            SectionPartial = $"~/Views/Home/_sections/{partial}.cshtml",
            MenuBadge = badge
        });
    }
}
