/* JavaScript Document
TemplateMo 603 Nexaverse
https://templatemo.com/tm-603-nexaverse
*/

// ========== TOAST NOTIFICATION SYSTEM ==========
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    }[type] || 'ℹ';
    
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// ABSOLUTE SAFETY: This runs globally at the very start
// Even if anything below fails, this ensures the screen is never blocked.
(function() {
    const clearLoader = () => {
        const ls = document.getElementById('loadingScreen');
        if (ls) {
            ls.classList.remove('show');
            ls.classList.add('hidden');
            ls.style.opacity = '0';
            ls.style.pointerEvents = 'none';
            ls.style.visibility = 'hidden';
            setTimeout(() => ls.style.display = 'none', 800);
            console.log("NEON AI: UI Unlocked (Safety Mode)");
        }
    };
    // Attempt 1: Fast
    setTimeout(clearLoader, 1500);
    // Attempt 2: Final Guarantee
    setTimeout(clearLoader, 3500);
})();

// Loading Screen & PWA Registration
window.addEventListener('load', () => {
   // Register Service Worker for PWA
   if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
         .then(reg => console.log('SW Registered', reg))
         .catch(err => console.log('SW Reg Error', err));
   }
});

// Global state tracking
let isTransitioning = false;
let currentUser = null;
// currentLang is managed by index.html to prevent SyntaxError from redeclaration

let deferredPrompt; 

// Safely get elements
const getEl = (id) => document.getElementById(id);
const getEls = (selector) => document.querySelectorAll(selector);

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
   try {
       initNavigation();
       initInteractions();
       console.log("NEON AI: Systems Initialized Successfully");
   } catch (e) {
       console.error("NEON AI: Init Error", e);
   }
});

function initNavigation() {
   // Menu items event listeners
   document.querySelectorAll('.menu-item').forEach(item => {
      item.addEventListener('click', function() {
         const onclick = this.getAttribute('onclick');
         if (onclick) {
            // Extract section id from onclick attribute
            const match = onclick.match(/scrollToSection\('([^']+)'\)/);
            if (match && match[1]) {
               scrollToSection(match[1]);
            }
         }
      });
   });
}

function smoothScrollTo(id) {
    const element = document.getElementById(id);
    if (element) {
        const navbarHeight = 80; // navbar yüksekliği
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - navbarHeight;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

function scrollToSection(id) {
    console.log('scrollToSection called with:', id);
    
    // Hide all sections
    document.querySelectorAll('.content-section, .landing-content-section').forEach(sec => {
        sec.classList.remove('active');
        sec.style.display = 'none';
        sec.style.visibility = 'hidden';
    });

    // Hide menu elements
    const menuGrid = getEl('menuGrid');
    const mainHeader = getEl('mainHeader');
    const mainFooter = getEl('mainFooter');

    if (menuGrid) {
        menuGrid.style.display = 'none';
        menuGrid.style.visibility = 'hidden';
    }
    if (mainHeader) {
        mainHeader.style.display = 'none';
        mainHeader.style.visibility = 'hidden';
    }
    if (mainFooter) {
        mainFooter.style.display = 'none';
        mainFooter.style.visibility = 'hidden';
    }

    // Show target section
    const el = document.getElementById(id);
    if (el) {
        el.classList.add('active');
        el.style.display = 'block';
        el.style.opacity = '1';
        el.style.visibility = 'visible';
        console.log('Section found and displayed:', id, el);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Animate stats if introduction section
        if (id === 'section-introduction') {
            setTimeout(animateStats, 500);
        }
    } else {
        console.error('Section not found:', id);
        // If section not found, go back to menu
        backToMenu();
    }
}

function initInteractions() {
   const loginBtn = getEl('loginBtn');
   if (loginBtn) {
      loginBtn.addEventListener('click', (e) => {
         console.log('Login button clicked');
         openLoginModal(e);
      });
   }

   const installBtn = getEl('installBtn');
   window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn) installBtn.hidden = false;
   });

   if (installBtn) {
      installBtn.addEventListener('click', async () => {
         if (!deferredPrompt) return;
         deferredPrompt.prompt();
         const { outcome } = await deferredPrompt.userChoice;
         if (outcome === 'accepted') { installBtn.hidden = true; }
         deferredPrompt = null;
      });
   }

   document.querySelectorAll('.intro-cta-primary').forEach(btn => {
      btn.addEventListener('click', () => scrollToSection('section-components'));
   });
   document.querySelectorAll('.intro-cta-secondary').forEach(btn => {
      btn.addEventListener('click', () => scrollToSection('section-architecture'));
   });

   const contactForm = document.querySelector('.contact-form');
   if (contactForm) {
      const submitBtn = contactForm.querySelector('.submit-btn');
      if (submitBtn) {
         submitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const msg = (typeof window.currentLang !== 'undefined' && window.currentLang === 'tr')
               ? 'Mesajınız alındı (demo). Teşekkürler!'
               : 'Message received (demo). Thank you!';
            showToast(msg, 'success');
         });
      }
   }

   document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
         closeLoginModal();
         closeRegisterModal();
         closeForgotPasswordModal();
         const win = getEl('aiChatWindow');
         if (win && win.classList.contains('active')) toggleAIChat();
      }
   });

   [['registerModal', closeRegisterModal], ['forgotPasswordModal', closeForgotPasswordModal]].forEach(([id, closer]) => {
      const m = getEl(id);
      if (m) {
         m.addEventListener('click', (ev) => {
            if (ev.target === m) closer();
         });
      }
   });
}

