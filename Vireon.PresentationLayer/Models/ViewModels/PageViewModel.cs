namespace Vireon.PresentationLayer.Models.ViewModels;

public class PageViewModel
{
    public string Title { get; set; } = "Vireon";
    public string PageKey { get; set; } = "home";
}

public class SectionPageViewModel : PageViewModel
{
    public string TitleTr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string SectionPartial { get; set; } = string.Empty;
    public string MenuBadge { get; set; } = string.Empty;
}

public class DashboardPageViewModel : PageViewModel
{
    public string ActiveSection { get; set; } = "dash-overview";
    public string SectionPartial { get; set; } = string.Empty;
}

public class LoginViewModel
{
    public string Title { get; set; } = "Sign In";
    public string? ReturnUrl { get; set; }
}
