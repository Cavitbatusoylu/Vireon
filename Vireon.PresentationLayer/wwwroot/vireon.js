/* ============================================================
 * Vireon Digital Bank - Frontend Application
 * Version: 2.0 | Clean, deduplicated, production-ready
 * ============================================================ */

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
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// ABSOLUTE SAFETY: This runs globally at the very start
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
        }
    };
    setTimeout(clearLoader, 1500);
    setTimeout(clearLoader, 3500);
})();

// Service Worker: localhost/electron'da devre dışı, prod ortamda aktif.
window.addEventListener('load', async () => {
   if (!('serviceWorker' in navigator)) return;

   const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
   const isFileProtocol = window.location.protocol === 'file:';

   if (isLocalhost || isFileProtocol) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
         await registration.unregister();
      }
      return;
   }

   try {
      await navigator.serviceWorker.register('/sw.js');
   } catch (error) {
      console.warn('Service worker register failed:', error);
   }
});

// Global state tracking
let isTransitioning = false;
let currentUser = null;
let deferredPrompt; 
let hasAnimatedStats = false;

// Safely get elements
const getEl = (id) => document.getElementById(id);
const getEls = (selector) => document.querySelectorAll(selector);
const getLocale = () => (window.currentLang === 'tr' ? 'tr-TR' : 'en-US');
const formatNumber = (value, minimumFractionDigits = 2, maximumFractionDigits = 2) =>
   new Intl.NumberFormat(getLocale(), { minimumFractionDigits, maximumFractionDigits }).format(Number(value) || 0);
const formatDate = (value, options) => new Date(value).toLocaleDateString(getLocale(), options);

async function fetchJsonOrThrow(url, options) {
   const response = await fetch(url, options);
   const payload = await response.json().catch(() => ({}));
   if (!response.ok) {
      const message = payload?.mesaj || payload?.message || `HTTP ${response.status}`;
      throw new Error(message);
   }
   return payload;
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
   try {
       // Restore user from localStorage
       const savedUser = localStorage.getItem('vireonUser');
       if (savedUser) {
           try {
               currentUser = JSON.parse(savedUser);
               console.log('User restored from localStorage:', currentUser.name);
               updateNavbarForLoggedInUser();
               
               // Restore to dashboard immediately if session exists
               showSection('dashboard');
               fetchDashboardData();
           } catch (e) {
               localStorage.removeItem('vireonUser');
           }
       }

       initNavigation();
       initInteractions();
       // Landing sayfasında metrikler ilk açılışta da dolsun.
       setTimeout(animateStats, 300);
       console.log("NEON AI: Systems Initialized Successfully");
   } catch (e) {
       console.error("NEON AI: Init Error", e);
   }
});