function showSection(sectionId) {
   console.log('showSection called with:', sectionId);
   
   // Immediately hide all sections
   document.querySelectorAll('.content-section, .landing-content-section').forEach(sec => {
      sec.classList.remove('active');
      sec.style.display = 'none';
      sec.style.visibility = 'hidden';
   });

   // Hide menu elements - ALWAYS hide when showing a section
   const menuGrid = getEl('menuGrid');
   const mainHeader = getEl('mainHeader');
   const mainFooter = getEl('mainFooter');
   const contentArea = getEl('contentArea');

   if (menuGrid) {
      menuGrid.style.display = 'none';
      menuGrid.style.visibility = 'hidden';
   }
   if (mainHeader) {
      mainHeader.style.display = 'none';
      mainHeader.style.visibility = 'hidden';
   }
   if (mainFooter) {
      mainFooter.style.display = 'none';
      mainFooter.style.visibility = 'hidden';
   }
   if (contentArea) contentArea.style.display = 'block';

   // Show target section immediately
   const section = getEl(sectionId);
   if (section) {
      section.classList.add('active');
      section.style.display = 'block';
      section.style.opacity = '1';
      section.style.visibility = 'visible';
      console.log('Section displayed:', sectionId);
   } else {
      console.error('Section not found:', sectionId);
   }

   // Handle dashboard
   if (sectionId === 'dashboard') {
      document.body.classList.add('dashboard-active');
      
      // Force hide all landing sections
      document.querySelectorAll('.landing-content-section').forEach(sec => {
         sec.style.display = 'none !important';
         sec.style.visibility = 'hidden !important';
      });
      
      const wrapper = document.querySelector('#dashboard .dashboard-wrapper');
      if (wrapper) {
         wrapper.style.display = 'flex';
         console.log('Dashboard wrapper displayed');
      }
      
      // Show back to home button
      const backBtn = getEl('backToHomeBtn');
      if (backBtn) backBtn.style.display = 'inline-flex';
      
      if (!currentUser) {
         console.warn('No currentUser, redirecting to menu');
         document.body.classList.remove('dashboard-active');
         backToMenu();
      } else {
         console.log('Loading dashboard for user:', currentUser.name);
         fetchDashboardData();
         window.scrollTo(0, 0);
      }
   } else {
      document.body.classList.remove('dashboard-active');
      // Hide back to home button
      const backBtn = getEl('backToHomeBtn');
      if (backBtn) backBtn.style.display = 'none';
   }

   // Animate stats for introduction
   if (sectionId === 'section-introduction') {
      setTimeout(animateStats, 500);
   }
}

