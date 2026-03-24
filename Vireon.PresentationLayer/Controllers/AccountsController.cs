using Microsoft.AspNetCore.Mvc;
using Vireon.DataAccessLayer.Concrete.EntityFramework;
using Vireon.EntityLayer.Concrete;

namespace Vireon.PresentationLayer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AccountsController : ControllerBase
    {
        private readonly VireonContext _context;

        public AccountsController(VireonContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult GetAccounts()
        {
            var values = _context.Accounts.ToList();
            return Ok(values);
        }

        [HttpPost]
        public IActionResult AddAccount(Account account)
        {
            _context.Accounts.Add(account);
            _context.SaveChanges();
            return Ok("Hesap başarıyla eklendi!");
        }
    }
}
