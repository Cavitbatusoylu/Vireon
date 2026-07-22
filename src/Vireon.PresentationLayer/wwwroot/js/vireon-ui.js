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

       ensureNeonAiLauncher();
   } catch (e) {
       console.error("NEON AI: Init Error", e);
   }
});

function ensureNeonAiLauncher() {
   if (isDashboardPage()) return;
   const launcher = getEl('aiLauncher');
   const root = getEl('neonAiRoot');
   if (!launcher || !root) return;
   launcher.style.display = 'flex';
   launcher.style.visibility = 'visible';
   launcher.style.opacity = '1';
}

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
         'Sistem haz\u0131r \u2014 mod\u00fcllere eri\u015fmek i\u00e7in kartlar\u0131 se\u00e7in',
         'ACID uyumlu i\u015flem motoru aktif',
         'Neon AI sa\u011f alt k\u00f6\u015fede haz\u0131r',
         'EF Core migration \u015femas\u0131 y\u00fckl\u00fc',
         'Fraud tespiti ger\u00e7ek zamanl\u0131 izleniyor'
      ]
      : [
         'System ready \u2014 select a card to access modules',
         'ACID-compliant transaction engine active',
         'Neon AI assistant ready in the bottom-right corner',
         'EF Core migration schema loaded',
         'Fraud detection monitoring in real time'
      ];

   let idx = 0;
   el.textContent = messages[0];
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