function backToMenu() {
   console.log('backToMenu called');
   
   // Hide all sections first
   document.querySelectorAll('.content-section').forEach(sec => {
      sec.classList.remove('active');
      sec.style.display = 'none';
      sec.style.visibility = 'hidden';
   });
   
   // Show landing sections
   document.querySelectorAll('.landing-content-section').forEach(sec => {
      sec.style.display = 'block';
      sec.style.visibility = 'visible';
   });

   // Show menu elements
   const menuGrid = getEl('menuGrid');
   const mainHeader = getEl('mainHeader');
   const mainFooter = getEl('mainFooter');
   const contentArea = getEl('contentArea');

   if (menuGrid) {
      menuGrid.style.display = 'grid';
      menuGrid.style.visibility = 'visible';
   }
   if (mainHeader) {
      mainHeader.style.display = 'block';
      mainHeader.style.visibility = 'visible';
   }
   if (mainFooter) {
      mainFooter.style.display = 'block';
      mainFooter.style.visibility = 'visible';
   }
   if (contentArea) contentArea.style.display = 'block';

   // Remove dashboard class
   document.body.classList.remove('dashboard-active');
   
   // Hide back to home button
   const backBtn = getEl('backToHomeBtn');
   if (backBtn) backBtn.style.display = 'none';
   
   // Scroll to top
   window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToDashboardTop() {
   window.scrollTo(0, 0);
   document.documentElement.scrollTop = 0;
   const dash = getEl('dashboard');
   if (dash) {
      dash.scrollIntoView({ block: 'start', behavior: 'auto' });
   }
}

// Animate Stats
function animateStats() {
   const metricValues = getEls('.metric-value[data-target]');
   metricValues.forEach((el, index) => {
      setTimeout(() => {
         const target = parseInt(el.dataset.target);
         let current = 0;
         const increment = target / 40;
         const timer = setInterval(() => {
            current += increment;
            if (current >= target) { current = target; clearInterval(timer); }
            el.textContent = Math.floor(current);
         }, 30);
      }, index * 200);
   });
}

// Tab Switching & Gallery
function switchTab(btn, tabId) {
   const container = btn.closest('.tabs-container');
   if (!container) return;
   
   container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
   btn.classList.add('active');
   
   container.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
   const target = document.getElementById(tabId);
   if (target) target.classList.add('active');
}

function filterGallery(category, btn) {
   getEls('.filter-btn').forEach(b => b.classList.remove('active'));
   btn.classList.add('active');
   getEls('.gallery-item').forEach(item => {
      if (category === 'all' || item.dataset.category === category) {
         item.style.display = 'block';
         item.style.animation = 'tabFade 0.4s ease-out';
      } else {
         item.style.display = 'none';
      }
   });
}

// ========== LOGIN MODAL ==========
function openLoginModal(e) {
   if (e) e.preventDefault();
   closeRegisterModal();
   closeForgotPasswordModal();
   const modal = getEl('loginModal');
   if (modal) {
       modal.classList.add('active');
       document.body.style.overflow = 'hidden';
   }
}

function closeLoginModal() {
   const modal = getEl('loginModal');
   if (modal) {
       modal.classList.remove('active');
       document.body.style.overflow = '';
   }
}

function openRegisterModal(e) {
   if (e) e.preventDefault();
   closeLoginModal();
   const modal = getEl('registerModal');
   if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
   }
}

function closeRegisterModal() {
   const modal = getEl('registerModal');
   if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
   }
}

function openLoginModalFromRegister(e) {
   if (e) e.preventDefault();
   closeRegisterModal();
   openLoginModal();
}

function openForgotPasswordModal(e) {
   if (e) e.preventDefault();
   closeLoginModal();
   const modal = getEl('forgotPasswordModal');
   if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
   }
}

function closeForgotPasswordModal() {
   const modal = getEl('forgotPasswordModal');
   if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
   }
}

function openLoginModalFromForgot(e) {
   if (e) e.preventDefault();
   closeForgotPasswordModal();
   openLoginModal();
}

async function handleRegister(e) {
   e.preventDefault();
   const nameField = getEl('registerName');
   const emailField = getEl('registerEmail');
   const passField = getEl('registerPassword');
   const confirmField = getEl('registerConfirmPassword');
   if (!nameField || !emailField || !passField || !confirmField) return;

   const full = nameField.value.trim();
   const parts = full.split(/\s+/).filter(Boolean);
   const firstName = parts[0] || 'User';
   const lastName = parts.length > 1 ? parts.slice(1).join(' ') : ' ';

   if (passField.value !== confirmField.value) {
      showToast((window.currentLang || 'en') === 'tr' ? 'Şifreler eşleşmiyor.' : 'Passwords do not match.', 'error');
      return;
   }

   const btn = e.target.querySelector('button[type="submit"]');
   const originalText = btn.innerHTML;
   const lang = window.currentLang || 'en';
   btn.innerHTML = lang === 'tr' ? 'Kaydediliyor...' : 'Signing up...';

   try {
      const response = await fetch('/api/users', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            name: firstName,
            surname: lastName,
            email: emailField.value.trim(),
            password: passField.value
         })
      });
      if (response.ok) {
         showToast(lang === 'tr' ? 'Kayıt tamamlandı. Giriş yapabilirsiniz.' : 'Registration complete. You can sign in.', 'success');
         closeRegisterModal();
         openLoginModal();
      } else {
         let msg = lang === 'tr' ? 'Kayıt başarısız.' : 'Registration failed.';
         try {
            const err = await response.json();
            msg = err.message || err.title || msg;
         } catch (_) { /* non-JSON body */ }
         showToast(msg, 'error');
      }
   } catch (err) {
      console.error(err);
      showToast(lang === 'tr' ? 'Sunucuya bağlanılamadı.' : 'Could not connect to server.', 'error');
   } finally {
      btn.innerHTML = originalText;
   }
}

