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

const VIREON_BOOT_KEY = 'vireon-booted';
const VIREON_TRANSITION_KEY = 'vireon-nav-transition';

function isReturnVisit() {
    try { return sessionStorage.getItem(VIREON_BOOT_KEY) === '1'; } catch { return false; }
}

function hideLoadingScreen() {
    const ls = document.getElementById('loadingScreen');
    if (!ls) return;
    ls.classList.remove('show');
    ls.classList.add('hidden');
    ls.style.opacity = '0';
    ls.style.pointerEvents = 'none';
    ls.style.visibility = 'hidden';
    setTimeout(() => { ls.style.display = 'none'; }, 400);
}

function finishInitialBoot() {
    try { sessionStorage.setItem(VIREON_BOOT_KEY, '1'); } catch { /* ignore */ }
    hideLoadingScreen();
}

function navigateWithTransition(url) {
    try { sessionStorage.setItem(VIREON_TRANSITION_KEY, '1'); } catch { /* ignore */ }
    const overlay = document.getElementById('pageTransition');
    if (!overlay) {
        window.location.href = url;
        return;
    }
    overlay.classList.remove('is-entering');
    overlay.classList.add('is-exiting');
    setTimeout(() => { window.location.href = url; }, 480);
}

function isInternalNavLink(anchor) {
    if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return false;
    if (anchor.dataset.noTransition != null) return false;
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return false;
    try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return false;
        if (url.pathname === window.location.pathname && url.search === window.location.search && !url.hash) return false;
        return true;
    } catch {
        return false;
    }
}

function isDashboardNavLink(anchor) {
    if (!anchor) return false;
    try {
        const url = new URL(anchor.href, window.location.origin);
        const path = url.pathname.replace(/\/+$/, '').toLowerCase();
        const here = window.location.pathname.replace(/\/+$/, '').toLowerCase();
        return path.startsWith('/dashboard') && here.startsWith('/dashboard');
    } catch {
        return false;
    }
}

function initPageTransitions() {
    const overlay = document.getElementById('pageTransition');
    const cameFromNav = (() => {
        try { return sessionStorage.getItem(VIREON_TRANSITION_KEY) === '1'; } catch { return false; }
    })();

    if (cameFromNav) {
        try { sessionStorage.removeItem(VIREON_TRANSITION_KEY); } catch { /* ignore */ }
        if (overlay) {
            overlay.classList.add('is-entering');
            setTimeout(() => overlay.classList.remove('is-entering'), 700);
        }
    }

    if (isReturnVisit() || cameFromNav) {
        document.documentElement.classList.add('vireon-page-enter');
        setTimeout(() => document.documentElement.classList.remove('vireon-page-enter'), 880);
    }

    document.addEventListener('click', (e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (!isReturnVisit()) return;
        const anchor = e.target.closest('a[href]');
        if (!isInternalNavLink(anchor)) return;
        if (isDashboardNavLink(anchor)) return;
        e.preventDefault();
        navigateWithTransition(anchor.href);
    });
}

// İlk ziyaret: tam yükleme ekranı; sonraki sayfalar: hızlı geçiş animasyonu
(function() {
    if (isReturnVisit()) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', hideLoadingScreen);
        } else {
            hideLoadingScreen();
        }
        return;
    }
    const clearLoader = () => finishInitialBoot();
    setTimeout(clearLoader, 1200);
    setTimeout(clearLoader, 2800);
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
let chatHistory = [];

// ========== RATE LIMITING ==========
const loginAttempts = { count: 0, firstAttempt: 0, lockedUntil: 0 };
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_LOCKOUT = 60000; // 1 minute lockout

function checkRateLimit() {
    const now = Date.now();
    if (now < loginAttempts.lockedUntil) {
        const remaining = Math.ceil((loginAttempts.lockedUntil - now) / 1000);
        return { allowed: false, remaining };
    }
    if (now - loginAttempts.firstAttempt > RATE_LIMIT_WINDOW) {
        loginAttempts.count = 0;
        loginAttempts.firstAttempt = now;
    }
    if (loginAttempts.count >= RATE_LIMIT_MAX) {
        loginAttempts.lockedUntil = now + RATE_LIMIT_LOCKOUT;
        loginAttempts.count = 0;
        return { allowed: false, remaining: Math.ceil(RATE_LIMIT_LOCKOUT / 1000) };
    }
    return { allowed: true };
}

function recordLoginAttempt() {
    if (loginAttempts.count === 0) loginAttempts.firstAttempt = Date.now();
    loginAttempts.count++;
}

// ========== SESSION TIMEOUT ==========
let sessionTimer = null;
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

function resetSessionTimer() {
    if (sessionTimer) clearTimeout(sessionTimer);
    if (!currentUser) return;
    sessionTimer = setTimeout(() => {
        const lang = window.currentLang || 'en';
        showToast(lang === 'tr' ? 'Oturum zaman aşımına uğradı.' : 'Session timed out due to inactivity.', 'warning');
        handleLogout();
    }, SESSION_TIMEOUT);
}

// Track user activity for session timeout
['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, () => {
        if (currentUser) resetSessionTimer();
    }, { passive: true });
});

// ========== INLINE VALIDATION ==========
function showFieldError(inputEl, message) {
    if (!inputEl) return;
    clearFieldError(inputEl);
    inputEl.classList.add('input-error');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error-msg';
    errorDiv.textContent = message;
    inputEl.parentElement.appendChild(errorDiv);
}

function clearFieldError(inputEl) {
    if (!inputEl) return;
    inputEl.classList.remove('input-error');
    const existing = inputEl.parentElement.querySelector('.field-error-msg');
    if (existing) existing.remove();
}

function clearAllFieldErrors(form) {
    if (!form) return;
    form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    form.querySelectorAll('.field-error-msg').forEach(el => el.remove());
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getPasswordStrength(password) {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { level: 'weak', label: t('Zayıf', 'Weak'), percent: 20 };
    if (score <= 2) return { level: 'fair', label: t('Orta', 'Fair'), percent: 40 };
    if (score <= 3) return { level: 'good', label: t('İyi', 'Good'), percent: 65 };
    if (score <= 4) return { level: 'strong', label: t('Güçlü', 'Strong'), percent: 85 };
    return { level: 'excellent', label: t('Mükemmel', 'Excellent'), percent: 100 };
}

function refreshPasswordStrengthMeters() {
    document.querySelectorAll('.password-strength-meter').forEach(meter => {
        const group = meter.closest('.form-group');
        const input = group?.querySelector('input[type="password"], input[type="text"]');
        if (input) updatePasswordStrengthMeter(input);
    });
}

function initFormValidation() {
    const loginEmail = getEl('loginEmail');
    const loginPassword = getEl('loginPassword');
    const regName = getEl('registerName');
    const regSurname = getEl('registerSurname');
    const regEmail = getEl('registerEmail');
    const regPassword = getEl('registerPassword');
    const regConfirm = getEl('registerConfirmPassword');

    if (loginEmail) {
        loginEmail.addEventListener('blur', () => {
            const val = loginEmail.value.trim();
            if (val && !validateEmail(val)) {
                showFieldError(loginEmail, window.currentLang === 'tr' ? 'Geçersiz e-posta' : 'Invalid email');
            } else { clearFieldError(loginEmail); }
        });
        loginEmail.addEventListener('input', () => clearFieldError(loginEmail));
    }
    if (loginPassword) {
        loginPassword.addEventListener('input', () => clearFieldError(loginPassword));
    }
    if (regEmail) {
        regEmail.addEventListener('blur', () => {
            const val = regEmail.value.trim();
            if (val && !validateEmail(val)) {
                showFieldError(regEmail, window.currentLang === 'tr' ? 'Geçersiz e-posta' : 'Invalid email');
            } else { clearFieldError(regEmail); }
        });
        regEmail.addEventListener('input', () => clearFieldError(regEmail));
    }
    if (regPassword) {
        regPassword.addEventListener('input', () => {
            clearFieldError(regPassword);
            updatePasswordStrengthMeter(regPassword);
        });
    }
    if (regConfirm) {
        regConfirm.addEventListener('blur', () => {
            if (regPassword && regConfirm.value && regConfirm.value !== regPassword.value) {
                showFieldError(regConfirm, window.currentLang === 'tr' ? 'Şifreler eşleşmiyor' : 'Passwords do not match');
            } else { clearFieldError(regConfirm); }
        });
        regConfirm.addEventListener('input', () => clearFieldError(regConfirm));
    }
    [regName, regSurname, regEmail, regPassword, regConfirm].forEach(el => {
        if (el) el.addEventListener('input', () => clearFieldError(el));
    });
}

function updatePasswordStrengthMeter(inputEl) {
    const parent = inputEl.closest('.form-group');
    if (!parent) return;
    let meter = parent.querySelector('.password-strength-meter');
    const val = inputEl.value;
    if (!val) { if (meter) meter.remove(); return; }
    if (!meter) {
        meter = document.createElement('div');
        meter.className = 'password-strength-meter';
        meter.innerHTML = '<div class="strength-bar"><div class="strength-fill"></div></div><span class="strength-label"></span>';
        parent.appendChild(meter);
    }
    const strength = getPasswordStrength(val);
    const fill = meter.querySelector('.strength-fill');
    const label = meter.querySelector('.strength-label');
    if (fill) { fill.style.width = strength.percent + '%'; fill.className = 'strength-fill strength-' + strength.level; }
    if (label) { label.textContent = strength.label; label.className = 'strength-label strength-' + strength.level; }
}

// Safely get elements
const getEl = (id) => document.getElementById(id);
const getEls = (selector) => document.querySelectorAll(selector);
const lang = () => window.currentLang || 'en';
const t = (tr, en) => (lang() === 'tr' ? tr : en);
const getLocale = () => (lang() === 'tr' ? 'tr-TR' : 'en-US');
const pickApiMessage = (payload, fallbackTr, fallbackEn) => {
   if (!payload) return t(fallbackTr, fallbackEn);
   return lang() === 'tr'
      ? (payload.mesaj || payload.message || t(fallbackTr, fallbackEn))
      : (payload.message || payload.mesaj || t(fallbackTr, fallbackEn));
};
const formatNumber = (value, minimumFractionDigits = 2, maximumFractionDigits = 2) =>
   new Intl.NumberFormat(getLocale(), { minimumFractionDigits, maximumFractionDigits }).format(Number(value) || 0);
const formatDate = (value, options) => new Date(value).toLocaleDateString(getLocale(), options);

// Backend TransactionManager ile aynı simülasyon kurları (TRY baz)
const FX_RATES = { TRY: 1, USD: 46.14, EUR: 53.33, GBP: 61.82 };
const FX_CURRENCIES = ['TRY', 'USD', 'EUR', 'GBP'];
let currentAccountCurrency = 'TRY';
let accountByNumber = {};
let transferReceiverCurrency = null;

function currencySymbol(code) {
   const c = String(code || 'TRY').toUpperCase();
   if (c === 'TRY') return '₺';
   if (c === 'USD') return '$';
   if (c === 'EUR') return '€';
   if (c === 'GBP') return '£';
   return c + ' ';
}

function convertCurrencyClient(amount, fromCurrency, toCurrency) {
   const from = String(fromCurrency || 'TRY').toUpperCase();
   const to = String(toCurrency || 'TRY').toUpperCase();
   if (from === to) return Number(amount) || 0;
   if (!FX_RATES[from] || !FX_RATES[to]) return null;
   const inTry = (Number(amount) || 0) * FX_RATES[from];
   return inTry / FX_RATES[to];
}

function formatMoney(amount, currencyCode) {
   const code = String(currencyCode || 'TRY').toUpperCase();
   return `${currencySymbol(code)}${formatNumber(amount, 2, 2)} ${code}`;
}

function indexAccountsByNumber(accounts) {
   accountByNumber = {};
   (accounts || []).forEach(a => {
      const num = String(a.accountNumber ?? a.AccountNumber ?? '').trim().toUpperCase();
      if (!num) return;
      accountByNumber[num] = {
         currency: String(a.currency ?? a.Currency ?? 'TRY').toUpperCase(),
         balance: Number(a.balance ?? a.Balance ?? 0)
      };
   });
}

function updateBalanceCurrencyDisplay(currencyCode) {
   const code = String(currencyCode || 'TRY').toUpperCase();
   currentAccountCurrency = code;
   const symEl = getEl('dashBalanceSymbol');
   const curEl = getEl('dashCurrency');
   const labelEl = getEl('transferAmountLabel');
   if (symEl) symEl.textContent = currencySymbol(code);
   if (curEl) curEl.textContent = code;
   if (labelEl) {
      labelEl.textContent = t(`Miktar (${currencySymbol(code)}${code})`, `Amount (${currencySymbol(code)}${code})`);
   }
   renderExchangeRatesPanel();
}

function renderBalanceFxBreakdown(tryBalance) {
   const panel = getEl('dashFxBreakdown');
   if (!panel) return;
   const base = Number(tryBalance) || 0;
   const chips = FX_CURRENCIES.map(code => {
      const converted = convertCurrencyClient(base, 'TRY', code);
      if (converted == null) return '';
      return `<span class="fx-balance-chip" title="${code}"><span class="fx-balance-symbol">${currencySymbol(code)}</span><span class="fx-balance-value">${formatNumber(converted, 2, 2)}</span><span class="fx-balance-code">${code}</span></span>`;
   }).join('');
   panel.innerHTML = chips;
}

function renderExchangeRatesPanel() {
   const panel = getEl('fxRatesPanel');
   if (!panel) return;
   const base = currentAccountCurrency;
   const rows = FX_CURRENCIES.filter(c => c !== base).map(c => {
      const oneUnit = convertCurrencyClient(1, c, base);
      if (oneUnit == null) return '';
      return `<span class="fx-rate-chip">1 ${c} = ${formatMoney(oneUnit, base)}</span>`;
   }).join('');
   panel.innerHTML = rows || `<span class="fx-rate-chip">${base}</span>`;
}

function getTransferTargetCurrency() {
   const sim = getEl('transferFxSimCurrency')?.value;
   if (sim) return String(sim).toUpperCase();
   if (transferReceiverCurrency) return transferReceiverCurrency;
   const acc = getEl('transferTarget')?.value?.trim()?.toUpperCase();
   if (acc && accountByNumber[acc]) return accountByNumber[acc].currency;
   return currentAccountCurrency;
}

function updateTransferFxPreview() {
   const preview = getEl('transferFxPreview');
   if (!preview) return;
   const amount = parseFloat(getEl('transferAmount')?.value);
   const targetCur = getTransferTargetCurrency();
   const senderCur = currentAccountCurrency;

   if (!amount || amount <= 0) {
      preview.innerHTML = `<span class="fx-preview-muted">${t('Tutar girince kur önizlemesi burada görünür.', 'Enter an amount to preview the exchange rate.')}</span>`;
      preview.className = 'transfer-fx-preview';
      return;
   }

   if (senderCur === targetCur) {
      preview.innerHTML = `<span class="fx-preview-same">${t('Aynı para birimi — kur dönüşümü yok.', 'Same currency — no conversion.')}</span> <strong>${formatMoney(amount, senderCur)}</strong>`;
      preview.className = 'transfer-fx-preview is-same';
      return;
   }

   const converted = convertCurrencyClient(amount, senderCur, targetCur);
   if (converted == null) {
      preview.innerHTML = `<span class="fx-preview-muted">${t('Desteklenmeyen para birimi.', 'Unsupported currency.')}</span>`;
      preview.className = 'transfer-fx-preview';
      return;
   }

   const simNote = getEl('transferFxSimCurrency')?.value && !transferReceiverCurrency
      ? t(' (simülasyon)', ' (simulated)')
      : '';
   preview.innerHTML = `
      <span class="fx-preview-label">${t('Tahmini karşılık', 'Estimated equivalent')}${simNote}:</span>
      <strong>${formatMoney(amount, senderCur)}</strong>
      <span class="fx-preview-arrow">→</span>
      <strong class="fx-preview-target">${formatMoney(converted, targetCur)}</strong>
      <span class="fx-preview-muted">${t('Simülasyon kuru — backend ile aynı tablo', 'Simulated rate — same table as backend')}</span>`;
   preview.className = 'transfer-fx-preview is-cross';
}

async function fetchJsonOrThrow(url, options) {
   const response = await fetch(url, options);
   const payload = await response.json().catch(() => ({}));
   if (!response.ok) {
      const message = payload?.mesaj || payload?.message || `HTTP ${response.status}`;
      throw new Error(message);
   }
   return payload;
}

// ========== SESSION ==========
// "Beni Hatırla" işaretliyse localStorage (kalıcı), değilse sessionStorage (sekme kapanınca silinir).
const SESSION_KEY = 'vireonUser';
const REMEMBER_KEY = 'vireonRemember';
const REMEMBER_EMAIL_KEY = 'vireonRememberEmail';
const AI_HISTORY_KEY = 'vireonAiHistory';

function saveSession(user, remember) {
   const data = JSON.stringify(user);
   if (remember) {
      localStorage.setItem(SESSION_KEY, data);
      localStorage.setItem(REMEMBER_KEY, '1');
      sessionStorage.removeItem(SESSION_KEY);
      const email = user?.email || user?.Email;
      if (email) localStorage.setItem(REMEMBER_EMAIL_KEY, String(email).toLowerCase());
   } else {
      sessionStorage.setItem(SESSION_KEY, data);
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(REMEMBER_KEY);
   }
}
function loadSessionRaw() {
   return sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
}
function loadSession() {
   return loadSessionRaw();
}
function isRememberedSession() {
   return localStorage.getItem(REMEMBER_KEY) === '1' && !!localStorage.getItem(SESSION_KEY);
}
function restoreLoginFormFromRemember() {
   const rememberEl = getEl('rememberMe');
   const emailEl = getEl('loginEmail');
   const remembered = isRememberedSession();
   const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
   if (rememberEl) rememberEl.checked = remembered || !!savedEmail;
   if (savedEmail && emailEl && !emailEl.value) emailEl.value = savedEmail;
}
function clearSession() {
   localStorage.removeItem(SESSION_KEY);
   sessionStorage.removeItem(SESSION_KEY);
   localStorage.removeItem(REMEMBER_KEY);
}
function clearRememberedEmail() {
   localStorage.removeItem(REMEMBER_EMAIL_KEY);
}
// currentUser güncellendiğinde mevcut oturumu (hangi store kullanılıyorsa) yeniden yazar.
function persistCurrentUser() {
   if (!currentUser) return;
   const data = JSON.stringify(currentUser);
   const remember = isRememberedSession();
   if (remember || localStorage.getItem(SESSION_KEY) !== null) {
      localStorage.setItem(SESSION_KEY, data);
      localStorage.setItem(REMEMBER_KEY, '1');
      sessionStorage.removeItem(SESSION_KEY);
   } else if (sessionStorage.getItem(SESSION_KEY) !== null) {
      sessionStorage.setItem(SESSION_KEY, data);
   }
}

function pickField(obj, ...keys) {
   if (!obj) return undefined;
   for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null) return obj[k];
   }
   return undefined;
}
function accountUserId(acc) { return pickField(acc, 'userId', 'UserId'); }
function accountBalance(acc) { return Number(pickField(acc, 'balance', 'Balance') ?? 0); }