function initNavigation() {
   document.querySelectorAll('.menu-item').forEach(item => {
      // Kartlarda inline onclick zaten var; çift tetiklenmeyi önle.
      if (item.hasAttribute('onclick')) return;

      item.addEventListener('click', function() {
         const onclick = this.getAttribute('onclick');
         if (onclick) {
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
        const navbarHeight = 80;
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - navbarHeight;
        window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
}

function scrollToSection(id) {
    const target = getEl(id);
    if (!target) return;

    // Landing akışında kartlar sabit kalır, kullanıcı aşağı doğru section'lara iner.
    const menuGrid = getEl('menuGrid');
    const mainHeader = getEl('mainHeader');
    const mainFooter = getEl('mainFooter');
    if (menuGrid) { menuGrid.style.display = 'grid'; menuGrid.style.visibility = 'visible'; }
    if (mainHeader) { mainHeader.style.display = 'block'; mainHeader.style.visibility = 'visible'; }
    if (mainFooter) { mainFooter.style.display = 'block'; mainFooter.style.visibility = 'visible'; }

    document.querySelectorAll('.landing-content-section').forEach(sec => {
        sec.style.display = 'block';
        sec.style.visibility = 'visible';
        sec.style.opacity = '1';
    });

    document.body.classList.remove('dashboard-active');

    // Kart tıklamasında hedef bölüme güvenilir şekilde git.
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);

    if (id === 'section-introduction') setTimeout(animateStats, 500);
}

function initInteractions() {
   const loginBtn = getEl('loginBtn');
   if (loginBtn) {
      loginBtn.addEventListener('click', (e) => {
         e.preventDefault();
         if (currentUser) {
            showSection('dashboard');
         } else {
            openLoginModal(e);
         }
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

   // Modal backdrop click-to-close
   ['loginModal', 'registerModal', 'forgotPasswordModal'].forEach(id => {
      const m = getEl(id);
      if (m) {
         m.addEventListener('click', (ev) => {
            if (ev.target === m) {
               m.classList.remove('active');
               document.body.style.overflow = '';
            }
         });
      }
   });
}

function showSection(sectionId) {
   console.log('showSection called with:', sectionId);
   
   document.querySelectorAll('.content-section, .landing-content-section').forEach(sec => {
      sec.classList.remove('active');
      sec.style.display = 'none';
      sec.style.visibility = 'hidden';
   });

   const menuGrid = getEl('menuGrid');
   const mainHeader = getEl('mainHeader');
   const mainFooter = getEl('mainFooter');
   const contentArea = getEl('contentArea');

   if (menuGrid) { menuGrid.style.display = 'none'; menuGrid.style.visibility = 'hidden'; }
   if (mainHeader) { mainHeader.style.display = 'none'; mainHeader.style.visibility = 'hidden'; }
   if (mainFooter) { mainFooter.style.display = 'none'; mainFooter.style.visibility = 'hidden'; }
   if (contentArea) contentArea.style.display = 'block';

   const section = getEl(sectionId);
   if (section) {
      section.classList.add('active');
      section.style.display = 'block';
      section.style.opacity = '1';
      section.style.visibility = 'visible';
   } else {
      backToMenu();
      return;
   }

   if (sectionId === 'dashboard') {
      document.body.classList.add('dashboard-active');
      
      document.querySelectorAll('.landing-content-section').forEach(sec => {
         sec.style.display = 'none';
         sec.style.visibility = 'hidden';
      });
      
      const wrapper = document.querySelector('#dashboard .dashboard-wrapper');
      if (wrapper) wrapper.style.display = 'flex';
      
      const backBtn = getEl('backToHomeBtn');
      if (backBtn) backBtn.style.display = 'inline-flex';
      
      if (!currentUser) {
         document.body.classList.remove('dashboard-active');
         backToMenu();
      } else {
         fetchDashboardData();
         window.scrollTo(0, 0);
      }
   } else {
      document.body.classList.remove('dashboard-active');
      const backBtn = getEl('backToHomeBtn');
      if (backBtn) backBtn.style.display = 'none';
   }

   if (sectionId === 'section-introduction') setTimeout(animateStats, 500);
}

function backToMenu() {
   document.querySelectorAll('.content-section').forEach(sec => {
      sec.classList.remove('active');
      sec.style.display = 'none';
      sec.style.visibility = 'hidden';
   });
   
   document.querySelectorAll('.landing-content-section').forEach(sec => {
      sec.classList.add('active');
      sec.style.display = 'block';
      sec.style.visibility = 'visible';
      sec.style.opacity = '1';
   });

   const menuGrid = getEl('menuGrid');
   const mainHeader = getEl('mainHeader');
   const mainFooter = getEl('mainFooter');

   if (menuGrid) { menuGrid.style.display = 'grid'; menuGrid.style.visibility = 'visible'; }
   if (mainHeader) { mainHeader.style.display = 'block'; mainHeader.style.visibility = 'visible'; }
   if (mainFooter) { mainFooter.style.display = 'block'; mainFooter.style.visibility = 'visible'; }

   // Ensure overall layout wrapper is visible
   const contentArea = getEl('contentArea');
   if (contentArea) contentArea.style.display = 'block';

   document.body.classList.remove('dashboard-active');
   
   const backBtn = getEl('backToHomeBtn');
   if (backBtn) backBtn.style.display = 'none';
   
   window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToDashboardTop() {
   window.scrollTo(0, 0);
   const dash = getEl('dashboard');
   if (dash) dash.scrollIntoView({ block: 'start', behavior: 'auto' });
}

// Animate Stats
function animateStats() {
   if (hasAnimatedStats) return;

   const statElements = getEls('.metric-value[data-target]');
   if (!statElements.length) return;

   hasAnimatedStats = true;
   statElements.forEach((el, index) => {
      setTimeout(() => {
         const target = parseInt(el.dataset.target, 10);
         if (Number.isNaN(target)) return;

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

// ========== MODAL SYSTEM ==========
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

function handleForgotPassword(e) {
    e.preventDefault();
    const lang = window.currentLang || 'en';
    showToast(lang === 'tr'
       ? 'Şifre sıfırlama bu sürümde mevcut değildir.'
       : 'Password reset is not available in this version.', 'info');
    closeForgotPasswordModal();
}

// ========== AUTHENTICATION ==========
async function handleLogin(event) {
    event.preventDefault();
    
    const email = getEl('loginEmail')?.value?.trim();
    const password = getEl('loginPassword')?.value;
    const lang = window.currentLang || 'en';
    
    if (!email || !password) {
        showToast(lang === 'tr' ? 'Lütfen tüm alanları doldurun.' : 'Please fill all fields.', 'warning');
        return;
    }
    
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<span class="loader-tiny"></span>'; btn.disabled = true; }
    
    try {
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            localStorage.setItem('vireonUser', JSON.stringify(user));
            
            showToast(lang === 'tr' ? `Hoş geldin ${user.name}!` : `Welcome ${user.name}!`, 'success');
            closeLoginModal();
            updateNavbarForLoggedInUser();
            
            setTimeout(() => {
                showSection('dashboard');
                fetchDashboardData();
            }, 300);
        } else {
            const error = await response.json().catch(() => ({}));
            showToast(error.message || (lang === 'tr' ? 'E-posta veya şifre hatalı.' : 'Invalid email or password.'), 'error');
        }
    } catch (err) {
        console.error('Login error:', err);
        showToast(lang === 'tr' ? 'Sunucuya bağlanılamadı.' : 'Could not connect to server.', 'error');
    } finally {
        if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
    }
}

async function handleRegister(event) {
    event.preventDefault();
    const lang = window.currentLang || 'en';
    
    const fullName = getEl('registerName')?.value?.trim();
    const email = getEl('registerEmail')?.value?.trim();
    const password = getEl('registerPassword')?.value;
    const confirmPassword = getEl('registerConfirmPassword')?.value;
    
    if (!fullName || !email || !password || !confirmPassword) {
        showToast(lang === 'tr' ? 'Lütfen tüm alanları doldurun.' : 'Please fill all fields.', 'warning');
        return;
    }
    
    if (password !== confirmPassword) {
        showToast(lang === 'tr' ? 'Şifreler eşleşmiyor.' : 'Passwords do not match.', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast(lang === 'tr' ? 'Şifre en az 6 karakter olmalı.' : 'Password must be at least 6 characters.', 'warning');
        return;
    }
    
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const name = nameParts[0] || 'User';
    const surname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : name;
    
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<span class="loader-tiny"></span>'; btn.disabled = true; }
    
    try {
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, surname, email, password })
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast(
                lang === 'tr'
                    ? `Kayıt başarılı! Hesap No: ${result.accountNumber}`
                    : `Account created! Account No: ${result.accountNumber}`,
                'success'
            );
            closeRegisterModal();
            
            setTimeout(() => {
                const loginEmail = getEl('loginEmail');
                const loginPassword = getEl('loginPassword');
                if (loginEmail) loginEmail.value = email;
                if (loginPassword) loginPassword.value = password;
                openLoginModal();
            }, 1500);
        } else {
            const error = await response.json().catch(() => ({}));
            showToast(error.message || (lang === 'tr' ? 'Kayıt başarısız.' : 'Registration failed.'), 'error');
        }
    } catch (err) {
        console.error('Register error:', err);
        showToast(lang === 'tr' ? 'Sunucuya bağlanılamadı.' : 'Connection error.', 'error');
    } finally {
        if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
    }
}

// ========== NAVBAR MANAGEMENT ==========
function updateNavbarForLoggedInUser() {
    const loginBtn = getEl('loginBtn');
    const logoutBtn = getEl('logoutBtn');
    const dashboardBtn = getEl('homeDashboardBtn');
    
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    if (dashboardBtn) dashboardBtn.style.display = 'inline-flex';

    // Admin menü öğesini göster/gizle
    const adminMenu = getEl('adminMenuItem');
    if (adminMenu) {
        adminMenu.style.display = (currentUser && currentUser.role === 'Admin') ? 'flex' : 'none';
    }

    // Admin kırmızı tema
    if (currentUser && currentUser.role === 'Admin') {
        document.body.classList.add('admin-mode');
    } else {
        document.body.classList.remove('admin-mode');
    }

    // DB Explorer'da kullanıcı tablosunu sadece admin görsün
    const dbUsersCard = document.querySelector('#dash-db-explorer .db-preview-card');
    if (dbUsersCard) {
        dbUsersCard.style.display = (currentUser && currentUser.role === 'Admin') ? 'block' : 'none';
    }
}

function updateNavbarForLoggedOutUser() {
    const loginBtn = getEl('loginBtn');
    const logoutBtn = getEl('logoutBtn');
    const dashboardBtn = getEl('homeDashboardBtn');
    
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (dashboardBtn) dashboardBtn.style.display = 'none';

    const adminMenu = getEl('adminMenuItem');
    if (adminMenu) adminMenu.style.display = 'none';

    const dbUsersCard = document.querySelector('#dash-db-explorer .db-preview-card');
    if (dbUsersCard) dbUsersCard.style.display = 'none';
}

function handleLogout() {
    const lang = window.currentLang || 'en';
    currentUser = null;
    localStorage.removeItem('vireonUser');
    document.body.classList.remove('admin-mode');
    showToast(lang === 'tr' ? 'Çıkış yapıldı.' : 'Logged out successfully.', 'info');
    updateNavbarForLoggedOutUser();
    backToMenu();
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

   document.querySelectorAll('.dash-sub-section').forEach(sec => sec.classList.remove('active'));
   const target = getEl(targetId);
   if (target) target.classList.add('active');

   if (targetId === 'dash-qr') refreshQrCode();
   if (targetId === 'dash-db-explorer') fetchDatabaseStats();
   if (targetId === 'dash-account-info') loadAccountInfo();
   if (targetId === 'dash-admin') loadAdminPanel();
}

// ========== DASHBOARD DATA ==========
async function fetchDashboardData() {
    if (!currentUser) return;
    const lang = window.currentLang || 'en';
    try {
        const accounts = await fetchJsonOrThrow('/api/accounts');
        const userAccount = accounts.find(a => a.userId === currentUser.id);
        
        if (userAccount) {
            // Update balance display
            const balEl = getEl('dashBalance');
            const accEl = getEl('dashAccountNo');
            const curEl = getEl('dashCurrency');
            
            if (balEl) balEl.textContent = formatNumber(userAccount.balance, 2, 2);
            if (accEl) accEl.textContent = userAccount.accountNumber;
            if (curEl) curEl.textContent = userAccount.currency;

            // Fetch transactions
            const transactions = await fetchJsonOrThrow('/api/transactions');
            const userTxs = transactions.filter(t => t.senderAccountId === userAccount.id || t.receiverAccountId === userAccount.id);
            
            // Update overview transaction list
            const overviewList = getEl('overviewTransactions');
            if (overviewList) updateTransactionList(userTxs, userAccount.id, overviewList);
            
            // Update full history
            const historyList = getEl('fullTransactionHistory');
            if (historyList) updateTransactionList(userTxs, userAccount.id, historyList);
            
            initModernDashboardCharts(userTxs, userAccount.id, userAccount.balance);
            initOverviewChart(userTxs, userAccount.id);
            refreshQrCode();

            // Update daily limits
            try {
                const limits = await fetchJsonOrThrow('/api/dailylimits');
                const userLimit = limits.find(l => l.userId === currentUser.id);
                if (userLimit) {
                    const maxEl = getEl('maxLimit');
                    const usedEl = getEl('usedLimit');
                    if (maxEl) maxEl.textContent = formatNumber(userLimit.maxDailyLimit, 0, 2);
                    if (usedEl) usedEl.textContent = formatNumber(userLimit.usedLimit, 0, 2);
                }
            } catch (e) { 
                console.error('Limits fetch error:', e); 
            }
        } else {
            // Self-healing mechanism: clear corrupt or stale session if user ID is missing in the database
            console.warn('Session user account not found in database. Clearing stale session.');
            currentUser = null;
            localStorage.removeItem('vireonUser');
            showToast(lang === 'tr' ? 'Oturum süreniz doldu veya veritabanı sıfırlandı. Lütfen tekrar giriş yapın.' : 'Your session expired or database was reset. Please login again.', 'warning');
            updateNavbarForLoggedOutUser();
            backToMenu();
            return;
        }

        // Profile fields
        const pn = getEl('profileName');
        const ps = getEl('profileSurname');
        const pe = getEl('profileEmail');
        if (pn) pn.value = currentUser.name || '';
        if (ps) ps.value = currentUser.surname || '';
        if (pe) pe.value = currentUser.email || '';

    } catch (err) { 
        console.error('Dashboard Sync Error:', err);
        showToast(lang === 'tr' ? 'Dashboard yüklenemedi.' : 'Failed to load dashboard.', 'error');
    }
}

let balanceChart = null;
let expensePieChart = null;

function initModernDashboardCharts(txs, accountId, currentBalance) {
    const lineCtx = document.getElementById('balanceLineChart');
    const pieCtx = document.getElementById('expensePieChart');
    if (!lineCtx || !pieCtx) return;

    if (balanceChart) balanceChart.destroy();
    if (expensePieChart) expensePieChart.destroy();

    const labels = txs.slice(-6).map(t => formatDate(t.date, { day: 'numeric', month: 'short' }));
    const dataPoints = txs.slice(-6).map(t => t.amount);

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

    const sent = txs.filter(t => t.senderAccountId === accountId).reduce((sum, t) => sum + t.amount, 0);
    const received = txs.filter(t => t.receiverAccountId === accountId).reduce((sum, t) => sum + t.amount, 0);

    expensePieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: [(window.currentLang === 'tr' ? 'Giden' : 'Outgoing'), (window.currentLang === 'tr' ? 'Gelen' : 'Incoming')],
            datasets: [{
                data: [sent || 1, received || 1],
                backgroundColor: ['#e11d48', '#00b4d8'],
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
        const isAdmin = currentUser && currentUser.role === 'Admin';
        
        const [users, accounts, transactions] = await Promise.all([
            fetchJsonOrThrow('/api/users'),
            fetchJsonOrThrow('/api/accounts'),
            fetchJsonOrThrow('/api/transactions')
        ]);

        const container = getEl('dbStatsContainer');
        if (container) {
            container.innerHTML = `
                <div class="db-stat-mini glass-card"><span>Users</span><strong>${users.length}</strong></div>
                <div class="db-stat-mini glass-card"><span>Accounts</span><strong>${accounts.length}</strong></div>
                <div class="db-stat-mini glass-card"><span>Transactions</span><strong>${transactions.length}</strong></div>
            `;
        }

        // Kullanıcı tablosunu sadece admin görebilir
        const userTableParent = document.querySelector('#dbUsersTable')?.closest('.db-preview-card');
        if (userTableParent) {
            userTableParent.style.display = isAdmin ? 'block' : 'none';
        }

        if (isAdmin) {
            const tbody = document.querySelector('#dbUsersTable tbody');
            if (tbody) {
                tbody.innerHTML = users.slice(0, 10).map(u => {
                    const acc = accounts.find(a => a.userId === u.id);
                    return `
                        <tr>
                            <td>${u.id}</td>
                            <td>${escapeHtml(u.name)} ${escapeHtml(u.surname || '')}</td>
                            <td>${u.accountNumber || '-'}</td>
                            <td class="bal-text">₺${formatNumber(acc ? acc.balance : 0, 2, 2)}</td>
                        </tr>
                    `;
                }).join('');
            }
        }
    } catch (e) { console.error('DB Explorer error:', e); }
}

// ========== AI CHAT ==========
function toggleAIChat() {
   const win = getEl('aiChatWindow');
   const launcher = getEl('aiLauncher');
   if (win) {
      win.classList.toggle('active');
      const open = win.classList.contains('active');
      win.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (launcher) launcher.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
         const inp = getEl('floatingAiInput');
         if (inp) setTimeout(() => inp.focus(), 100);
      }
   }
}

async function sendAiMessage() {
    const input = getEl('aiInput');
    const display = getEl('aiChatContent');
    if (!input || !display || !input.value.trim()) return;

    const userText = escapeHtml(input.value.trim());
    input.value = '';

    display.innerHTML += `<div class="user-bubble"><div class="bubble-text">${userText}</div></div>`;
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
                <div class="bubble-text">${escapeHtml(data.response || 'Hata oluştu.')}</div>
            </div>
        `;
    } catch (err) {
        display.innerHTML += `
            <div class="bot-bubble error">
                <div class="bubble-icon">⚠️</div>
                <div class="bubble-text">Neon AI şu an yanıt veremiyor.</div>
            </div>
        `;
    }
    display.scrollTop = display.scrollHeight;
}

async function sendAIMessage() {
   const input = getEl('floatingAiInput');
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
            text = data.title || `HTTP ${response.status}`;
         }
      } else {
         text = await response.text();
         if (!response.ok) text = `Server error (${response.status})`;
      }
      const loadingEl = getEl(loadingId);
      if (loadingEl) {
         loadingEl.innerHTML = '';
         const p = document.createElement('p');
         p.textContent = text;
         loadingEl.appendChild(p);
      }
   } catch (err) {
      const loadingEl = getEl(loadingId);
      if (loadingEl) loadingEl.innerHTML = `<p>Neon System Error, please try again.</p>`;
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

// ========== QR CODE ==========
function refreshQrCode() {
   const accEl = getEl('dashAccountNo');
   const accNo = accEl ? accEl.textContent.trim() : '';
   const payload = encodeURIComponent(`VIREON|PAY|TRY|IBAN|${accNo}|vireon.bank`);
   const img = getEl('qrPaymentImg');
   const lbl = getEl('qrAccountLabel');
   if (lbl) lbl.textContent = accNo || '-';
   if (img) {
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${payload}`;
      img.alt = 'QR Code';
   }
}

// ========== DEPOSIT ==========
// ========== DEPOSIT ==========
async function handleDepositRequest() {
   if (!currentUser) return;
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
   
   const btn = document.querySelector('#dash-deposit .login-submit-btn');
   if (btn) btn.disabled = true;

   try {
       const response = await fetch('/api/transfers/deposit', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
               accountNumber: currentUser.accountNumber,
               amount: amt,
               description: note || (lang === 'tr' ? 'Para Yatırma' : 'Deposit')
           })
       });

       if (response.ok) {
           showToast(lang === 'tr' ? 'Para başarıyla yatırıldı!' : 'Deposit successful!', 'success');
           amtField.value = '';
           if (noteField) noteField.value = '';
           // Fetch updated balance and transactions
           fetchDashboardData();
       } else {
           const err = await response.json();
           showToast(err.mesaj || err.message || 'Error', 'error');
       }
   } catch (e) {
       console.error('Deposit error:', e);
       showToast(lang === 'tr' ? 'Sunucu hatası.' : 'Server error.', 'error');
   } finally {
       if (btn) btn.disabled = false;
   }
}

// ========== PROFILE ==========
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
      showToast(lang === 'tr' ? 'Ad ve e-posta zorunludur.' : 'Name and email are required.', 'warning');
      return;
   }
   
   try {
      const res = await fetch(`/api/users/${currentUser.id}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ id: currentUser.id, name, surname: surname || ' ', email, password: '' })
      });
      if (res.ok) {
         currentUser = { ...currentUser, name, surname: surname || ' ', email };
         localStorage.setItem('vireonUser', JSON.stringify(currentUser));
         showToast(lang === 'tr' ? 'Bilgiler güncellendi.' : 'Profile updated.', 'success');
      } else {
         const err = await res.json().catch(() => ({}));
         showToast(err.message || (lang === 'tr' ? 'Güncelleme başarısız.' : 'Update failed.'), 'error');
      }
   } catch (e) {
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
      // Backend hash kullandığı için mevcut şifreyi login endpoint'i ile doğruluyoruz.
      const verifyRes = await fetch('/api/users/login', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email: currentUser.email, password: curPwd })
      });

      if (!verifyRes.ok) {
         showToast(lang === 'tr' ? 'Mevcut şifre yanlış.' : 'Current password is incorrect.', 'error');
         return;
      }

      const res = await fetch(`/api/users/${currentUser.id}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
            id: currentUser.id,
            name: currentUser.name,
            surname: currentUser.surname || ' ',
            email: currentUser.email,
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
      showToast(lang === 'tr' ? 'Sunucu hatası.' : 'Server error.', 'error');
   }
}
// ========== TRANSFERS ==========
async function handleSendTransfer() {
   if (!currentUser || !currentUser.accountNumber) {
        const lang = window.currentLang || 'en';
        showToast(lang === 'tr' ? 'Lutfen once giris yapin.' : 'Please login first.', 'warning');
        return;
    }
    
    const lang = window.currentLang || 'en';
    const receiverAccountNumber = getEl('transferTarget')?.value?.trim()?.toUpperCase();
    const amount = parseFloat(getEl('transferAmount')?.value);
    const description = getEl('transferDesc')?.value || '';
    const btn = getEl('sendBtn');
    
    if (!receiverAccountNumber || !amount) {
        showToast(lang === 'tr' ? 'Alıcı hesap ve tutar gerekli.' : 'Receiver account and amount required.', 'warning');
        return;
    }
    
    if (amount <= 0) {
        showToast(lang === 'tr' ? 'Tutar 0\'dan büyük olmalı.' : 'Amount must be greater than 0.', 'warning');
        return;
    }
    
    if (receiverAccountNumber === currentUser.accountNumber) {
        showToast(lang === 'tr' ? 'Kendi hesabınıza transfer yapamazsınız.' : 'Cannot transfer to your own account.', 'error');
        return;
    }
    
    const originalText = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<span class="loader-tiny"></span>'; btn.disabled = true; }
    
    try {
        const response = await fetch('/api/transfers/send-by-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senderAccountNumber: currentUser.accountNumber,
                receiverAccountNumber: receiverAccountNumber,
                amount: amount,
                description: description || 'Transfer'
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            showToast(
                lang === 'tr' ? (result.mesaj || 'Transfer başarılı!') : (result.message || 'Transfer successful!'),
                'success'
            );
            
            const targetField = getEl('transferTarget');
            const amountField = getEl('transferAmount');
            const descField = getEl('transferDesc');
            if (targetField) targetField.value = '';
            if (amountField) amountField.value = '';
            if (descField) descField.value = '';
            
            fetchDashboardData();
        } else {
            const error = await response.json().catch(() => ({}));
            showToast(
                lang === 'tr' ? (error.mesaj || 'Transfer başarısız!') : (error.message || 'Transfer failed!'),
                'error'
            );
        }
    } catch (err) {
        showToast(lang === 'tr' ? 'Sunucuya bağlanılamadı.' : 'Connection error.', 'error');
    } finally {
        if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
    }
}

function updateTransactionList(txs, accountId, listElement) {
   if (!listElement) return;
   const lang = window.currentLang || 'en';
   if (!txs || txs.length === 0) {
      listElement.innerHTML = `<p class="tx-empty">${lang === 'tr' ? 'Henüz işlem bulunamadı.' : 'No transactions found.'}</p>`;
      return;
   }
   const outLabel = lang === 'tr' ? 'Giden transfer' : 'Outgoing';
   const inLabel = lang === 'tr' ? 'Gelen transfer' : 'Incoming';
   const depositLabel = lang === 'tr' ? 'Para Yatırma' : 'Deposit';
   listElement.innerHTML = txs.slice().reverse().map(tx => {
      const isDeposit = tx.senderAccountId === tx.receiverAccountId;
      const isOut = !isDeposit && tx.senderAccountId === accountId;
      const amountClass = isDeposit ? 'tx-in' : (isOut ? 'tx-out' : 'tx-in');
      const symbol = isDeposit ? '+' : (isOut ? '-' : '+');
      const label = isDeposit ? depositLabel : (isOut ? outLabel : inLabel);
      const icon = isDeposit ? '💰' : (isOut ? '📤' : '📥');
      const statusText = typeof tx.status === 'number' ? ['Pending','Completed','Failed','Cancelled'][tx.status] || '' : (tx.status || '');
      const statusBadge = statusText ? `<span class="tx-status tx-status-${statusText}">${statusText}</span>` : '';
      const desc = tx.description ? `<span class="tx-detail">${escapeHtml(tx.description)}</span>` : '';
      return `
            <div class="tx-item">
                <div class="tx-info">
                    <span class="tx-icon">${icon}</span>
                    <div class="tx-meta">
                        <span class="tx-desc">${label}</span>
                        ${desc}
                        <span class="tx-date">${new Date(tx.date).toLocaleString(getLocale(), {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                    </div>
                    ${statusBadge}
                </div>
                <div class="tx-amount ${amountClass}">${symbol}${formatNumber(tx.amount, 2, 2)} TRY</div>
            </div>`;
    }).join('');
}

// ========== ANALYTICS CHART ==========
let overviewChartInstance = null;

function initOverviewChart(txs, accountId) {
    const ctx = document.getElementById('overviewChart');
    if (!ctx) return;
    if (overviewChartInstance) overviewChartInstance.destroy();

    const labels = [];
    const outgoingData = [];
    const incomingData = [];

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
                    backgroundColor: 'rgba(225, 29, 72, 0.6)',
                    borderColor: '#e11d48',
                    borderWidth: 1,
                    borderRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)' } },
                x: { grid: { display: false }, ticks: { color: 'rgba(255,255,255,0.5)' } }
            },
            plugins: { legend: { labels: { color: 'rgba(255,255,255,0.7)', font: { family: 'Outfit' } } } }
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
    const lang = window.currentLang || 'en';
    const limitField = getEl('newMaxLimit');
    if (!limitField) return;
    
    const newLimit = parseFloat(limitField.value);
    if (!newLimit || newLimit < 0) {
        showToast(lang === 'tr' ? 'Geçerli bir limit girin.' : 'Enter a valid limit.', 'warning');
        return;
    }

    try {
        const limitRes = await fetch('/api/dailylimits');
        const allLimits = await limitRes.json();
        const userLimit = allLimits.find(l => l.userId === currentUser.id);

        if (!userLimit) {
            showToast(lang === 'tr' ? 'Limit kaydı bulunamadı.' : 'Limit record not found.', 'error');
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
            showToast(lang === 'tr' ? 'Limit güncellendi.' : 'Limit updated.', 'success');
            toggleLimitEdit();
            fetchDashboardData();
        } else {
            showToast(lang === 'tr' ? 'Güncelleme başarısız.' : 'Update failed.', 'error');
        }
    } catch (err) {
        showToast(lang === 'tr' ? 'Sunucu hatası.' : 'Server error.', 'error');
    }
}

// ========== ACCOUNT INFORMATION ==========
async function loadAccountInfo() {
    if (!currentUser) return;
    const lang = window.currentLang || 'en';

    try {
        // User details
        const accNumEl = getEl('infoAccountNumber');
        const nameEl = getEl('infoFullName');
        const emailEl = getEl('infoEmail');
        const createdEl = getEl('infoCreatedAt');
        
        if (accNumEl) accNumEl.textContent = currentUser.accountNumber || '-';
        if (nameEl) nameEl.textContent = `${currentUser.name} ${currentUser.surname || ''}`.trim();
        if (emailEl) emailEl.textContent = currentUser.email || '-';
        if (createdEl) createdEl.textContent = currentUser.createdAt ? formatDate(currentUser.createdAt, { day: 'numeric', month: 'short', year: 'numeric' }) : '-';

        // Balance
        const accounts = await fetchJsonOrThrow('/api/accounts');
        const userAccount = accounts.find(a => a.userId === currentUser.id);
        
        const balEl = getEl('infoBalance');
        const curEl = getEl('infoCurrency');
        if (balEl) balEl.textContent = userAccount ? `${formatNumber(userAccount.balance, 2, 2)} TRY` : `0.00 TRY`;
        if (curEl) curEl.textContent = userAccount?.currency || 'TRY';

        // Transaction history
        if (userAccount) {
            const transactions = await fetchJsonOrThrow('/api/transactions');
            const userTxs = transactions.filter(t => t.senderAccountId === userAccount.id || t.receiverAccountId === userAccount.id);
            
            const historyEl = getEl('infoTransactionHistory');
            if (historyEl) updateTransactionList(userTxs, userAccount.id, historyEl);
            
            const txCountEl = getEl('infoTxCount');
            if (txCountEl) txCountEl.textContent = userTxs.length;
        }
    } catch (err) {
        console.error('Account info error:', err);
        showToast(lang === 'tr' ? 'Hesap bilgileri yuklenemedi.' : 'Could not load account details.', 'error');
    }
}

// ========== ADMIN PANEL ==========
async function loadAdminPanel() {
    if (!currentUser || currentUser.role !== 'Admin') return;

    try {
        // 1. Admin Stats
        const stats = await fetchJsonOrThrow('/api/users/admin-stats');

        const setVal = (id, val) => { const el = getEl(id); if (el) el.textContent = val; };
        setVal('adminTotalUsers', stats.totalUsers);
        setVal('adminTotalAccounts', stats.totalAccounts);
        setVal('adminTotalTx', stats.totalTransactions);
        setVal('adminTotalBalance', `${formatNumber(stats.totalBalance, 2, 2)} TRY`);
        setVal('adminTotalFraud', stats.totalFraudLogs);
        setVal('adminTotalLedger', stats.totalLedgerEntries);

        // 2. All Users
        const users = await fetchJsonOrThrow('/api/users/admin-users');
        const usersBody = getEl('adminUsersBody');
        if (usersBody) {
            usersBody.innerHTML = users.map(u => `
                <tr>
                    <td>${u.id}</td>
                    <td>${escapeHtml(u.name)} ${escapeHtml(u.surname || '')}</td>
                    <td>${escapeHtml(u.email)}</td>
                    <td>${u.accountNumber || '-'}</td>
                    <td class="bal-text">${formatNumber((u.balance || 0), 2, 2)} TRY</td>
                    <td>${u.transactionCount || 0}</td>
                    <td><span class="role-badge role-${(u.role || 'User').toLowerCase()}">${u.role || 'User'}</span></td>
                </tr>
            `).join('');
        }

        // 3. All Transactions
        const txs = await fetchJsonOrThrow('/api/users/admin-transactions');
        const txBody = getEl('adminTxBody');
        if (txBody) {
            txBody.innerHTML = txs.map(tx => `
                <tr>
                    <td>${tx.id}</td>
                    <td><span class="type-badge type-${tx.type.toLowerCase()}">${tx.type}</span></td>
                    <td>${escapeHtml(tx.senderName || tx.senderAccount || '-')}</td>
                    <td>${escapeHtml(tx.receiverName || tx.receiverAccount || '-')}</td>
                    <td class="bal-text">${formatNumber(tx.amount, 2, 2)} TRY</td>
                    <td>${escapeHtml(tx.description || '-')}</td>
                    <td>${new Date(tx.date).toLocaleString(getLocale(), { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
                    <td><span class="tx-status tx-status-${tx.status}">${tx.status}</span></td>
                </tr>
            `).join('');
        }

    } catch (err) {
        console.error('Admin panel error:', err);
        const lang = window.currentLang || 'en';
        showToast(lang === 'tr' ? 'Admin panel verileri yuklenemedi.' : 'Could not load admin panel data.', 'error');
    }
}