function handleForgotPassword(e) {
   e.preventDefault();
   const lang = window.currentLang || 'en';
   showToast(lang === 'tr'
      ? 'Bu demo sürümünde şifre sıfırlama yoktur. Yönetici ile iletişime geçin veya giriş bilgilerinizi deneyin.'
      : 'Password reset is not available in this demo. Contact an administrator or use your known credentials.', 'info');
   closeForgotPasswordModal();
}

async function handleLogin(e) {
   e.preventDefault();
   const emailField = getEl('loginEmail');
   const passwordField = getEl('loginPassword');
   if (!emailField || !passwordField) return;
   
   const email = emailField.value;
   const password = passwordField.value;
   const btn = e.target.querySelector('button[type="submit"]');
   const originalText = btn.innerHTML;
   const lang = window.currentLang || 'en';
   btn.innerHTML = lang === 'tr' ? 'Giriş Yapılıyor...' : 'Signing In...';

   try {
      const response = await fetch('/api/users/login', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email, password })
      });
      if (response.ok) {
         currentUser = await response.json();
         console.log('NEON AI: Login Success', currentUser);
         closeLoginModal();
         updateNavForLoggedUser();
         
         // Dashboard'a yönlendirme - önce modal'ı kapat, sonra geçiş yap
         setTimeout(() => {
            showSection('dashboard');
            fetchDashboardData();
         }, 300);
         
         // Ensure Home Dashboard button is visible
         const hdb = getEl('homeDashboardBtn');
         if (hdb) hdb.style.display = 'inline-flex';
      } else {
         const error = await response.json();
         console.warn('NEON AI: Login Failed', error);
         showToast(error.message || ((window.currentLang || 'en') === 'tr' ? 'Giriş başarısız! Lütfen bilgilerinizi kontrol edin.' : 'Login failed! Please check your credentials.'), 'error');
      }

   } catch (err) {
      console.error('Login Error:', err);
      showToast((window.currentLang || 'en') === 'tr' ? 'Sunucuya bağlanılamadı.' : 'Could not connect to server.', 'error');
   } finally {
      btn.innerHTML = originalText;
   }
}

function updateNavForLoggedUser() {
   const loginBtn = getEl('loginBtn');
   if (loginBtn && currentUser) {
      loginBtn.onclick = (ev) => {
         ev.preventDefault();
         showSection('dashboard');
         setTimeout(scrollToDashboardTop, 650);
      };
   }
   const hdb = getEl('homeDashboardBtn');
   if (hdb && currentUser) hdb.style.display = 'inline-flex';
}

function escapeHtml(s) {
   const d = document.createElement('div');
   d.textContent = s;
   return d.innerHTML;
}

// ========== DASHBOARD NAVIGATION ==========
function switchDashSection(targetId) {
   document.querySelectorAll('.sidebar-menu li').forEach(li => {
      const dash = li.getAttribute('data-dash');
      li.classList.toggle('active', dash === targetId);
   });

   document.querySelectorAll('.dash-sub-section').forEach(sec => {
      sec.classList.remove('active');
   });
   const target = getEl(targetId);
   if (target) {
      target.classList.add('active');
      console.log(`NEON AI: Switched to ${targetId}`);
   }
   if (targetId === 'dash-qr') {
      refreshQrCode();
   }
   if (targetId === 'dash-db-explorer') {
      fetchDatabaseStats();
   }
}


async function fetchDashboardData() {
    if (!currentUser) return;
    try {
        const response = await fetch('/api/accounts');
        const accounts = await response.json();
        const userAccount = accounts.find(a => a.userId === currentUser.id);
        
        if (userAccount) {
            const balEl = getEl('dashBalance');
            const accEl = getEl('dashAccountNo');
            const curEl = getEl('dashCurrency');
            
            if (balEl) balEl.textContent = userAccount.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 });
            if (accEl) accEl.textContent = userAccount.accountNumber;
            if (curEl) curEl.textContent = userAccount.currency;

            const txResponse = await fetch('/api/transactions');
            const transactions = await txResponse.json();
            const userTxs = transactions.filter(t => t.senderAccountId === userAccount.id || t.receiverAccountId === userAccount.id);
            updateTransactionList(userTxs, userAccount.id);
            initModernDashboardCharts(userTxs, userAccount.id, userAccount.balance);
            initOverviewChart(userTxs, userAccount.id);
            refreshQrCode();
        }

        const pn = getEl('profileName');
        const ps = getEl('profileSurname');
        const pe = getEl('profileEmail');
        if (pn) pn.value = currentUser.name || '';
        if (ps) ps.value = currentUser.surname || '';
        if (pe) pe.value = currentUser.email || '';

    } catch (err) { 
        console.error('NEON AI: Dashboard Sync Error:', err);
        showToast((window.currentLang || 'en') === 'tr' ? 'Dashboard yüklenemedi.' : 'Failed to load dashboard.', 'error');
    }
}

