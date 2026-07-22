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