/** Kullanıcı dashboard — DB'deki gerçek kullanılabilir bakiye */
function availableBalance(rawBalance) {
    const n = Number(rawBalance);
    return Number.isFinite(n) ? n : 0;
}
function txSenderId(tx) { return pickField(tx, 'senderAccountId', 'SenderAccountId'); }
function txReceiverId(tx) { return pickField(tx, 'receiverAccountId', 'ReceiverAccountId'); }
function currentUserId() { return pickField(currentUser, 'id', 'Id'); }

function getVireonPage() {
   return document.body?.dataset?.vireonPage || '';
}

function isDashboardPage() {
   return getVireonPage().startsWith('dashboard-');
}

const DASHBOARD_ROUTES = {
   'dash-overview': '/Dashboard/Overview',
   'dash-transfers': '/Dashboard/Transfer',
   'dash-deposit': '/Dashboard/Deposit',
   'dash-qr': '/Dashboard/Qr',
   'dash-history': '/Dashboard/History',
   'dash-limits': '/Dashboard/Limits',
   'dash-db-explorer': '/Dashboard/DbExplorer',
   'dash-account-info': '/Dashboard/AccountInfo',
   'dash-ai-coach': '/Dashboard/AiCoach',
   'dash-profile': '/Dashboard/Profile',
   'dash-password': '/Dashboard/Password',
   'dash-admin': '/Dashboard/Admin'
};

function goToDashboard(sectionId) {
   const url = DASHBOARD_ROUTES[sectionId] || '/Dashboard/Overview';
   window.location.href = url;
}

async function initDashboardPage() {
   const savedUser = loadSession();
   if (savedUser) {
      try { currentUser = JSON.parse(savedUser); } catch { clearSession(); }
   }
   if (!currentUser) {
      window.location.href = '/Account/Login';
      return;
   }
   document.body.classList.add('dashboard-active');
   updateNavbarForLoggedInUser();
   resetSessionTimer();
   await fetchDashboardData();

   const sectionId = getVireonPage().replace('dashboard-', '');
   if (sectionId === 'dash-qr') refreshQrCode();
   if (sectionId === 'dash-transfers') {
      initTransferFxUi();
      renderExchangeRatesPanel();
      updateTransferFxPreview();
   }
   if (sectionId === 'dash-deposit') {
      initDepositFxUi();
      updateDepositFxPreview();
   }
   if (sectionId === 'dash-db-explorer') fetchDatabaseStats();
   if (sectionId === 'dash-account-info') loadAccountInfo();
   if (sectionId === 'dash-admin') loadAdminPanel();
   if (sectionId === 'dash-ai-coach') renderAiHistoryPanel();
   if (sectionId === 'dash-profile') populateProfileSettingsFields();
   syncNavbarContext();
}

// ========== PAGE REFRESH BOOTSTRAP ==========
function normalizeAppPath(pathname) {
   const p = (pathname || '/').replace(/\/+$/, '').toLowerCase();
   return p || '/';
}

function isHomePath(path) {
   return path === '/' || path === '/home' || path === '/home/index';
}

function isDashboardPath(path) {
   return path === '/dashboard' || path.startsWith('/dashboard/');
}

function isPageReload() {
   try {
      if (sessionStorage.getItem('vireon-refresh') === '1') {
         sessionStorage.removeItem('vireon-refresh');
         return true;
      }
   } catch (_) { /* ignore */ }
   const nav = performance.getEntriesByType?.('navigation')?.[0];
   if (nav) return nav.type === 'reload' || nav.type === 'back_forward';
   return !!(performance.navigation && performance.navigation.type === 1);
}

window.addEventListener('keydown', (e) => {
   if (e.key === 'F5' || (e.key === 'r' && (e.ctrlKey || e.metaKey))) {
      try { sessionStorage.setItem('vireon-refresh', '1'); } catch (_) { /* ignore */ }
   }
}, true);

function resetHomePageOnRefresh() {
   window.scrollTo(0, 0);
   if (document.getElementById('section-introduction')) {
      applyIntroPanelState('explore', { scrollPanel: false });
   }
   hasAnimatedStats = false;
   getEls('.metric-value[data-target]').forEach(el => {
      el.textContent = '0';
      el.classList.remove('count-done');
   });
   setTimeout(() => animateStats(), 400);
   if (typeof animateHomeMetricChips === 'function') animateHomeMetricChips();
}

/**
 * F5 davranışı:
 * - Ana menü (/) → normal ana sayfa, en üste sıfırla (girişli olsa bile dashboard'a gitme)
 * - Girişli + dashboard içi (Overview hariç) → Genel Bakış
 * - Girişli + Tanıtım/Mimari vb. → olduğu sayfada kal
 * - Girişsiz + alt sayfa → ana menüye dön
 */
function handlePageRefreshBootstrap() {
   const path = normalizeAppPath(window.location.pathname);
   const page = document.body?.dataset?.vireonPage || '';
   const reloading = isPageReload();

   // Ana menü: her zaman normal landing; F5 ile en üste sıfırla
   if (isHomePath(path) || page === 'home') {
      if (reloading) {
         requestAnimationFrame(() => resetHomePageOnRefresh());
      }
      return false;
   }

   if (!reloading) return false;

   const savedUser = loadSession();
   if (savedUser) {
      try { currentUser = JSON.parse(savedUser); } catch { clearSession(); currentUser = null; }
   }

   if (page === 'login' || page === 'register' || page === 'forgot-password') {
      return false;
   }

   // Yalnızca hesap (dashboard) içindeyken Genel Bakış'a al
   if (currentUser && isDashboardPath(path) && path !== '/dashboard/overview') {
      window.location.replace('/Dashboard/Overview');
      return true;
   }

   // Girişli kullanıcı proje sayfalarında (Tanıtım, Mimari…) → sayfada kal
   if (currentUser) return false;

   window.location.replace('/');
   return true;
}