let balanceChart = null;
let expensePieChart = null;

function initModernDashboardCharts(txs, accountId, currentBalance) {
    const lineCtx = document.getElementById('balanceLineChart');
    const pieCtx = document.getElementById('expensePieChart');
    if (!lineCtx || !pieCtx) return;

    // Destroy old charts to prevent memory leaks
    if (balanceChart) balanceChart.destroy();
    if (expensePieChart) expensePieChart.destroy();

    // Line Chart: Balance History (Simulated path from current txs)
    const labels = txs.slice(-6).map(t => new Date(t.date).toLocaleDateString('tr-TR', {day:'numeric', month:'short'}));
    const dataPoints = txs.slice(-6).map(t => t.amount); // Simplification for demo

    balanceChart = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: labels.length ? labels : ['Starting'],
            datasets: [{
                label: 'Balance',
                data: labels.length ? dataPoints : [currentBalance],
                borderColor: '#00b4d8',
                backgroundColor: 'rgba(0, 180, 216, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: false, grid: { color: 'rgba(255,255,255,0.05)' } } }
        }
    });

    // Pie Chart: Sent vs Received
    const sent = txs.filter(t => t.senderAccountId === accountId).reduce((sum, t) => sum + t.amount, 0);
    const received = txs.filter(t => t.receiverAccountId === accountId).reduce((sum, t) => sum + t.amount, 0);

    expensePieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: ['Giden', 'Gelen'],
            datasets: [{
                data: [sent || 1, received || 1],
                backgroundColor: ['#1e3a8a', '#00b4d8'],
                hoverOffset: 4,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#fff', boxWidth: 10 } } }
        }
    });
}

async function fetchDatabaseStats() {
    try {
        const [users, accounts, transactions] = await Promise.all([
            fetch('/api/users').then(r => r.json()),
            fetch('/api/accounts').then(r => r.json()),
            fetch('/api/transactions').then(r => r.json())
        ]);

        const container = getEl('dbStatsContainer');
        if (container) {
            container.innerHTML = `
                <div class="db-stat-mini glass-card"><span>Users</span><strong>${users.length}</strong></div>
                <div class="db-stat-mini glass-card"><span>Accounts</span><strong>${accounts.length}</strong></div>
                <div class="db-stat-mini glass-card"><span>Ledger</span><strong>${transactions.length}</strong></div>
            `;
        }

        const tbody = document.querySelector('#dbUsersTable tbody');
        if (tbody) {
            tbody.innerHTML = users.slice(0, 10).map(u => {
                const acc = accounts.find(a => a.userId === u.id);
                return `
                    <tr>
                        <td>${u.id}</td>
                        <td>${u.name} ${u.surname}</td>
                        <td class="bal-text">₺${acc ? acc.balance.toLocaleString() : '0'}</td>
                        <td class="risk-text">${Math.floor(Math.random() * 20)}%</td>
                    </tr>
                `;
            }).join('');
        }
    } catch (e) { console.error('DB Explorer error:', e); }
}

async function sendAiMessage() {
    const input = getEl('aiInput');
    const display = getEl('aiChatContent');
    if (!input || !display || !input.value.trim()) return;

    const userText = input.value.trim();
    input.value = '';

    // Add user message
    display.innerHTML += `
        <div class="user-bubble">
            <div class="bubble-text">${userText}</div>
        </div>
    `;
    display.scrollTop = display.scrollHeight;

    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userText })
        });
        const data = await response.json();
        
        display.innerHTML += `
            <div class="bot-bubble">
                <div class="bubble-icon">🤖</div>
                <div class="bubble-text">${data.response || 'Hata oluştu.'}</div>
            </div>
        `;
    } catch (err) {
        display.innerHTML += `
            <div class="bot-bubble error">
                <div class="bubble-icon">⚠️</div>
                <div class="bubble-text">Kumru AI şu an meşgul. Lütfen Hugging Face anahtarınızı kontrol edin.</div>
            </div>
        `;
    }
    display.scrollTop = display.scrollHeight;
}

function refreshQrCode() {
   const accEl = getEl('dashAccountNo');
   const accNo = accEl ? accEl.textContent.trim() : '';
   const payload = encodeURIComponent(`VIREON|PAY|TRY|IBAN|${accNo}|vireon.bank`);
   const img = getEl('qrPaymentImg');
   const lbl = getEl('qrAccountLabel');
   if (lbl) lbl.textContent = accNo || '-';
   if (img) {
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${payload}`;
      img.alt = 'QR';
   }
}

function handleDepositRequest() {
   const lang = window.currentLang || 'en';
   const amtField = getEl('depositAmount');
   if (!amtField) return;
   
   const amt = parseFloat(amtField.value);
   if (!amt || amt <= 0) {
      showToast(lang === 'tr' ? 'Geçerli tutar girin.' : 'Enter a valid amount.', 'warning');
      return;
   }
   const noteField = getEl('depositNote');
   const note = noteField ? noteField.value : '';
   
   showToast(lang === 'tr'
      ? `Yatırım talebi (demo): ₺${amt.toLocaleString()}${note ? ' — ' + note : ''}\nGerçek ödeme kanalı bağlı değildir.`
      : `Deposit request (demo): ₺${amt.toLocaleString()}${note ? ' — ' + note : ''}\nNo real payment rail connected.`, 'info');
   
   amtField.value = '';
   if (noteField) noteField.value = '';
}

async function handleProfileSave() {
   if (!currentUser) return;
   const lang = window.currentLang || 'en';
   
   const nameField = getEl('profileName');
   const surnameField = getEl('profileSurname');
   const emailField = getEl('profileEmail');
   
   if (!nameField || !emailField) return;
   
   const name = nameField.value.trim();
   const surname = surnameField ? surnameField.value.trim() : '';
   const email = emailField.value.trim();
   
   if (!name || !email) {
      showToast(lang === 'tr' ? 'Ad ve e-posta zorunludur.' : 'First name and email are required.', 'warning');
      return;
   }
   
   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
   if (!emailRegex.test(email)) {
      showToast(lang === 'tr' ? 'Geçerli bir e-posta adresi girin.' : 'Enter a valid email address.', 'warning');
      return;
   }
   
   try {
      const cur = await fetch(`/api/users/${currentUser.id}`).then(r => r.json());
      const res = await fetch(`/api/users/${currentUser.id}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            id: currentUser.id,
            name,
            surname: surname || ' ',
            email,
            password: cur.password
         })
      });
      if (res.ok) {
         currentUser = { ...currentUser, name, surname: surname || ' ', email };
         updateNavForLoggedUser();
         showToast(lang === 'tr' ? 'Bilgiler güncellendi.' : 'Profile updated.', 'success');
      } else {
         showToast(lang === 'tr' ? 'Güncelleme başarısız.' : 'Update failed.', 'error');
      }
   } catch (e) {
      console.error(e);
      showToast(lang === 'tr' ? 'Sunucu hatası.' : 'Server error.', 'error');
   }
}