window.addEventListener('pageshow', (event) => {
   const path = normalizeAppPath(window.location.pathname);
   const page = document.body?.dataset?.vireonPage || '';
   if (event.persisted && (isHomePath(path) || page === 'home')) {
      resetHomePageOnRefresh();
   }
});

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
   try {
       try {
           if (sessionStorage.getItem(VIREON_BOOT_KEY) !== '1') {
               sessionStorage.setItem(VIREON_BOOT_KEY, '1');
           }
       } catch { /* ignore */ }

       if (handlePageRefreshBootstrap()) return;

       const page = getVireonPage();
       const savedUser = loadSession();
       if (savedUser) {
           try {
               currentUser = JSON.parse(savedUser);
               updateNavbarForLoggedInUser();
               resetSessionTimer();
           } catch (e) {
               clearSession();
           }
       }

       if (isDashboardPage()) {
           initDashboardPage().catch(e => console.error('Dashboard init error:', e));
       } else if (page === 'login' || page === 'register' || page === 'forgot-password') {
           if (currentUser) {
               window.location.href = '/Dashboard/Overview';
           } else if (page === 'login') {
               restoreLoginFormFromRemember();
           }
           updateNavbarForLoggedOutUser();
           const loginBtn = getEl('loginBtn');
           if (loginBtn) loginBtn.style.display = 'none';
       } else {
           if (currentUser) syncNavbarContext();
           else updateNavbarForLoggedOutUser();
       }

       initPageTransitions();
       initInteractions();
       initPasswordToggles();
       initFormValidation();
       initDeleteAccountGuard();

       if (document.getElementById('section-introduction')) {
           const explore = document.getElementById('intro-explore');
           if (explore && !explore.hidden) {
               setTimeout(() => animateStats(), 500);
           }
       }

       initMvcAnimations();
       initArchCodeBlocks();
       balanceSectionCardTypography();

       if (getVireonPage() === 'home') {
           initHomePageEffects();
       }

       if (document.body.classList.contains('vireon-page--section')) {
           initSectionPageEffects();
       }
   } catch (e) {
       console.error("NEON AI: Init Error", e);
   }
});