async function handlePasswordChange() {
   if (!currentUser) return;
   const lang = window.currentLang || 'en';
   
   const curPwdField = getEl('pwdCurrent');
   const newPwdField = getEl('pwdNew');
   const confirmField = getEl('pwdConfirm');
   
   if (!curPwdField || !newPwdField || !confirmField) return;
   
   const curPwd = curPwdField.value;
   const newPwd = newPwdField.value;
   const confirm = confirmField.value;
   
   if (!curPwd || !newPwd) {
      showToast(lang === 'tr' ? 'Tüm alanları doldurun.' : 'Fill all fields.', 'warning');
      return;
   }
   if (newPwd.length < 6) {
      showToast(lang === 'tr' ? 'Yeni şifre en az 6 karakter olmalı.' : 'New password must be at least 6 characters.', 'warning');
      return;
   }
   if (newPwd !== confirm) {
      showToast(lang === 'tr' ? 'Yeni şifreler eşleşmiyor.' : 'New passwords do not match.', 'error');
      return;
   }
   try {
      const cur = await fetch(`/api/users/${currentUser.id}`).then(r => r.json());
      if (cur.password !== curPwd) {
         showToast(lang === 'tr' ? 'Mevcut şifre yanlış.' : 'Current password is incorrect.', 'error');
         return;
      }
      const res = await fetch(`/api/users/${currentUser.id}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            id: currentUser.id,
            name: cur.name,
            surname: cur.surname,
            email: cur.email,
            password: newPwd
         })
      });
      if (res.ok) {
         curPwdField.value = '';
         newPwdField.value = '';
         confirmField.value = '';
         showToast(lang === 'tr' ? 'Şifre güncellendi.' : 'Password updated.', 'success');
      } else {
         showToast(lang === 'tr' ? 'İşlem başarısız.' : 'Operation failed.', 'error');
      }
   } catch (e) {
      console.error(e);
      showToast(lang === 'tr' ? 'Sunucu hatası.' : 'Server error.', 'error');
   }
}

async function handleSendTransfer() {
   const targetField = getEl('transferTarget');
   const amountField = getEl('transferAmount');
   const descField = getEl('transferDesc');
   const btn = getEl('sendBtn');
   
   if (!targetField || !amountField || !btn) return;

   const targetId = parseInt(targetField.value);
   const amount = parseFloat(amountField.value);
   const desc = descField ? descField.value : '';

   if (!targetId || !amount || amount <= 0) {
      showToast((window.currentLang || 'en') === 'tr' ? 'Lütfen geçerli bilgiler girin.' : 'Please enter valid information.', 'warning');
      return;
   }

   const originalText = btn.innerHTML;
   btn.innerHTML = '<span class="loader-tiny"></span>';
   btn.disabled = true;

   try {
      const accountsRes = await fetch('/api/accounts');
      if (!accountsRes.ok) throw new Error('Failed to fetch accounts');
      
      const accounts = await accountsRes.json();
      const userAccount = accounts.find(a => a.userId === currentUser.id);

      if (!userAccount) throw new Error("Account not found");
      if (userAccount.balance < amount) {
         showToast((window.currentLang || 'en') === 'tr' ? 'Yetersiz bakiye!' : 'Insufficient balance!', 'error');
         return;
      }

      const response = await fetch('/api/transfers/send', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            senderAccountId: userAccount.id,
            receiverAccountId: targetId,
            amount: amount,
            description: desc || 'Transfer'
         })
      });

      if (response.ok) {
         showToast((window.currentLang || 'en') === 'tr' ? 'Transfer başarılı!' : 'Transfer successful!', 'success');
         targetField.value = '';
         amountField.value = '';
         if (descField) descField.value = '';
         fetchDashboardData();
      } else {
         const error = await response.json();
         showToast(error.message || ((window.currentLang || 'en') === 'tr' ? 'Transfer başarısız!' : 'Transfer failed!'), 'error');
      }
   } catch (err) {
      console.error('Transfer Error:', err);
      showToast((window.currentLang || 'en') === 'tr' ? 'Sunucuya bağlanılamadı.' : 'Could not connect to server.', 'error');
   } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
   }
}


function updateTransactionList(txs, accountId) {
   const list = getEl('recentTransactions');
   if (!list) return;
   const lang = window.currentLang || 'en';
   if (txs.length === 0) {
      list.innerHTML = `<p>${lang === 'tr' ? 'Henüz işlem bulunamadı.' : 'No transactions found.'}</p>`;
      return;
   }
   const outLabel = lang === 'tr' ? 'Giden transfer' : 'Outgoing transfer';
   const inLabel = lang === 'tr' ? 'Gelen transfer' : 'Incoming transfer';
   list.innerHTML = txs.map(tx => {
      const isOut = tx.senderAccountId === accountId;
      const amountClass = isOut ? 'tx-out' : 'tx-in';
      const symbol = isOut ? '-' : '+';
      return `
            <div class="tx-item">
                <div class="tx-info">
                    <span class="tx-date">${new Date(tx.date).toLocaleDateString()}</span>
                    <span class="tx-desc">${isOut ? outLabel : inLabel}</span>
                </div>
                <div class="tx-amount ${amountClass}">${symbol}₺${tx.amount}</div>
            </div>`;
    }).join('');
}

// ========== NEON AI CHAT LOGIC ==========
function toggleAIChat() {
   const win = getEl('aiChatWindow');
   const launcher = getEl('aiLauncher');
   if (win) {
      win.classList.toggle('active');
      const open = win.classList.contains('active');
      win.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (launcher) launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
         const inp = getEl('aiInput');
         if (inp) setTimeout(() => inp.focus(), 100);
      }
   }
}

async function sendAIMessage() {
   const input = getEl('aiInput');
   if (!input) return;
   const message = input.value.trim();
   if (!message) return;
   appendMessage('user', message);
   input.value = '';
   const loadingId = 'ai-loading-' + Date.now();
   appendMessage('bot', '...', loadingId);
   try {
      const response = await fetch('/api/ai/chat', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ message: message })
      });
      let text = '';
      const ct = response.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
         const data = await response.json();
         text = data.response || data.message || '';
         if (!response.ok && !text) {
            text = data.title || (typeof data.errors === 'object' ? JSON.stringify(data.errors) : '') || `HTTP ${response.status}`;
         }
      } else {
         text = await response.text();
         if (!response.ok) {
            text = (window.currentLang || 'en') === 'tr'
               ? `Sunucu hatası (${response.status})`
               : `Server error (${response.status})`;
         }
      }
      const loadingEl = getEl(loadingId);
      if (loadingEl) {
         loadingEl.innerHTML = '';
         const p = document.createElement('p');
         p.textContent = text;
         loadingEl.appendChild(p);
      }
   } catch (err) {
      console.error('AI Error:', err);
      const loadingEl = getEl(loadingId);
      if (loadingEl) loadingEl.innerHTML = `<p>${(window.currentLang || 'en') === 'tr' ? 'Neon Sistem Hatası, lütfen tekrar deneyin.' : 'Neon System Error, please try again.'}</p>`;
   }
}

function appendMessage(sender, text, id = null) {
   const body = getEl('aiChatBody');
   if (!body) return;
   const msgDiv = document.createElement('div');
   msgDiv.className = `ai-message ${sender}`;
   if (id) msgDiv.id = id;
   const p = document.createElement('p');
   p.textContent = text;
   msgDiv.appendChild(p);
   body.appendChild(msgDiv);
   body.scrollTop = body.scrollHeight;
}
// ========== ANALYTICS CHART ==========
let overviewChartInstance = null;

function initOverviewChart(txs, accountId) {
    const ctx = document.getElementById('overviewChart');
    if (!ctx) return;

    if (overviewChartInstance) {
        overviewChartInstance.destroy();
    }

    // Process data for the chart (Simple In vs Out)
    const labels = [];
    const outgoingData = [];
    const incomingData = [];

    // Filter last 7 days or last 10 txs
    const sortedTxs = [...txs].sort((a,b) => new Date(a.date) - new Date(b.date)).slice(-7);

    sortedTxs.forEach(t => {
        const dateStr = new Date(t.date).toLocaleDateString(window.currentLang === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' });
        labels.push(dateStr);
        if (t.senderAccountId === accountId) {
            outgoingData.push(t.amount);
            incomingData.push(0);
        } else {
            incomingData.push(t.amount);
            outgoingData.push(0);
        }
    });

    // If no data, add dummy data for demo as requested
    if (labels.length === 0) {
        labels.push('Demo 1', 'Demo 2', 'Demo 3', 'Demo 4');
        incomingData.push(5000, 2000, 4500, 3000);
        outgoingData.push(1200, 3100, 800, 2500);
    }

    overviewChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: window.currentLang === 'tr' ? 'Gelen' : 'Incoming',
                    data: incomingData,
                    backgroundColor: 'rgba(0, 180, 216, 0.6)',
                    borderColor: '#00b4d8',
                    borderWidth: 1,
                    borderRadius: 5
                },
                {
                    label: window.currentLang === 'tr' ? 'Giden' : 'Outgoing',
                    data: outgoingData,
                    backgroundColor: 'rgba(239, 68, 68, 0.6)',
                    borderColor: '#ef4444',
                    borderWidth: 1,
                    borderRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: 'rgba(255,255,255,0.5)' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(255,255,255,0.5)' }
                }
            },
            plugins: {
                legend: {
                    labels: { color: 'rgba(255,255,255,0.7)', font: { family: 'Outfit' } }
                }
            }
        }
    });
}

// ========== LIMIT MANAGEMENT ==========
function toggleLimitEdit() {
    const form = getEl('limitEditForm');
    if (form) {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

async function handleUpdateLimit() {
    if (!currentUser) return;
    const limitField = getEl('newMaxLimit');
    if (!limitField) return;
    
    const newLimit = parseFloat(limitField.value);
    if (!newLimit || newLimit < 0) {
        showToast((window.currentLang || 'en') === 'tr' ? 'Geçerli bir limit girin.' : 'Enter a valid limit.', 'warning');
        return;
    }

    try {
        const limitRes = await fetch('/api/dailylimits');
        if (!limitRes.ok) throw new Error('Failed to fetch limits');
        
        const allLimits = await limitRes.json();
        const userLimit = allLimits.find(l => l.userId === currentUser.id);

        if (!userLimit) {
            showToast((window.currentLang || 'en') === 'tr' ? 'Limit kaydı bulunamadı.' : 'Limit record not found.', 'error');
            return;
        }

        const response = await fetch(`/api/dailylimits/${userLimit.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: userLimit.id,
                userId: currentUser.id,
                maxDailyLimit: newLimit,
                usedLimit: userLimit.usedLimit,
                lastResetDate: userLimit.lastResetDate
            })
        });

        if (response.ok) {
            showToast((window.currentLang || 'en') === 'tr' ? 'Limit başarıyla güncellendi.' : 'Limit updated successfully.', 'success');
            toggleLimitEdit();
            fetchDashboardData();
        } else {
            showToast((window.currentLang || 'en') === 'tr' ? 'Güncelleme başarısız.' : 'Update failed.', 'error');
        }
    } catch (err) {
        console.error(err);
        showToast((window.currentLang || 'en') === 'tr' ? 'Sunucu hatası.' : 'Server error.', 'error');
    }
}