function applyIntroPanelState(mode, options = {}) {
    const scrollPanel = options.scrollPanel === true;
    const doc = getEl('intro-documentation');
    const explore = getEl('intro-explore');
    const primaryBtn = document.querySelector('#section-introduction .intro-cta-primary');
    const secondaryBtn = document.querySelector('#section-introduction .intro-cta-secondary');

    const showDoc = mode === 'documentation';
    const showExplore = mode === 'explore';

    if (doc) {
        doc.hidden = !showDoc;
        doc.classList.toggle('is-active', showDoc);
    }
    if (explore) {
        explore.hidden = !showExplore;
        explore.classList.toggle('is-active', showExplore);
    }

    primaryBtn?.classList.toggle('is-active', showExplore);
    secondaryBtn?.classList.toggle('is-active', showDoc);

    if (showExplore) {
        animateStats();
    }

    if (!scrollPanel) return;

    window.setTimeout(() => {
        if (showDoc && doc) {
            doc.classList.add('intro-doc-highlight');
            doc.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            window.setTimeout(() => doc.classList.remove('intro-doc-highlight'), 1800);
        } else if (showExplore && explore) {
            explore.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 300);
}

function showIntroPanel(mode, options = {}) {
    const scrollPanel = options.scrollPanel !== false;
    if (!getEl('section-introduction')) {
        window.location.href = '/Home/Introduction';
        return;
    }
    applyIntroPanelState(mode, { scrollPanel });
}

function scrollToIntroDocumentation() {
    showIntroPanel('documentation');
}

function initInteractions() {
   const loginBtn = getEl('loginBtn');
   if (loginBtn) {
      loginBtn.addEventListener('click', (e) => {
         if (currentUser) {
            e.preventDefault();
            navigateWithTransition('/Dashboard/Overview');
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

   document.querySelectorAll('#section-introduction .intro-cta-primary').forEach(btn => {
      btn.addEventListener('click', () => showIntroPanel('explore'));
   });
   document.querySelectorAll('#section-introduction .intro-cta-secondary').forEach(btn => {
      btn.addEventListener('click', () => showIntroPanel('documentation'));
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

function backToMenu() {
   window.location.href = '/';
}

// ========== HOME PAGE — Premium effects ==========
let homeStatusInterval = null;

function animateHomeMetricChips() {
   getEls('.home-metric-chip__val[data-count]').forEach((el, i) => {
      const target = parseInt(el.dataset.count, 10);
      if (Number.isNaN(target)) return;
      let current = 0;
      const step = Math.max(1, Math.ceil(target / 30));
      el.textContent = '0';
      setTimeout(() => {
         const timer = setInterval(() => {
            current += step;
            if (current >= target) { current = target; clearInterval(timer); }
            el.textContent = String(current);
         }, 35);
      }, 200 + i * 120);
   });
}

function initHomeCardTilt() {
   if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

   getEls('.home-nav-card[data-tilt]').forEach(card => {
      const accent = card.dataset.accent;
      if (accent) card.style.setProperty('--card-accent', accent);

      card.addEventListener('mousemove', (e) => {
         const rect = card.getBoundingClientRect();
         const x = e.clientX - rect.left;
         const y = e.clientY - rect.top;
         const cx = rect.width / 2;
         const cy = rect.height / 2;
         const rotateX = ((y - cy) / cy) * -9;
         const rotateY = ((x - cx) / cx) * 9;
         card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px) scale(1.02)`;
         card.classList.add('is-tilted');
         const glow = card.querySelector('.home-nav-card__glow');
         if (glow) {
            glow.style.setProperty('--mx', `${(x / rect.width) * 100}%`);
            glow.style.setProperty('--my', `${(y / rect.height) * 100}%`);
         }
      });

      card.addEventListener('mouseleave', () => {
         card.style.transform = '';
         card.classList.remove('is-tilted');
      });
   });
}

function initHomeStatusRotator() {
   const el = getEl('homeStatusText');
   if (!el) return;
   if (homeStatusInterval) clearInterval(homeStatusInterval);

   const messages = lang() === 'tr'
      ? [
         'Sistem hazır — modüllere erişmek için kartları seçin',
         'ACID uyumlu işlem motoru aktif',
         'Neon AI asistanı bankacılık panelinde',
         'EF Core migration şeması yüklü',
         'Fraud tespiti gerçek zamanlı izleniyor'
      ]
      : [
         'System ready — select a card to access modules',
         'ACID-compliant transaction engine active',
         'Neon AI assistant available in dashboard',
         'EF Core migration schema loaded',
         'Fraud detection monitoring in real time'
      ];

   let idx = 0;
   homeStatusInterval = setInterval(() => {
      idx = (idx + 1) % messages.length;
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      setTimeout(() => {
         el.textContent = messages[idx];
         el.style.opacity = '1';
         el.style.transform = 'translateY(0)';
      }, 280);
   }, 4200);

   el.style.transition = 'opacity 0.28s ease, transform 0.28s ease';
}

/** Girişliyken ana menü normal kalsın; Giriş kartını gizle, panele navbar'dan git. */
function syncHomeAuthCard() {
   const card = getEl('homeAuthCard');
   if (!card) return;

   if (currentUser) {
      card.style.display = 'none';
      card.setAttribute('aria-hidden', 'true');
   } else {
      card.style.display = '';
      card.removeAttribute('aria-hidden');
      card.href = '/Account/Login';
      card.classList.add('home-nav-card--cta');
      card.classList.remove('home-nav-card--dashboard');
   }
}

function applyCardDensityClass(el, compactClass, spaciousClass, textEl, options = {}) {
   if (!el || !textEl) return;
   el.classList.remove(compactClass, spaciousClass);

   const hint = el.dataset.density;
   if (hint === 'compact') { el.classList.add(compactClass); return; }
   if (hint === 'spacious') { el.classList.add(spaciousClass); return; }
   if (hint === 'normal') return;

   const text = (textEl.textContent || '').trim();
   const style = window.getComputedStyle(textEl);
   const lineHeight = parseFloat(style.lineHeight) || 18;
   const lines = textEl.scrollHeight / lineHeight;
   const longThreshold = options.longChars ?? 58;
   const shortThreshold = options.shortChars ?? 36;

   if (lines > 2.15 || text.length > longThreshold) {
      el.classList.add(compactClass);
   } else if (lines < 1.55 && text.length < shortThreshold) {
      el.classList.add(spaciousClass);
   }
}

function balanceHomeNavCardTypography() {
   getEls('.home-nav-card').forEach(card => {
      if (card.classList.contains('home-nav-card--cta')) return;
      applyCardDensityClass(
         card,
         'home-nav-card--compact',
         'home-nav-card--spacious',
         card.querySelector('.home-nav-card__desc'),
         { longChars: 50, shortChars: 34 }
      );
   });
}

function balanceArchCodeBlockTypography() {
   getEls('[data-arch-block]').forEach(block => {
      if (block.classList.contains('arch-code-block--dense') || block.classList.contains('arch-code-block--relaxed')) return;
      const count = block.querySelectorAll('.arch-file-list li').length;
      block.classList.remove('arch-code-block--dense', 'arch-code-block--relaxed');
      if (count >= 6) block.classList.add('arch-code-block--dense');
      else if (count <= 4) block.classList.add('arch-code-block--relaxed');
   });
}

function balanceSectionCardTypography() {
   getEls('.value-card').forEach(card => {
      applyCardDensityClass(card, 'value-card--compact', 'value-card--spacious', card.querySelector('p'));
   });
   getEls('.arch-feature-card').forEach(card => {
      applyCardDensityClass(card, 'arch-feature-card--compact', 'arch-feature-card--spacious', card.querySelector('p'));
   });
   getEls('.team-card').forEach(card => {
      const desc = card.querySelector('.team-info p:not(.team-role)');
      applyCardDensityClass(card, 'team-card--compact', 'team-card--spacious', desc, { longChars: 42, shortChars: 28 });
   });
}

function balanceCardTypography() {
   balanceHomeNavCardTypography();
   balanceArchCodeBlockTypography();
   balanceSectionCardTypography();
}

function ensureHomeNavCardsVisible() {
   getEls('.home-nav-card').forEach(card => {
      card.style.opacity = '1';
      if (!card.matches(':hover')) card.style.transform = 'translateY(0)';
   });
}

function initHomePageEffects() {
   syncHomeAuthCard();
   animateHomeMetricChips();
   initHomeStatusRotator();
   balanceHomeNavCardTypography();
   setTimeout(ensureHomeNavCardsVisible, 1500);
}

function ensureSectionCardsVisible() {
   getEls('.team-card, .value-card, .arch-feature-card').forEach(card => {
      card.style.opacity = '1';
      if (!card.matches(':hover')) {
         card.style.transform = 'translateY(0)';
      }
   });
}

function initSectionPageEffects() {
   if (!document.body.classList.contains('vireon-page--section')) return;
   setTimeout(ensureSectionCardsVisible, 1200);
}

// ========== ARCH CODE BLOCKS — yumuşak giriş, tıklamada zıplama yok ==========
function initArchCodeBlocks() {
   const blocks = getEls('[data-arch-block]');
   if (!blocks.length) return;

   if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      blocks.forEach(b => b.classList.add('is-arch-in'));
      return;
   }

   const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
         if (!entry.isIntersecting) return;
         const el = entry.target;
         const idx = Number(el.dataset.archIndex || 0);
         el.style.setProperty('--arch-delay', `${idx * 0.15}s`);
         el.classList.add('is-arch-in');
         observer.unobserve(el);
      });
   }, { threshold: 0.2, rootMargin: '0px 0px -20px 0px' });

   blocks.forEach((block, i) => {
      block.dataset.archIndex = String(i);
      const rect = block.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.9) {
         block.style.setProperty('--arch-delay', `${i * 0.15}s`);
         block.classList.add('is-arch-in');
      } else {
         observer.observe(block);
      }
   });
}

// ========== MVC SCROLL & MICRO ANIMATIONS ==========
function initMvcAnimations() {
   if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

   const revealSelectors = [
      '.glass-card:not(.balance-hero)',
      '.transfer-card',
      '.intro-hero',
      '.intro-tech',
      '.section-header',
      '.arch-diagram:not(.arch-code-map)',
      '.contact-form',
      '.gallery-item',
      '.testimonial-card',
      '.feature-card',
      '.component-card',
      '.desktop-feature',
      '.about-stat-card'
   ];

   const seen = new WeakSet();
   let revealIndex = 0;

   revealSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
         if (seen.has(el)) return;
         seen.add(el);
         const variant = el.classList.contains('intro-hero') ? 'animate-reveal-scale'
            : el.classList.contains('section-header') ? 'animate-reveal-left'
            : 'animate-reveal';
         el.classList.add(variant);
         el.style.setProperty('--reveal-delay', `${Math.min(revealIndex * 0.07, 0.55)}s`);
         revealIndex++;
      });
   });

   const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
         if (!entry.isIntersecting) return;
         entry.target.classList.add('is-revealed');
         observer.unobserve(entry.target);
      });
   }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

   document.querySelectorAll('.animate-reveal, .animate-reveal-left, .animate-reveal-scale').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92) {
         requestAnimationFrame(() => el.classList.add('is-revealed'));
      } else {
         observer.observe(el);
      }
   });

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
            if (current >= target) {
               current = target;
               clearInterval(timer);
               el.classList.add('count-done');
               setTimeout(() => el.classList.remove('count-done'), 500);
            }
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
    restoreLoginFormFromRemember();
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
    const email = getEl('forgotPasswordEmail')?.value?.trim();
    const accountNumber = getEl('forgotPasswordAccountNo')?.value?.trim()?.toUpperCase();
    const newPassword = getEl('forgotPasswordNew')?.value;
    const confirmPassword = getEl('forgotPasswordConfirm')?.value;
    submitForgotPassword({ email, accountNumber, newPassword, confirmPassword, lang, onSuccess: () => {
        closeForgotPasswordModal();
        openLoginModal();
    }});
}

async function submitForgotPassword({ email, accountNumber, newPassword, confirmPassword, lang, onSuccess }) {
    if (!email || !accountNumber || !newPassword) {
        showToast(lang === 'tr' ? 'Tüm alanları doldurun.' : 'Fill in all fields.', 'warning');
        return;
    }
    if (newPassword.length < 6) {
        showToast(lang === 'tr' ? 'Şifre en az 6 karakter olmalı.' : 'Password must be at least 6 characters.', 'warning');
        return;
    }
    if (newPassword !== confirmPassword) {
        showToast(lang === 'tr' ? 'Yeni şifreler eşleşmiyor.' : 'New passwords do not match.', 'error');
        return;
    }

    try {
        const res = await fetch('/api/users/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, accountNumber, newPassword, confirmPassword })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            showToast(data.message || (lang === 'tr' ? 'Şifre güncellendi.' : 'Password updated.'), 'success');
            if (typeof onSuccess === 'function') onSuccess();
        } else {
            showToast(data.message || (lang === 'tr' ? 'İşlem başarısız.' : 'Operation failed.'), 'error');
        }
    } catch (err) {
        console.error('Forgot password error:', err);
        showToast(lang === 'tr' ? 'Sunucu hatası.' : 'Server error.', 'error');
    }
}

// ========== AUTHENTICATION ==========
async function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    clearAllFieldErrors(form);

    const emailEl = getEl('loginEmail');
    const passwordEl = getEl('loginPassword');
    const email = emailEl?.value?.trim();
    const password = passwordEl?.value;
    const lang = window.currentLang || 'en';

    // Rate limiting: çok fazla başarısız denemede geçici kilit
    const rateCheck = checkRateLimit();
    if (!rateCheck.allowed) {
        showToast(lang === 'tr'
            ? `Çok fazla deneme. ${rateCheck.remaining} saniye bekleyin.`
            : `Too many attempts. Please wait ${rateCheck.remaining} seconds.`, 'error');
        return;
    }

    // Inline validation
    let hasError = false;
    if (!email) {
        showFieldError(emailEl, lang === 'tr' ? 'E-posta gerekli' : 'Email is required');
        hasError = true;
    } else if (!validateEmail(email)) {
        showFieldError(emailEl, lang === 'tr' ? 'Geçerli bir e-posta girin' : 'Enter a valid email');
        hasError = true;
    }
    if (!password) {
        showFieldError(passwordEl, lang === 'tr' ? 'Şifre gerekli' : 'Password is required');
        hasError = true;
    }
    if (hasError) return;
    
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<span class="loader-tiny"></span>'; btn.disabled = true; }
    
    try {
        recordLoginAttempt();
        const response = await fetch('/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            loginAttempts.count = 0; // başarılı girişte rate limit sayacını sıfırla
            const remember = !!getEl('rememberMe')?.checked;
            if (remember) localStorage.setItem(REMEMBER_EMAIL_KEY, email.toLowerCase());
            else clearRememberedEmail();
            saveSession(user, remember);
            resetSessionTimer();

            showToast(lang === 'tr' ? `Hoş geldin ${user.name}!` : `Welcome ${user.name}!`, 'success');
            if (typeof closeLoginModal === 'function') closeLoginModal();
            updateNavbarForLoggedInUser();
            setTimeout(() => { window.location.href = '/Dashboard/Overview'; }, 300);
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
    
    const name = getEl('registerName')?.value?.trim();
    const surname = getEl('registerSurname')?.value?.trim();
    const email = getEl('registerEmail')?.value?.trim();
    const password = getEl('registerPassword')?.value;
    const confirmPassword = getEl('registerConfirmPassword')?.value;
    
    if (!name || !surname || !email || !password || !confirmPassword) {
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
    
    const btn = event.target.querySelector('button[type="submit"]');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = '<span class="loader-tiny"></span>'; btn.disabled = true; }
    
    try {
        const response = await fetch('/api/users/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, surname, email: email.toLowerCase(), password })
        });
        
        if (response.ok) {
            const result = await response.json();
            const accountNo = result.accountNumber || result.AccountNumber || '';
            showToast(
                lang === 'tr'
                    ? `Kayıt başarılı! Hesap No: ${accountNo}`
                    : `Account created! Account No: ${accountNo}`,
                'success'
            );
            closeRegisterModal();

            // Admin açıkken kayıt: listeyi yenile (işlem geçmişi değişmez)
            if (currentUser?.role === 'Admin') {
                loadAdminPanel();
                if (getEl('dash-db-explorer')?.classList.contains('active')) fetchDatabaseStats();
            }

            // Yeni kullanıcıyı otomatik giriş yap (dashboard'da görünsün)
            if (!currentUser) {
                try {
                    const loginRes = await fetch('/api/users/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password })
                    });
                    if (loginRes.ok) {
                        currentUser = await loginRes.json();
                        loginAttempts.count = 0;
                        saveSession(currentUser, !!getEl('rememberMe')?.checked);
                        resetSessionTimer();
                        updateNavbarForLoggedInUser();
                        showToast(lang === 'tr' ? `Hoş geldin ${currentUser.name}!` : `Welcome ${currentUser.name}!`, 'success');
                        setTimeout(() => { window.location.href = '/Dashboard/Overview'; }, 300);
                        return;
                    }
                } catch (e) {
                    console.warn('Auto-login after register failed:', e);
                }
            }

            setTimeout(() => { window.location.href = '/Account/Login'; }, 800);
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
/** Dashboard: Ana Menü görünür. Ana sayfa (giriş sonrası): buton sırası ters, Ana Menü gizli. */
function syncNavbarContext() {
    const page = getVireonPage();
    const isHome = page === 'home';
    const onDashboard = document.body.classList.contains('dashboard-active') || page.startsWith('dashboard-');
    const backBtn = getEl('backToHomeBtn');
    const dashBtn = getEl('dashboardNavBtn');
    if (backBtn) {
        if (!isHome) {
            backBtn.style.display = 'inline-flex';
        } else {
            backBtn.style.display = (currentUser && onDashboard) ? 'inline-flex' : 'none';
        }
    }
    if (dashBtn) {
        dashBtn.style.display = (currentUser && !onDashboard) ? 'inline-flex' : 'none';
    }
    document.body.classList.toggle('nav-landing-mode', !!(currentUser && !onDashboard && isHome));
    document.body.classList.toggle('vireon-logged-in', !!currentUser);
    syncHomeAuthCard();
}

function updateNavbarForLoggedInUser() {
    const loginBtn = getEl('loginBtn');
    const logoutBtn = getEl('logoutBtn');
    
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    syncNavbarContext();

    const isAdmin = currentUser && currentUser.role === 'Admin';

    // Admin menü öğesini göster/gizle
    const adminMenu = getEl('adminMenuItem');
    if (adminMenu) {
        adminMenu.style.display = isAdmin ? 'flex' : 'none';
    }

    // DB Explorer yalnızca admin kullanıcılarda görünür.
    const dbExplorerMenu = document.querySelector('.sidebar-menu li a[href*="DbExplorer"]')?.closest('li')
        || document.querySelector('.sidebar-menu li[data-dash="dash-db-explorer"]');
    if (dbExplorerMenu) dbExplorerMenu.style.display = isAdmin ? 'flex' : 'none';

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
    
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
    document.body.classList.remove('nav-landing-mode');
    syncNavbarContext();

    const adminMenu = getEl('adminMenuItem');
    if (adminMenu) adminMenu.style.display = 'none';

    const dbUsersCard = document.querySelector('#dash-db-explorer .db-preview-card');
    if (dbUsersCard) dbUsersCard.style.display = 'none';
}

function handleLogout() {
    const lang = window.currentLang || 'en';
    if (sessionTimer) { clearTimeout(sessionTimer); sessionTimer = null; }
    currentUser = null;
    clearSession();
    document.body.classList.remove('admin-mode');
    resetAllApplicationUi();

    showToast(lang === 'tr' ? 'Çıkış yapıldı.' : 'Logged out successfully.', 'info');
    updateNavbarForLoggedOutUser();
    window.location.href = '/Account/Login';
}

function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

// ========== PASSWORD SHOW/HIDE ==========
const PWD_ICON_EYE = '<svg class="pwd-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const PWD_ICON_EYE_OFF = '<svg class="pwd-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';

function initPasswordToggles() {
    document.querySelectorAll('input[type="password"]').forEach(input => {
        if (input.dataset.toggleReady === '1') return;
        input.dataset.toggleReady = '1';

        const wrap = document.createElement('div');
        wrap.className = 'pwd-wrap';
        input.parentNode.insertBefore(wrap, input);
        wrap.appendChild(input);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pwd-toggle';
        btn.setAttribute('aria-label', 'Show password');
        btn.innerHTML = PWD_ICON_EYE;
        btn.addEventListener('click', () => {
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            btn.innerHTML = show ? PWD_ICON_EYE_OFF : PWD_ICON_EYE;
            btn.classList.toggle('active', show);
            btn.setAttribute('aria-label', show ? t('Şifreyi gizle', 'Hide password') : t('Şifreyi göster', 'Show password'));
        });
        wrap.appendChild(btn);
    });
}

// ========== RECEIVER NAME LOOKUP ==========
let _receiverLookupTimer = null;
function lookupReceiverName() {
    const input = getEl('transferTarget');
    const hint = getEl('transferReceiverName');
    if (!input || !hint) return;

    const acc = input.value.trim().toUpperCase();
    const lang = window.currentLang || 'en';
    clearTimeout(_receiverLookupTimer);

    if (!acc || acc.length < 4) { hint.textContent = ''; hint.className = 'receiver-name-hint'; return; }

    _receiverLookupTimer = setTimeout(async () => {
        try {
            const res = await fetch(`/api/users/search?accountNumber=${encodeURIComponent(acc)}`);
            if (!res.ok) {
                transferReceiverCurrency = null;
                hint.textContent = lang === 'tr' ? '⚠ Hesap bulunamadı' : '⚠ Account not found';
                hint.className = 'receiver-name-hint error';
                updateTransferFxPreview();
                return;
            }
            const u = await res.json();
            const fullName = `${u.name || ''} ${u.surname || ''}`.trim();
            const accMeta = accountByNumber[acc];
            transferReceiverCurrency = accMeta?.currency || 'TRY';
            const curLabel = transferReceiverCurrency;
            if (fullName) {
                hint.textContent = `✓ ${fullName} · ${curLabel}`;
            } else {
                hint.textContent = curLabel ? `✓ ${curLabel}` : '';
            }
            hint.className = 'receiver-name-hint ok';
            updateTransferFxPreview();
        } catch {
            transferReceiverCurrency = null;
            hint.textContent = '';
            hint.className = 'receiver-name-hint';
            updateTransferFxPreview();
        }
    }, 350);
}

function initTransferFxUi() {
   const amountEl = getEl('transferAmount');
   const targetEl = getEl('transferTarget');
   const simEl = getEl('transferFxSimCurrency');
   if (amountEl && !amountEl.dataset.fxReady) {
      amountEl.dataset.fxReady = '1';
      amountEl.addEventListener('input', updateTransferFxPreview);
   }
   if (targetEl && !targetEl.dataset.fxReady) {
      targetEl.dataset.fxReady = '1';
      targetEl.addEventListener('input', () => {
         if (!targetEl.value.trim()) transferReceiverCurrency = null;
      });
   }
   if (simEl && !simEl.dataset.fxReady) {
      simEl.dataset.fxReady = '1';
      simEl.addEventListener('change', updateTransferFxPreview);
   }
   renderExchangeRatesPanel();
   updateTransferFxPreview();
}

// ========== LANGUAGE CHANGE HOOK ==========
// switchLang (index.html) statik [data-tr] öğelerini günceller; JS ile üretilen
// içerik (işlem listeleri, admin tabloları) burada yeniden render edilir.
window.onLanguageChange = function () {
    try {
        renderAiHistoryPanel();
        refreshPasswordStrengthMeters();
        const transferTarget = getEl('transferTarget');
        if (transferTarget && transferTarget.value.trim()) lookupReceiverName();
        updateBalanceCurrencyDisplay(currentAccountCurrency);
        updateTransferFxPreview();
        updateDepositFxPreview();
        if (getVireonPage() === 'home') {
            initHomeStatusRotator();
            syncHomeAuthCard();
            balanceHomeNavCardTypography();
        }
        balanceSectionCardTypography();
        balanceArchCodeBlockTypography();
        if (currentUser) {
            fetchDashboardData();
            if (currentUser.role === 'Admin') loadAdminPanel();
            const accInfo = getEl('dash-account-info');
            if (accInfo && accInfo.classList.contains('active')) loadAccountInfo();
        }
    } catch (e) { console.error('Language refresh error:', e); }
};

// ========== FULL APPLICATION RESET (giriş / çıkış / yenileme) ==========
function clearAccountInfoDisplay() {
    const placeholders = {
        infoAccountNumber: '-',
        infoFullName: '-',
        infoEmail: '-',
        infoCreatedAt: '-',
        infoCurrency: 'TRY',
        infoTxCount: '0',
        infoBalance: '₺0.00'
    };
    Object.entries(placeholders).forEach(([id, val]) => {
        const el = getEl(id);
        if (el) el.textContent = val;
    });
    const hist = getEl('infoTransactionHistory');
    if (hist) hist.innerHTML = `<p class="tx-empty">${t('Yükleniyor...', 'Loading...')}</p>`;
}

function clearAdminPanelDisplay() {
    const loading = t('Veriler yükleniyor...', 'Loading data...');
    const statDefaults = {
        adminTotalUsers: '0',
        adminTotalAccounts: '0',
        adminTotalTx: '0',
        adminTotalDeposits: '0',
        adminTotalTransfers: '0',
        adminTotalBalance: '₺0',
        adminTotalFraud: '0',
        adminTotalLedger: '0'
    };
    Object.entries(statDefaults).forEach(([id, val]) => {
        const el = getEl(id);
        if (el) el.textContent = val;
    });
    const updatedEl = getEl('adminLastUpdated');
    if (updatedEl) updatedEl.textContent = loading;
    ['adminUsersBody', 'adminTxBody', 'adminFraudBody'].forEach(id => {
        const el = getEl(id);
        if (el) el.innerHTML = '';
    });
}

function clearDbExplorerDisplay() {
    const container = getEl('dbStatsContainer');
    if (container) container.innerHTML = '';
    const tbody = document.querySelector('#dbUsersTable tbody');
    if (tbody) tbody.innerHTML = '';
}

function clearQrDisplay() {
    const lbl = getEl('qrAccountLabel');
    if (lbl) lbl.textContent = '-';
    const img = getEl('qrPaymentImg');
    if (img) {
        img.removeAttribute('src');
        img.alt = 'QR Code';
    }
}

function clearAllFormInputs() {
    const roots = ['#dashboard', '#loginModal', '#registerModal', '#forgotPasswordModal'];
    roots.forEach(selector => {
        const root = document.querySelector(selector);
        if (!root) return;
        root.querySelectorAll('input, textarea, select').forEach(el => {
            if (el.type === 'checkbox' || el.type === 'radio') {
                el.checked = false;
            } else if (el.type !== 'file' && el.type !== 'button' && el.type !== 'submit') {
                el.value = '';
            }
        });
    });

    const deleteBtn = getEl('deleteAccountBtn');
    if (deleteBtn) deleteBtn.disabled = true;
    const deleteEmailConfirm = getEl('deleteAccountEmailConfirm');
    if (deleteEmailConfirm) deleteEmailConfirm.placeholder = '';

    const receiverHint = getEl('transferReceiverName');
    if (receiverHint) {
        receiverHint.textContent = '';
        receiverHint.className = 'receiver-name-hint';
    }

    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    document.querySelectorAll('.field-error-msg').forEach(el => el.remove());
}

function resetAiChatUi() {
    const dashWelcome = t(
        'Merhaba! Ben Neon. Senin bankacılık işlemlerini analiz ediyorum. Sana nasıl yardımcı olabilirim?',
        'Hi! I\'m Neon. I analyze your banking activity. How can I help you?'
    );
    const floatWelcome = t(
        'Merhaba! Ben Neon. Bankacılık işlemlerinizde size nasıl yardımcı olabilirim?',
        'Hello! I\'m Neon. How can I assist you with your banking transactions today?'
    );

    const aiContent = getEl('aiChatContent');
    if (aiContent) {
        aiContent.innerHTML = `<div class="bot-bubble"><div class="bubble-icon">\u{1F916}</div><div class="bubble-text">${escapeHtml(dashWelcome)}</div></div>`;
    }
    const aiBody = getEl('aiChatBody');
    if (aiBody) {
        aiBody.innerHTML = `<div class="ai-message bot"><p>${escapeHtml(floatWelcome)}</p></div>`;
    }

    chatHistory = [];
    try { localStorage.removeItem(AI_HISTORY_KEY); } catch (_) { /* ignore */ }
    persistAiChatHistoryToStorage();
    renderAiHistoryPanel();
}

function clearLimitsDisplay() {
    ['maxLimit', 'usedLimit', 'remainingLimit'].forEach(id => {
        const el = getEl(id);
        if (el) el.textContent = '0';
    });
    const pctEl = getEl('limitUsagePct');
    if (pctEl) pctEl.textContent = `0% ${t('kullanıldı', 'used')}`;
    const fillEl = getEl('limitProgressFill');
    if (fillEl) fillEl.style.width = '0%';
    const labelEl = getEl('limitProgressLabel');
    if (labelEl) labelEl.textContent = `₺0 / ₺0`;
    const resetEl = getEl('lastResetDate');
    if (resetEl) resetEl.textContent = '—';
    const limitForm = getEl('limitEditForm');
    if (limitForm) limitForm.style.display = 'none';
    const newMax = getEl('newMaxLimit');
    if (newMax) newMax.value = '';
}

function resetAllApplicationUi() {
    clearTimeout(_receiverLookupTimer);
    _receiverLookupTimer = null;
    accountDirectory = {};
    accountByNumber = {};
    transferReceiverCurrency = null;
    currentAccountCurrency = 'TRY';

    if (balanceChart) { balanceChart.destroy(); balanceChart = null; }
    if (expensePieChart) { expensePieChart.destroy(); expensePieChart = null; }
    if (overviewChartInstance) { overviewChartInstance.destroy(); overviewChartInstance = null; }

    clearAllFormInputs();
    clearLimitsDisplay();
    clearAccountInfoDisplay();
    clearAdminPanelDisplay();
    clearDbExplorerDisplay();
    clearQrDisplay();

    const balEl = getEl('dashBalance');
    const accEl = getEl('dashAccountNo');
    const curEl = getEl('dashCurrency');
    if (balEl) balEl.textContent = '0.00';
    if (accEl) accEl.textContent = '**** ****';
    if (curEl) curEl.textContent = 'TRY';
    const symEl = getEl('dashBalanceSymbol');
    if (symEl) symEl.textContent = '₺';
    const labelEl = getEl('transferAmountLabel');
    if (labelEl) labelEl.textContent = t('Miktar (₺TRY)', 'Amount (₺TRY)');
    renderExchangeRatesPanel();
    updateTransferFxPreview();

    const loadingMsg = t('Yükleniyor...', 'Loading...');
    const overviewList = getEl('overviewTransactions');
    const historyList = getEl('fullTransactionHistory');
    if (overviewList) overviewList.innerHTML = `<p class="tx-empty">${loadingMsg}</p>`;
    if (historyList) historyList.innerHTML = `<p class="tx-empty">${loadingMsg}</p>`;

    resetAiChatUi();

    const aiWin = getEl('aiChatWindow');
    const aiLauncher = getEl('aiLauncher');
    if (aiWin) {
        aiWin.classList.remove('active');
        aiWin.setAttribute('aria-hidden', 'true');
    }
    if (aiLauncher) aiLauncher.setAttribute('aria-expanded', 'false');
    const historyPanel = getEl('floatingAiHistoryPanel');
    if (historyPanel) {
        historyPanel.classList.remove('is-open');
        historyPanel.setAttribute('aria-hidden', 'true');
    }
    const historyBtn = getEl('floatingAiHistoryBtn');
    if (historyBtn) historyBtn.setAttribute('aria-expanded', 'false');

    if (getEl('loginModal')) closeLoginModal();
    if (getEl('registerModal')) closeRegisterModal();
    if (getEl('forgotPasswordModal')) closeForgotPasswordModal();
    document.body.style.overflow = '';

    window.scrollTo(0, 0);
}

function resetDashboardState() {
    resetAllApplicationUi();
}

// ========== DASHBOARD NAVIGATION ==========
function switchDashSection(targetId) {
   const url = DASHBOARD_ROUTES[targetId];
   if (url) {
      window.location.href = url;
      return;
   }
   document.querySelectorAll('.dash-sub-section').forEach(sec => sec.classList.remove('active'));
   const target = getEl(targetId);
   if (target) target.classList.add('active');
}

function populateProfileSettingsFields() {
   if (!currentUser) return;

   const sensitiveIds = [
      'deleteAccountPassword', 'deleteAccountEmailConfirm', 'deleteAccountPhrase',
      'profileResetNewPwd', 'profileResetConfirmPwd', 'pwdCurrent', 'pwdNew', 'pwdConfirm'
   ];
   sensitiveIds.forEach(id => {
      const el = getEl(id);
      if (el) el.value = '';
   });
   const deleteAck = getEl('deleteAccountAck');
   if (deleteAck) deleteAck.checked = false;
   const deleteBtn = getEl('deleteAccountBtn');
   if (deleteBtn) deleteBtn.disabled = true;

   const pn = getEl('profileName');
   const ps = getEl('profileSurname');
   const pe = getEl('profileEmail');
   if (pn) pn.value = currentUser.name || '';
   if (ps) ps.value = currentUser.surname || '';
   if (pe) pe.value = currentUser.email || '';

   const resetEmail = getEl('profileResetEmail');
   const resetAcc = getEl('profileResetAccountNo');
   if (resetEmail) resetEmail.value = currentUser.email || '';
   if (resetAcc) resetAcc.value = currentUser.accountNumber || getEl('dashAccountNo')?.textContent?.trim() || '';

   const deleteEmailHint = getEl('deleteAccountEmailConfirm');
   if (deleteEmailHint) {
      deleteEmailHint.value = '';
      deleteEmailHint.placeholder = currentUser.email || '';
   }
}

// ========== DASHBOARD DATA ==========
async function fetchDashboardData() {
    if (!currentUser) return;
    const lang = window.currentLang || 'en';
    try {
        const accounts = await fetchJsonOrThrow('/api/accounts');
        // Karşı taraf isimlerini gösterebilmek için kullanıcı rehberini oluştur.
        const directoryUsers = await fetchJsonOrThrow('/api/users').catch(() => []);
        buildAccountDirectory(accounts, directoryUsers);
        indexAccountsByNumber(accounts);
        const userAccount = accounts.find(a => accountUserId(a) === currentUserId());
        
        if (userAccount) {
            const rawBalance = accountBalance(userAccount);
            const displayBalance = availableBalance(rawBalance);
            const userCurrency = userAccount.currency ?? userAccount.Currency ?? 'TRY';
            currentUser = { ...currentUser, balance: rawBalance, accountNumber: userAccount.accountNumber ?? userAccount.AccountNumber, currency: userCurrency };
            persistCurrentUser();
            // Update balance display
            const balEl = getEl('dashBalance');
            const accEl = getEl('dashAccountNo');
            
            if (balEl) balEl.textContent = formatNumber(displayBalance, 2, 2);
            if (accEl) accEl.textContent = userAccount.accountNumber ?? userAccount.AccountNumber;
            updateBalanceCurrencyDisplay(userCurrency);
            renderBalanceFxBreakdown(displayBalance);

            // Fetch transactions
            const transactions = await fetchJsonOrThrow('/api/transactions');
            const acctId = userAccount.id ?? userAccount.Id;
            const userTxs = transactions.filter(t => txSenderId(t) === acctId || txReceiverId(t) === acctId);
            
            // Update overview transaction list
            const overviewList = getEl('overviewTransactions');
            if (overviewList) updateTransactionList(userTxs, acctId, overviewList);
            
            // Update full history
            const historyList = getEl('fullTransactionHistory');
            if (historyList) updateTransactionList(userTxs, acctId, historyList);
            
            initModernDashboardCharts(userTxs, acctId, displayBalance);
            initOverviewChart(userTxs, acctId);
            refreshQrCode();

            // Update daily limits
            try {
                const limits = await fetchJsonOrThrow('/api/dailylimits');
                const userLimit = limits.find(l => (l.userId ?? l.UserId) === currentUserId());
                if (userLimit) updateLimitsDisplay(userLimit);
            } catch (e) { 
                console.error('Limits fetch error:', e); 
            }
        } else {
            // Self-healing mechanism: clear corrupt or stale session if user ID is missing in the database
            console.warn('Session user account not found in database. Clearing stale session.');
            currentUser = null;
            clearSession();
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
        populateProfileSettingsFields();

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

    const sorted = [...txs].sort((a, b) => new Date(a.date) - new Date(b.date));
    const timeline = buildBalanceTimeline(sorted, accountId, Number(currentBalance) || 0);
    const labels = timeline.map(p => formatDate(p.date, { day: 'numeric', month: 'short' }));
    const dataPoints = timeline.map(p => p.balance);

    balanceChart = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: labels.length ? labels : [t('Başlangıç', 'Start')],
            datasets: [{
                label: t('Bakiye', 'Balance'),
                data: dataPoints.length ? dataPoints : [currentBalance],
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
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: document.documentElement.getAttribute('data-theme') === 'light' ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)' },
                    ticks: { color: document.documentElement.getAttribute('data-theme') === 'light' ? '#64748b' : 'rgba(255,255,255,0.6)' }
                },
                x: {
                    ticks: { color: document.documentElement.getAttribute('data-theme') === 'light' ? '#64748b' : 'rgba(255,255,255,0.6)' }
                }
            }
        }
    });

    const sent = sorted
        .filter(t => txSenderId(t) === accountId && txReceiverId(t) !== accountId)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const received = sorted
        .filter(t => txReceiverId(t) === accountId && txSenderId(t) !== accountId)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const deposits = sorted
        .filter(t => txSenderId(t) === accountId && txReceiverId(t) === accountId)
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const incoming = received + deposits;
    const outgoing = sent;
    const pieLabels = [t('Giden', 'Outgoing'), t('Gelen', 'Incoming')];
    const pieData = incoming === 0 && outgoing === 0 ? [1, 0] : [outgoing, incoming];

    expensePieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: pieLabels,
            datasets: [{
                data: pieData,
                backgroundColor: ['#e11d48', '#00b4d8'],
                hoverOffset: 4,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: document.documentElement.getAttribute('data-theme') === 'light' ? '#334155' : '#fff', boxWidth: 10 } } }
        }
    });
}

function buildBalanceTimeline(sortedTxs, accountId, currentBalance) {
    if (!sortedTxs.length) {
        return [{ date: new Date(), balance: currentBalance }];
    }
    const points = [];
    let running = currentBalance;
    for (let i = sortedTxs.length - 1; i >= 0; i--) {
        const t = sortedTxs[i];
        points.unshift({ date: t.date, balance: running });
        const sender = txSenderId(t);
        const receiver = txReceiverId(t);
        const amt = Number(t.amount || 0);
        const isDeposit = sender === receiver;
        if (isDeposit && sender === accountId) running -= amt;
        else if (sender === accountId && receiver !== accountId) running += amt;
        else if (receiver === accountId && sender !== accountId) running -= amt;
    }
    return points;
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
                <div class="db-stat-mini glass-card"><span>${window.currentLang === 'tr' ? 'Kullanıcı' : 'Users'}</span><strong>${users.length}</strong></div>
                <div class="db-stat-mini glass-card"><span>${window.currentLang === 'tr' ? 'Hesap' : 'Accounts'}</span><strong>${accounts.length}</strong></div>
                <div class="db-stat-mini glass-card"><span>${window.currentLang === 'tr' ? 'İşlem' : 'Transactions'}</span><strong>${transactions.length}</strong></div>
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
                const sorted = [...users].sort((a, b) => (b.id ?? b.Id ?? 0) - (a.id ?? a.Id ?? 0));
                tbody.innerHTML = sorted.slice(0, 20).map((u, idx) => {
                    const uid = u.id ?? u.Id;
                    const acc = accounts.find(a => (a.userId ?? a.UserId) === uid);
                    return `
                        <tr>
                            <td>${idx + 1}</td>
                            <td>${escapeHtml(u.name)} ${escapeHtml(u.surname || '')}</td>
                            <td>${u.accountNumber || '-'}</td>
                            <td class="bal-text">₺${formatNumber(presentationBalance(acc?.balance, { email: u.email, role: u.role, accountNumber: u.accountNumber }), 2, 2)}</td>
                        </tr>
                    `;
                }).join('');
            }
        }
    } catch (e) { console.error('DB Explorer error:', e); }
}

// ========== AI CHAT ==========
function formatBotMessageHtml(text) {
   if (!text) return '';
   const lines = String(text).split('\n').map(l => l.trim()).filter(Boolean);
   const bulletLines = lines.filter(l => /^[•\-\*]/.test(l) || l.includes(':**') || (l.startsWith('•')));
   if (bulletLines.length >= 2 || (lines.length >= 3 && bulletLines.length >= 1)) {
      const items = lines.map(line => {
         let clean = line.replace(/^[•\-\*]\s*/, '');
         clean = clean.replace(/\*\*([^*]+)\*\*:\s*/g, '$1: ');
         clean = clean.replace(/\*\*([^*]+)\*\*/g, '$1');
         return `<li>${escapeHtml(clean)}</li>`;
      }).join('');
      return `<ul class="bot-help-list">${items}</ul>`;
   }
   return escapeHtml(text).replace(/\n/g, '<br>');
}

function persistAiChatHistoryToStorage() {
   try {
      localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(chatHistory.slice(-20)));
   } catch (_) { /* ignore quota */ }
}

function loadAiChatHistoryFromStorage() {
   try {
      const raw = localStorage.getItem(AI_HISTORY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) chatHistory = parsed.slice(-20);
   } catch (_) {
      chatHistory = [];
   }
}

function renderAiHistoryPanel() {
   const lists = [getEl('aiChatHistoryList'), getEl('floatingAiHistoryList')];
   const empty = t('Henüz mesaj yok.', 'No messages yet.');
   const html = chatHistory.length
      ? chatHistory.slice(-10).reverse().map(entry => {
         const role = entry.role === 'user' ? t('Siz', 'You') : 'Neon';
         const preview = escapeHtml(String(entry.content || ''));
         return `<li><span class="ai-history-role">${role}</span><span class="ai-history-text">${preview}</span></li>`;
      }).join('')
      : `<li class="ai-history-empty">${empty}</li>`;
   lists.forEach(list => { if (list) list.innerHTML = html; });
}

function clearAiChatHistory() {
   chatHistory = [];
   persistAiChatHistoryToStorage();
   renderAiHistoryPanel();
   showToast(t('Sohbet geçmişi temizlendi.', 'Chat history cleared.'), 'info');
}

function pushAiChatExchange(userText, botText) {
   chatHistory.push({ role: 'user', content: userText });
   chatHistory.push({ role: 'assistant', content: botText });
   if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
   persistAiChatHistoryToStorage();
   renderAiHistoryPanel();
}

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
      } else {
         const historyPanel = getEl('floatingAiHistoryPanel');
         if (historyPanel) historyPanel.classList.remove('is-open');
         const historyBtn = getEl('floatingAiHistoryBtn');
         if (historyBtn) historyBtn.setAttribute('aria-expanded', 'false');
      }
   }
}

function toggleFloatingAiHistory() {
   const panel = getEl('floatingAiHistoryPanel');
   const btn = getEl('floatingAiHistoryBtn');
   if (!panel) return;
   const willOpen = !panel.classList.contains('is-open');
   panel.classList.toggle('is-open', willOpen);
   if (btn) btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
   if (willOpen) renderAiHistoryPanel();
   panel.setAttribute('aria-hidden', willOpen ? 'false' : 'true');
}

async function sendAiMessage() {
    const input = getEl('aiInput');
    const display = getEl('aiChatContent');
    if (!input || !display || !input.value.trim()) return;

    const userText = input.value.trim();
    input.value = '';

    display.innerHTML += `<div class="user-bubble"><div class="bubble-text">${escapeHtml(userText)}</div></div>`;
    display.scrollTop = display.scrollHeight;

    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userText, history: chatHistory, lang: lang() })
        });
        const data = await response.json();
        const botResponse = data.response || t('Hata oluştu.', 'An error occurred.');

        pushAiChatExchange(userText, botResponse);

        display.innerHTML += `
            <div class="bot-bubble">
                <div class="bubble-icon">\u{1F916}</div>
                <div class="bubble-text">${formatBotMessageHtml(botResponse)}</div>
            </div>
        `;
    } catch (err) {
        display.innerHTML += `
            <div class="bot-bubble error">
                <div class="bubble-icon">⚠️</div>
                <div class="bubble-text">${escapeHtml(t('Neon AI şu an yanıt veremiyor.', 'Neon AI is unavailable right now.'))}</div>
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
         body: JSON.stringify({ message: message, history: chatHistory, lang: lang() })
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
      if (text) {
         pushAiChatExchange(message, text);
      }
      const loadingEl = getEl(loadingId);
      if (loadingEl) {
         loadingEl.innerHTML = '';
         const wrap = document.createElement('div');
         wrap.innerHTML = formatBotMessageHtml(text);
         loadingEl.appendChild(wrap);
      }
   } catch (err) {
      const loadingEl = getEl(loadingId);
      if (loadingEl) loadingEl.innerHTML = `<p>${escapeHtml(t('Neon AI şu an yanıt veremiyor. Lütfen tekrar deneyin.', 'Neon AI is unavailable. Please try again.'))}</p>`;
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
   let accNo = accEl ? accEl.textContent.trim() : '';
   if (!accNo || accNo === '**** ****' || accNo === '-') {
      accNo = currentUser?.accountNumber ?? currentUser?.AccountNumber ?? '';
   }
   const payload = encodeURIComponent(`VIREON|PAY|TRY|IBAN|${accNo}|vireon.bank`);
   const img = getEl('qrPaymentImg');
   const lbl = getEl('qrAccountLabel');
   if (lbl) lbl.textContent = accNo || '-';
   if (img) {
      img.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${payload}`;
      img.alt = 'QR Code';
   }
}

function initDepositFxUi() {
   const curEl = getEl('depositCurrency');
   if (curEl && !curEl.dataset.fxReady) {
      curEl.dataset.fxReady = '1';
      curEl.addEventListener('change', updateDepositFxPreview);
   }
   const amtEl = getEl('depositAmount');
   if (amtEl && !amtEl.dataset.fxReady) {
      amtEl.dataset.fxReady = '1';
      amtEl.addEventListener('input', updateDepositFxPreview);
   }
}

function updateDepositFxPreview() {
   const preview = getEl('depositFxPreview');
   const label = getEl('depositAmountLabel');
   const curEl = getEl('depositCurrency');
   const amtEl = getEl('depositAmount');
   if (!preview || !curEl) return;

   const depositCur = String(curEl.value || 'TRY').toUpperCase();
   if (label) {
      label.textContent = t(
         `Yatırılacak Tutar (${currencySymbol(depositCur)}${depositCur})`,
         `Amount (${currencySymbol(depositCur)}${depositCur})`
      );
   }

   const amount = parseFloat(amtEl?.value);
   if (!amount || amount <= 0) {
      preview.innerHTML = `<span class="fx-preview-muted">${t('Tutar girince TRY karşılığı burada görünür.', 'Enter an amount to see TRY equivalent.')}</span>`;
      preview.className = 'transfer-fx-preview';
      return;
   }

   if (depositCur === 'TRY') {
      preview.innerHTML = `<span class="fx-preview-same">${t('TRY hesabına doğrudan yatırım.', 'Direct deposit to TRY account.')}</span> <strong>${formatMoney(amount, 'TRY')}</strong>`;
      preview.className = 'transfer-fx-preview is-same';
      return;
   }

   const tryAmount = convertCurrencyClient(amount, depositCur, 'TRY');
   if (tryAmount == null) {
      preview.innerHTML = `<span class="fx-preview-muted">${t('Desteklenmeyen para birimi.', 'Unsupported currency.')}</span>`;
      preview.className = 'transfer-fx-preview';
      return;
   }

   preview.innerHTML = `<span>${formatMoney(amount, depositCur)}</span> → <strong>${formatMoney(tryAmount, 'TRY')}</strong> <span class="fx-preview-muted">(${t('simülasyon kuru', 'simulated rate')})</span>`;
   preview.className = 'transfer-fx-preview';
}

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
   const depositCur = String(getEl('depositCurrency')?.value || 'TRY').toUpperCase();
   const tryAmount = depositCur === 'TRY' ? amt : convertCurrencyClient(amt, depositCur, 'TRY');
   if (tryAmount == null || tryAmount <= 0) {
      showToast(lang === 'tr' ? 'Kur dönüşümü yapılamadı.' : 'Could not convert currency.', 'error');
      return;
   }
   const noteField = getEl('depositNote');
   const baseNote = noteField ? noteField.value : '';
   const fxNote = depositCur !== 'TRY'
      ? (lang === 'tr' ? ` (${formatMoney(amt, depositCur)} → TRY)` : ` (${formatMoney(amt, depositCur)} → TRY)`)
      : '';
   const note = (baseNote || (lang === 'tr' ? 'Para Yatırma' : 'Deposit')) + fxNote;
   
   const btn = document.querySelector('#dash-deposit .login-submit-btn');
   if (btn) btn.disabled = true;

   try {
       const accounts = await fetchJsonOrThrow('/api/accounts');
       const userAccount = accounts.find(a => accountUserId(a) === currentUserId());
       const accountNumber = userAccount?.accountNumber ?? userAccount?.AccountNumber ?? currentUser.accountNumber ?? currentUser.AccountNumber;
       if (!accountNumber) {
           showToast(lang === 'tr' ? 'Hesap numarası bulunamadı.' : 'Account number not found.', 'error');
           return;
       }
       const response = await fetch('/api/transfers/deposit', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
               accountNumber: accountNumber,
               amount: tryAmount,
               description: note
           })
       });

       if (response.ok) {
           showToast(lang === 'tr' ? 'Para başarıyla yatırıldı!' : 'Deposit successful!', 'success');
           amtField.value = '';
           if (noteField) noteField.value = '';
           await fetchDashboardData();
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
         persistCurrentUser();
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

async function handleProfileForgotPassword() {
   const lang = window.currentLang || 'en';
   submitForgotPassword({
      email: getEl('profileResetEmail')?.value?.trim(),
      accountNumber: getEl('profileResetAccountNo')?.value?.trim()?.toUpperCase(),
      newPassword: getEl('profileResetNewPwd')?.value,
      confirmPassword: getEl('profileResetConfirmPwd')?.value,
      lang,
      onSuccess: () => {
         const fields = ['profileResetNewPwd', 'profileResetConfirmPwd'];
         fields.forEach(id => { const el = getEl(id); if (el) el.value = ''; });
      }
   });
}

function initDeleteAccountGuard() {
   const ack = getEl('deleteAccountAck');
   const btn = getEl('deleteAccountBtn');
   if (!ack || !btn) return;
   ack.addEventListener('change', () => {
      btn.disabled = !ack.checked;
   });
}

async function handleDeleteAccount() {
   if (!currentUser) return;
   const lang = window.currentLang || 'en';
   const password = getEl('deleteAccountPassword')?.value;
   const confirmEmail = getEl('deleteAccountEmailConfirm')?.value?.trim();
   const confirmPhrase = getEl('deleteAccountPhrase')?.value?.trim();
   const ack = getEl('deleteAccountAck')?.checked;

   if (!password || !confirmEmail || !confirmPhrase) {
      showToast(lang === 'tr' ? 'Tüm alanları doldurun.' : 'Fill in all fields.', 'warning');
      return;
   }
   if (!ack) {
      showToast(lang === 'tr' ? 'Onay kutusunu işaretleyin.' : 'Check the confirmation box.', 'warning');
      return;
   }

   const expectedTr = 'HESABIMI SIL';
   const expectedEn = 'DELETE MY ACCOUNT';
   const phraseUpper = confirmPhrase.toUpperCase();
   if (phraseUpper !== expectedTr && phraseUpper !== expectedEn) {
      showToast(lang === 'tr' ? 'Onay metni hatalı. HESABIMI SIL yazın.' : 'Wrong phrase. Type DELETE MY ACCOUNT.', 'error');
      return;
   }

   const msgTr = `"${currentUser.email}" hesabını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`;
   const msgEn = `Permanently delete "${currentUser.email}"? This cannot be undone.`;
   if (!window.confirm(lang === 'tr' ? msgTr : msgEn)) return;

   const btn = getEl('deleteAccountBtn');
   if (btn) btn.disabled = true;

   try {
      const res = await fetch(`/api/users/${currentUser.id}/delete-account`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ password, confirmEmail, confirmPhrase })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
         showToast(data.message || (lang === 'tr' ? 'Hesap silindi.' : 'Account deleted.'), 'success');
         currentUser = null;
         clearSession();
         clearRememberedEmail();
         resetAllApplicationUi();
         updateNavbarForLoggedOutUser();
         backToMenu();
      } else {
         showToast(data.message || (lang === 'tr' ? 'Silme başarısız.' : 'Delete failed.'), 'error');
         if (btn && ack) btn.disabled = !ack.checked;
      }
   } catch (e) {
      console.error('Delete account error:', e);
      showToast(lang === 'tr' ? 'Sunucu hatası.' : 'Server error.', 'error');
      if (btn && ack) btn.disabled = !ack.checked;
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
            showToast(pickApiMessage(result, 'Transfer başarılı!', 'Transfer successful!'), 'success');
            
            const targetField = getEl('transferTarget');
            const amountField = getEl('transferAmount');
            const descField = getEl('transferDesc');
            if (targetField) targetField.value = '';
            if (amountField) amountField.value = '';
            if (descField) descField.value = '';
            transferReceiverCurrency = null;
            const receiverHint = getEl('transferReceiverName');
            if (receiverHint) { receiverHint.textContent = ''; receiverHint.className = 'receiver-name-hint'; }
            updateTransferFxPreview();
            
            await fetchDashboardData();
        } else {
            const error = await response.json().catch(() => ({}));
            const isBlocked = error.status === 'blocked';
            const riskPct = error.riskScore != null ? Math.round(Number(error.riskScore) * 100) : null;
            let msg = pickApiMessage(error, 'Transfer başarısız!', 'Transfer failed!');
            if (isBlocked && riskPct != null) {
                msg = lang === 'tr'
                    ? `${msg} (Risk: %${riskPct})`
                    : `${msg} (Risk: ${riskPct}%)`;
            }
            showToast(msg, isBlocked ? 'warning' : 'error');
        }
    } catch (err) {
        showToast(lang === 'tr' ? 'Sunucuya bağlanılamadı.' : 'Connection error.', 'error');
    } finally {
        if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
    }
}

// Hesap rehberi: accountId -> { number, owner }. İşlem listelerinde karşı tarafı göstermek için.
let accountDirectory = {};
function buildAccountDirectory(accounts, users) {
   const ownerByUserId = {};
   (users || []).forEach(u => { ownerByUserId[u.id ?? u.Id] = `${u.name || ''} ${u.surname || ''}`.trim(); });
   const dir = {};
   (accounts || []).forEach(a => {
      const id = a.id ?? a.Id;
      dir[id] = {
         number: a.accountNumber ?? a.AccountNumber,
         owner: ownerByUserId[a.userId ?? a.UserId] || '',
         currency: String(a.currency ?? a.Currency ?? 'TRY').toUpperCase()
      };
   });
   accountDirectory = dir;
}

function updateTransactionList(txs, accountId, listElement) {
   if (!listElement) return;
   const lang = window.currentLang || 'en';
   if (!txs || txs.length === 0) {
      listElement.innerHTML = `<p class="tx-empty">${lang === 'tr' ? 'Henüz işlem bulunamadı.' : 'No transactions found.'}</p>`;
      return;
   }
   const outLabel = lang === 'tr' ? 'Giden transfer' : 'Outgoing transfer';
   const inLabel = lang === 'tr' ? 'Gelen transfer' : 'Incoming transfer';
   const depositLabel = lang === 'tr' ? 'Para Yatırma' : 'Deposit';
   const toLabel = lang === 'tr' ? 'Alıcı' : 'To';
   const fromLabel = lang === 'tr' ? 'Gönderen' : 'From';

   listElement.innerHTML = txs.slice().reverse().map(tx => {
      const isDeposit = txSenderId(tx) === txReceiverId(tx);
      const isOut = !isDeposit && txSenderId(tx) === accountId;
      const amountClass = isDeposit ? 'tx-in' : (isOut ? 'tx-out' : 'tx-in');
      const symbol = isDeposit ? '+' : (isOut ? '-' : '+');
      const label = isDeposit ? depositLabel : (isOut ? outLabel : inLabel);
      const icon = isDeposit ? '\u{1F4B0}' : (isOut ? '\u{1F4E4}' : '\u{1F4E5}');
      const statusRaw = typeof tx.status === 'number'
         ? ['Pending', 'Completed', 'Failed', 'Cancelled'][tx.status] || ''
         : (tx.status || tx.Status || 'Completed');
      const statusText = localizeAdminStatus(statusRaw, lang);
      const statusKey = String(statusRaw).replace(/\s+/g, '');
      const statusBadge = statusText ? `<span class="tx-status tx-status-${statusKey}">${statusText}</span>` : '';

      // Karşı taraf (hangi hesaba/kimden) bilgisini göster.
      let partyHtml = '';
      if (!isDeposit) {
         const partyId = isOut ? txReceiverId(tx) : txSenderId(tx);
         const party = accountDirectory[partyId];
         const partyLabel = isOut ? toLabel : fromLabel;
         if (party) {
            const who = party.owner ? `${party.owner} · ${party.number}` : party.number;
            partyHtml = `<span class="tx-detail">${partyLabel}: ${escapeHtml(who)}</span>`;
         }
      }

      // Kullanıcının girdiği özel açıklamayı göster (otomatik "Transfer: ..." metnini tekrarlama).
      const formattedDesc = formatTxDescription(tx.description, lang);
      const desc = formattedDesc ? `<span class="tx-detail">${escapeHtml(formattedDesc)}</span>` : '';

      return `
            <div class="tx-item">
                <div class="tx-info">
                    <span class="tx-icon">${icon}</span>
                    <div class="tx-meta">
                        <span class="tx-desc">${label}</span>
                        ${partyHtml}
                        ${desc}
                        <span class="tx-date">${new Date(tx.date).toLocaleString(getLocale(), {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                        ${statusBadge}
                    </div>
                </div>
                <div class="tx-amount-box">
                    <div class="tx-amount ${amountClass}">${symbol}${formatNumber(tx.amount, 2, 2)} ${currentAccountCurrency}</div>
                </div>
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
        const sender = txSenderId(t);
        const receiver = txReceiverId(t);
        const isDeposit = sender === receiver;
        if (isDeposit && sender === accountId) {
            incomingData.push(Number(t.amount || 0));
            outgoingData.push(0);
        } else if (sender === accountId && receiver !== accountId) {
            outgoingData.push(Number(t.amount || 0));
            incomingData.push(0);
        } else if (receiver === accountId && sender !== accountId) {
            incomingData.push(Number(t.amount || 0));
            outgoingData.push(0);
        } else {
            incomingData.push(0);
            outgoingData.push(0);
        }
    });

    if (labels.length === 0) {
        return;
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
        const directoryUsers = await fetchJsonOrThrow('/api/users').catch(() => []);
        buildAccountDirectory(accounts, directoryUsers);
        const userAccount = accounts.find(a => accountUserId(a) === currentUserId());
        const acctId = userAccount ? (userAccount.id ?? userAccount.Id) : null;
        
        const balEl = getEl('infoBalance');
        const curEl = getEl('infoCurrency');
        if (balEl) balEl.textContent = userAccount
            ? `${formatNumber(availableBalance(accountBalance(userAccount)), 2, 2)} ${lang === 'tr' ? 'TL' : 'TRY'}`
            : `0.00 ${lang === 'tr' ? 'TL' : 'TRY'}`;
        if (curEl) curEl.textContent = userAccount?.currency ?? userAccount?.Currency ?? 'TRY';

        // Transaction history
        if (userAccount && acctId) {
            const transactions = await fetchJsonOrThrow('/api/transactions');
            const userTxs = transactions.filter(t => txSenderId(t) === acctId || txReceiverId(t) === acctId);
            
            const historyEl = getEl('infoTransactionHistory');
            if (historyEl) updateTransactionList(userTxs, acctId, historyEl);
            
            const txCountEl = getEl('infoTxCount');
            if (txCountEl) txCountEl.textContent = userTxs.length;
        }
    } catch (err) {
        console.error('Account info error:', err);
        showToast(lang === 'tr' ? 'Hesap bilgileri yuklenemedi.' : 'Could not load account details.', 'error');
    }
}

// ========== ADMIN PANEL ==========
function formatAdminParty(name, account) {
    const n = (name || '').trim().replace(/\s+/g, ' ');
    const a = (account || '').trim();
    if (n && a) return `${n} · ${a}`;
    return n || a || '-';
}

function localizeAdminTxType(type, lang) {
    const t = (type || '').toLowerCase();
    if (t === 'deposit') return lang === 'tr' ? 'Para Yatırma' : 'Deposit';
    if (t === 'transfer') return lang === 'tr' ? 'Transfer' : 'Transfer';
    return type || '-';
}

function localizeAdminStatus(status, lang) {
    const s = (status || '').toString();
    const map = {
        Pending: lang === 'tr' ? 'Beklemede' : 'Pending',
        Completed: lang === 'tr' ? 'Tamamlandı' : 'Completed',
        Failed: lang === 'tr' ? 'Başarısız' : 'Failed',
        Cancelled: lang === 'tr' ? 'İptal' : 'Cancelled',
        completed: lang === 'tr' ? 'Tamamlandı' : 'Completed',
        failed: lang === 'tr' ? 'Başarısız' : 'Failed'
    };
    return map[s] || map[s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()] || s;
}

function localizeFraudRiskType(type, lang) {
    const key = String(type || '').toUpperCase();
    const map = {
        SUSPICIOUS_NIGHT_TRANSFER: lang === 'tr' ? 'Gece Transferi' : 'Night Transfer',
        HIGH_AMOUNT: lang === 'tr' ? 'Yüksek Tutar' : 'High Amount',
        FREQUENT_TRANSFER: lang === 'tr' ? 'Sık Transfer' : 'Frequent Transfer',
        FREQUENT_TRANSACTIONS: lang === 'tr' ? 'Sık İşlem' : 'Frequent Transactions',
        LIMIT_EXCEEDED: lang === 'tr' ? 'Limit Aşımı' : 'Limit Exceeded',
        AI_BLOCKED: lang === 'tr' ? 'AI Engeli' : 'AI Blocked'
    };
    return map[key] || type || '-';
}

/** Admin tablolarında gösterilecek açıklama (eski test/otomatik metinleri temizler). */
function formatAdminDescription(tx, lang) {
    return formatTxDescription(tx.description, lang) || '—';
}

/** Kullanıcı işlem listelerinde gösterilecek açıklama */
function formatTxDescription(rawDesc, lang) {
    const d = (rawDesc || '').trim();
    if (!d || /^transfer\s*:/i.test(d)) return '';
    const lower = d.toLowerCase();
    if (lower === 'final smoke') return lang === 'tr' ? 'Havale işlemi' : 'Transfer';
    if (lower === 'deposit' || lower === 'para yatırma') return lang === 'tr' ? 'Para yatırma' : 'Deposit';
    if (lower === 'transfer') return lang === 'tr' ? 'Havale' : 'Transfer';
    if (lower === 'borç') return lang === 'tr' ? 'Borç ödemesi' : 'Debt payment';
    if (/seed/i.test(d)) return lang === 'tr' ? 'Sistem kaydı' : 'System record';
    return d;
}

function updateLimitsDisplay(userLimit) {
    const max = Number(userLimit.maxDailyLimit ?? userLimit.MaxDailyLimit ?? 0);
    const used = Number(userLimit.usedLimit ?? userLimit.UsedLimit ?? 0);
    const remaining = Math.max(0, max - used);
    const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0;
    const resetRaw = userLimit.lastResetDate ?? userLimit.LastResetDate;

    const maxEl = getEl('maxLimit');
    const usedEl = getEl('usedLimit');
    const remEl = getEl('remainingLimit');
    const pctEl = getEl('limitUsagePct');
    const fillEl = getEl('limitProgressFill');
    const labelEl = getEl('limitProgressLabel');
    const resetEl = getEl('lastResetDate');

    if (maxEl) maxEl.textContent = formatNumber(max, 0, 2);
    if (usedEl) usedEl.textContent = formatNumber(used, 0, 2);
    if (remEl) remEl.textContent = formatNumber(remaining, 0, 2);
    if (pctEl) pctEl.textContent = `${pct.toFixed(1)}% ${t('kullanıldı', 'used')}`;
    if (fillEl) fillEl.style.width = `${pct}%`;
    if (labelEl) {
        const sym = currencySymbol(currentAccountCurrency);
        labelEl.textContent = `${sym}${formatNumber(used, 0, 2)} / ${sym}${formatNumber(max, 0, 2)} ${currentAccountCurrency}`;
    }
    if (resetEl) {
        resetEl.textContent = resetRaw
            ? new Date(resetRaw).toLocaleString(getLocale(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '—';
    }
}

function formatAdminSenderCell(tx, lang) {
    const typeKey = (tx.type || '').toLowerCase();
    if (typeKey === 'deposit') {
        return lang === 'tr' ? '—' : '—';
    }
    return formatAdminParty(tx.senderName, tx.senderAccount);
}

function formatAdminReceiverCell(tx, lang) {
    return formatAdminParty(tx.receiverName, tx.receiverAccount);
}

/** Admin panel sunum bakiyesi — kullanıcı dashboard'unda kullanılmaz */
function presentationBalance(rawBalance, ctx) {
    const email = String(ctx?.email ?? ctx?.Email ?? currentUser?.email ?? '').toLowerCase();
    const role = String(ctx?.role ?? ctx?.Role ?? currentUser?.role ?? '');
    const accNo = String(ctx?.accountNumber ?? ctx?.AccountNumber ?? currentUser?.accountNumber ?? '').toUpperCase();
    if (role === 'Admin' || email === 'cavit@vireon.com' || accNo === 'VR-99999') return 100000;
    if (email === 'enes@vireon.com' || accNo === 'VR-88888') return 50000;
    if (email === 'kerem@vireon.com' || accNo === 'VR-77777') return 50000;
    const n = Number(ctx?.balance ?? ctx?.Balance ?? rawBalance);
    return Number.isFinite(n) ? n : 0;
}

async function loadAdminPanel() {
    if (!currentUser || currentUser.role !== 'Admin') return;

    const lang = window.currentLang || 'en';
    const setVal = (id, val) => { const el = getEl(id); if (el) el.textContent = val; };
    const usersBody = getEl('adminUsersBody');
    const txBody = getEl('adminTxBody');
    const fraudBody = getEl('adminFraudBody');
    const updatedEl = getEl('adminLastUpdated');

    if (updatedEl) {
        updatedEl.textContent = lang === 'tr' ? 'Veriler yükleniyor...' : 'Loading data...';
    }
    if (usersBody) usersBody.innerHTML = '';
    if (txBody) txBody.innerHTML = '';
    if (fraudBody) fraudBody.innerHTML = '';

    try {
        const [stats, users, txs, fraudLogs, accountsForFraud] = await Promise.all([
            fetchJsonOrThrow('/api/users/admin-stats'),
            fetchJsonOrThrow('/api/users/admin-users'),
            fetchJsonOrThrow('/api/users/admin-transactions'),
            fetchJsonOrThrow('/api/fraudlogs').catch(() => []),
            fetchJsonOrThrow('/api/accounts').catch(() => [])
        ]);

        setVal('adminTotalUsers', stats.totalUsers ?? 0);
        setVal('adminTotalAccounts', stats.totalAccounts ?? 0);
        setVal('adminTotalTx', stats.totalTransactions ?? 0);
        setVal('adminTotalDeposits', stats.totalDeposits ?? 0);
        setVal('adminTotalTransfers', stats.totalTransfers ?? 0);
        setVal('adminTotalFraud', stats.totalFraudLogs ?? 0);
        setVal('adminTotalLedger', stats.totalLedgerEntries ?? 0);

        if (updatedEl && stats.serverTime) {
            const when = new Date(stats.serverTime).toLocaleString(getLocale(), {
                day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            updatedEl.textContent = lang === 'tr'
                ? `Son güncelleme: ${when}`
                : `Last updated: ${when}`;
        }

        if (usersBody) {
            if (!users.length) {
                usersBody.innerHTML = `<tr><td colspan="7" class="tx-empty">${lang === 'tr' ? 'Kullanıcı bulunamadı.' : 'No users found.'}</td></tr>`;
                setVal('adminTotalBalance', `₺${formatNumber(stats.totalBalance ?? 0, 2, 2)}`);
            } else {
                const displayTotalBalance = users.reduce((sum, u) => sum + presentationBalance(u.balance ?? u.Balance, u), 0);
                setVal('adminTotalBalance', `₺${formatNumber(displayTotalBalance, 2, 2)}`);

                usersBody.innerHTML = users.map((u, idx) => {
                    const roleKey = (u.role || u.Role || 'User').toLowerCase();
                    const roleLabel = (u.role || u.Role) === 'Admin'
                        ? (lang === 'tr' ? 'Admin' : 'Admin')
                        : (lang === 'tr' ? 'Kullanıcı' : 'User');
                    const displayBal = presentationBalance(u.balance ?? u.Balance, u);
                    return `
                <tr title="DB ID: ${u.id}">
                    <td class="col-seq">${idx + 1}</td>
                    <td class="col-party">${escapeHtml(u.name)} ${escapeHtml(u.surname || '')}</td>
                    <td>${escapeHtml(u.email)}</td>
                    <td>${escapeHtml(u.accountNumber || '-')}</td>
                    <td class="bal-text">₺${formatNumber(displayBal, 2, 2)}</td>
                    <td>${u.transactionCount ?? 0}</td>
                    <td><span class="role-badge role-${roleKey}">${roleLabel}</span></td>
                </tr>`;
                }).join('');
            }
        } else {
            setVal('adminTotalBalance', `₺${formatNumber(stats.totalBalance ?? 0, 2, 2)}`);
        }

        if (txBody) {
            if (!txs.length) {
                txBody.innerHTML = `<tr><td colspan="8" class="tx-empty">${lang === 'tr' ? 'İşlem kaydı yok.' : 'No transactions found.'}</td></tr>`;
            } else {
                txBody.innerHTML = txs.map((tx, idx) => {
                    const typeKey = (tx.type || 'transfer').toLowerCase();
                    const statusKey = (tx.status || 'Pending').toString();
                    const desc = formatAdminDescription(tx, lang);
                    return `
                <tr title="DB ID: ${tx.id}">
                    <td class="col-seq">${idx + 1}</td>
                    <td><span class="type-badge type-${typeKey}">${localizeAdminTxType(tx.type, lang)}</span></td>
                    <td class="col-party">${escapeHtml(formatAdminSenderCell(tx, lang))}</td>
                    <td class="col-party">${escapeHtml(formatAdminReceiverCell(tx, lang))}</td>
                    <td class="bal-text">₺${formatNumber(tx.amount, 2, 2)}</td>
                    <td>${escapeHtml(desc)}</td>
                    <td>${new Date(tx.date).toLocaleString(getLocale(), { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</td>
                    <td><span class="tx-status tx-status-${statusKey}">${localizeAdminStatus(statusKey, lang)}</span></td>
                </tr>`;
                }).join('');
            }
        }

        if (fraudBody) {
            const accNumById = {};
            (accountsForFraud || []).forEach(a => {
                const id = pickField(a, 'id', 'Id');
                const num = pickField(a, 'accountNumber', 'AccountNumber');
                if (id != null) accNumById[id] = num || ('#' + id);
            });

            const logs = Array.isArray(fraudLogs) ? fraudLogs : [];
            if (!logs.length) {
                fraudBody.innerHTML = `<tr><td colspan="5" class="tx-empty">${lang === 'tr' ? 'Şüpheli işlem kaydı yok.' : 'No suspicious transactions.'}</td></tr>`;
            } else {
                fraudBody.innerHTML = logs.slice().reverse().map((f, idx) => {
                    const accountId = pickField(f, 'accountId', 'AccountId');
                    const riskType = pickField(f, 'riskType', 'RiskType');
                    const description = pickField(f, 'description', 'Description') || '-';
                    const logDate = pickField(f, 'logDate', 'LogDate');
                    const logId = pickField(f, 'id', 'Id');
                    const dateStr = logDate
                        ? new Date(logDate).toLocaleString(getLocale(), { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
                        : '—';
                    return `
                    <tr title="DB ID: ${logId ?? ''}">
                        <td class="col-seq">${idx + 1}</td>
                        <td>${escapeHtml(accNumById[accountId] || ('#' + accountId))}</td>
                        <td><span class="type-badge type-fraud">${escapeHtml(localizeFraudRiskType(riskType, lang))}</span></td>
                        <td>${escapeHtml(description)}</td>
                        <td>${dateStr}</td>
                    </tr>`;
                }).join('');
            }
        }

    } catch (err) {
        console.error('Admin panel error:', err);
        showToast(lang === 'tr' ? 'Admin panel verileri yüklenemedi.' : 'Could not load admin panel data.', 'error');
        if (updatedEl) {
            updatedEl.textContent = lang === 'tr' ? 'Veri yüklenemedi.' : 'Failed to load data.';
        }
    }
}
