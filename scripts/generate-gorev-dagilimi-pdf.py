# -*- coding: utf-8 -*-
"""Vireon görev dağılımı raporu — şemalarla PDF."""
import os
import io
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak,
    Table, TableStyle, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT = os.path.join(ROOT, "Vireon-Gorev-Dagilimi.pdf")
ASSETS = os.path.join(ROOT, "scripts", "_pdf_assets")
os.makedirs(ASSETS, exist_ok=True)

# Türkçe karakter desteği için Arial (Windows)
FONT = "Helvetica"
try:
    arial = r"C:\Windows\Fonts\arial.ttf"
    arial_b = r"C:\Windows\Fonts\arialbd.ttf"
    if os.path.exists(arial):
        pdfmetrics.registerFont(TTFont("Arial", arial))
        pdfmetrics.registerFont(TTFont("Arial-Bold", arial_b))
        FONT = "Arial"
except Exception:
    pass


def fig_to_image(fig, name, dpi=150):
    path = os.path.join(ASSETS, name)
    fig.savefig(path, dpi=dpi, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return path


def draw_architecture_diagram():
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 7)
    ax.axis("off")
    ax.set_title("Katmanlı Mimari (N-Tier)", fontsize=14, fontweight="bold", pad=12)

    layers = [
        (6.2, "Presentation Layer", "Controllers · Middleware · wwwroot UI", "#00b4d8", "Cavit + Enes"),
        (4.8, "Business Layer", "TransactionManager · FraudModelService · NeonAIService", "#0077b6", "Enes + Cavit"),
        (3.4, "Data Access Layer", "VireonContext · EF Core Migrations", "#023e8a", "Kerem"),
        (2.0, "Entity + DTO", "User · Account · Transaction · DTO modelleri", "#03045e", "Kerem + Enes"),
    ]
    for y, title, desc, color, owner in layers:
        box = FancyBboxPatch((0.5, y - 0.55), 9, 1.0, boxstyle="round,pad=0.05",
                             facecolor=color, edgecolor="white", alpha=0.85)
        ax.add_patch(box)
        ax.text(5, y + 0.15, title, ha="center", va="center", color="white", fontsize=11, fontweight="bold")
        ax.text(5, y - 0.2, desc, ha="center", va="center", color="white", fontsize=8)
        ax.text(9.35, y, owner, ha="right", va="center", color="#ffd166", fontsize=7, fontweight="bold")

    for y1, y2 in [(6.2, 5.0), (4.8, 3.7), (3.4, 2.3)]:
        ax.annotate("", xy=(5, y2 + 0.55), xytext=(5, y1 - 0.55),
                    arrowprops=dict(arrowstyle="->", color="#333", lw=1.5))
    return fig_to_image(fig, "arch.png")


def draw_team_matrix():
    fig, ax = plt.subplots(figsize=(10, 5))
    ax.axis("off")
    ax.set_title("Ekip Görev Matrisi", fontsize=14, fontweight="bold", pad=12)

    cols = ["Modül / Alan", "Kerem", "Enes", "Cavit"]
    rows = [
        ["Entity & VireonContext", "●", "○", "○"],
        ["Migration & Seed", "●", "○", "○"],
        ["TransactionManager", "○", "●", "○"],
        ["FraudModelService", "○", "●", "○"],
        ["Finans API Controllers", "○", "●", "○"],
        ["FluentValidation / AutoMapper", "○", "●", "○"],
        ["UsersController", "○", "○", "●"],
        ["Neon AI (Groq + UI)", "○", "○", "●"],
        ["PWA / Dashboard / Admin UI", "○", "○", "●"],
        ["SharedDatabaseGitSync", "○", "○", "●"],
        ["README / Deploy / Docker", "○", "○", "●"],
    ]
    table = ax.table(cellText=rows, colLabels=cols, loc="center", cellLoc="center")
    table.auto_set_font_size(False)
    table.set_fontsize(9)
    table.scale(1, 1.6)
    for (r, c), cell in table.get_celld().items():
        if r == 0:
            cell.set_facecolor("#0077b6")
            cell.set_text_props(color="white", fontweight="bold")
        elif c == 0:
            cell.set_facecolor("#e8f4f8")
        elif cell.get_text().get_text() == "●":
            cell.set_text_props(color="#0077b6", fontweight="bold", fontsize=14)
        elif cell.get_text().get_text() == "○":
            cell.set_text_props(color="#aaa")
    ax.text(0.5, 0.02, "● Birincil sorumlu   ○ Destek / tüketici", transform=ax.transAxes, fontsize=8, color="#555")
    return fig_to_image(fig, "matrix.png")


def draw_transfer_flow():
    fig, ax = plt.subplots(figsize=(10, 7))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 10)
    ax.axis("off")
    ax.set_title("Transfer İstek Akışı (Enes + Cavit UI)", fontsize=14, fontweight="bold", pad=10)

    boxes = [
        (5, 9.0, "vireon.js\n(UI)", "#48cae4"),
        (5, 7.5, "TransfersController\n(Enes)", "#0096c7"),
        (5, 6.0, "FluentValidation\n(Enes)", "#0077b6"),
        (5, 4.5, "FraudModelService\n(Enes)", "#023e8a"),
        (5, 3.0, "TransactionManager\n(Enes)", "#03045e"),
        (5, 1.5, "SQLite DB\n(Kerem şema)", "#6c757d"),
    ]
    for x, y, text, color in boxes:
        box = FancyBboxPatch((x - 1.8, y - 0.45), 3.6, 0.9, boxstyle="round,pad=0.04",
                             facecolor=color, edgecolor="white")
        ax.add_patch(box)
        ax.text(x, y, text, ha="center", va="center", color="white", fontsize=8, fontweight="bold")

    for y1, y2, label in [(8.55, 7.95, "POST /api/transfers/send-by-account"),
                          (7.05, 6.45, "Doğrula"),
                          (5.55, 4.95, "Risk skoru > %70 → ENGELLE"),
                          (4.05, 3.45, "ProcessTransaction()"),
                          (2.55, 1.95, "Bakiye + Ledger + FraudLog")]:
        ax.annotate("", xy=(5, y2 + 0.45), xytext=(5, y1 - 0.45),
                    arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
        ax.text(7.2, (y1 + y2) / 2, label, fontsize=7, color="#333")

    ax.text(5, 0.4, "UI: fetchDashboardData() → güncel bakiye (Cavit)", ha="center", fontsize=8,
            style="italic", color="#0077b6")
    return fig_to_image(fig, "flow.png")


def draw_er_diagram():
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 7)
    ax.axis("off")
    ax.set_title("Veri Modeli — Kerem Sorumluluğu", fontsize=14, fontweight="bold", pad=10)

    entities = {
        "User": (2, 5.5, ["Id", "Email", "Role", "AccountNumber"]),
        "Account": (5, 5.5, ["Id", "Balance", "RowVersion"]),
        "Transaction": (8, 5.5, ["SenderId", "ReceiverId", "Amount", "Status"]),
        "DailyLimit": (2, 2.5, ["MaxDailyLimit", "UsedLimit"]),
        "LedgerEntry": (5, 2.5, ["PreviousBalance", "NewBalance"]),
        "FraudLog": (8, 2.5, ["RiskType", "Description"]),
    }
    for name, (x, y, fields) in entities.items():
        h = 0.35 + len(fields) * 0.28
        box = FancyBboxPatch((x - 1.1, y - h / 2), 2.2, h, boxstyle="round,pad=0.03",
                             facecolor="#e8f4f8", edgecolor="#0077b6", linewidth=1.5)
        ax.add_patch(box)
        ax.text(x, y + h / 2 - 0.22, name, ha="center", fontsize=9, fontweight="bold", color="#0077b6")
        for i, f in enumerate(fields):
            ax.text(x, y + h / 2 - 0.55 - i * 0.28, f, ha="center", fontsize=7, color="#333")

    relations = [
        ((2, 5.0), (5, 5.0), "1:N"),
        ((2, 4.2), (2, 3.0), "1:1"),
        ((5, 4.8), (8, 4.8), "FK"),
        ((5, 4.0), (5, 3.2), "1:N"),
        ((5, 4.0), (8, 3.2), "1:N"),
    ]
    for (x1, y1), (x2, y2), lbl in relations:
        ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="-|>", color="#666", lw=1))
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        ax.text(mx, my + 0.15, lbl, fontsize=7, color="#666", ha="center")
    return fig_to_image(fig, "er.png")


def draw_coordination():
    fig, ax = plt.subplots(figsize=(10, 5.5))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 6)
    ax.axis("off")
    ax.set_title("Ekip Koordinasyon Şeması", fontsize=14, fontweight="bold", pad=10)

    people = [
        (2, 3, "Kerem\nArslan", "DB · Entity\nMigration · Seed", "#023e8a"),
        (5, 3, "Enes\nKaya", "API · İş Kuralları\nFraud · Validation", "#0077b6"),
        (8, 3, "Cavit\nSoylu", "UI · Neon AI\nUsers · Deploy", "#00b4d8"),
    ]
    for x, y, name, role, color in people:
        circle = plt.Circle((x, y + 0.5), 0.55, facecolor=color, edgecolor="white", linewidth=2)
        ax.add_patch(circle)
        ax.text(x, y + 0.5, name.split("\n")[0][0], ha="center", va="center", color="white", fontsize=16, fontweight="bold")
        ax.text(x, y - 0.5, name, ha="center", va="top", fontsize=9, fontweight="bold")
        ax.text(x, y - 1.3, role, ha="center", va="top", fontsize=7, color="#555")

    arrows = [
        ((2.6, 3.2), (4.4, 3.2), "Şema değişikliği"),
        ((5.6, 3.2), (7.4, 3.2), "API contract"),
        ((7.4, 2.8), (5.6, 2.8), "UI ihtiyacı"),
        ((4.4, 2.8), (2.6, 2.8), "Entity ihtiyacı"),
        ((5, 3.8), (5, 5.2), "Ortak: Program.cs seed"),
    ]
    for (x1, y1), (x2, y2), lbl in arrows:
        ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="->", color="#888", lw=1, connectionstyle="arc3,rad=0.1"))
        ax.text((x1 + x2) / 2, (y1 + y2) / 2 + 0.25, lbl, fontsize=6.5, ha="center", color="#666")

    ax.text(5, 5.5, "Paylaşımlı SQLite (Git Sync) — Cavit yönetir, Kerem şema, Enes veri yazar",
            ha="center", fontsize=8, color="#0077b6", style="italic",
            bbox=dict(boxstyle="round", facecolor="#e8f4f8", edgecolor="#0077b6"))
    return fig_to_image(fig, "coord.png")


def build_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="CoverTitle", fontName=f"{FONT}-Bold" if FONT == "Arial" else "Helvetica-Bold",
        fontSize=24, alignment=TA_CENTER, spaceAfter=12, textColor=colors.HexColor("#0077b6")
    ))
    styles.add(ParagraphStyle(
        name="CoverSub", fontName=FONT, fontSize=14, alignment=TA_CENTER, spaceAfter=8
    ))
    styles.add(ParagraphStyle(
        name="H1", fontName=f"{FONT}-Bold" if FONT == "Arial" else "Helvetica-Bold",
        fontSize=16, spaceBefore=14, spaceAfter=8, textColor=colors.HexColor("#0077b6")
    ))
    styles.add(ParagraphStyle(
        name="H2", fontName=f"{FONT}-Bold" if FONT == "Arial" else "Helvetica-Bold",
        fontSize=13, spaceBefore=10, spaceAfter=6, textColor=colors.HexColor("#023e8a")
    ))
    styles.add(ParagraphStyle(
        name="Body", fontName=FONT, fontSize=10, alignment=TA_JUSTIFY, spaceAfter=6, leading=14
    ))
    styles.add(ParagraphStyle(
        name="VBullet", fontName=FONT, fontSize=10, leftIndent=14, spaceAfter=3, leading=13
    ))
    return styles


def make_table(data, col_widths=None):
    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0077b6")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), f"{FONT}-Bold" if FONT == "Arial" else "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 1), (-1, -1), FONT),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f8fb")]),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return t


def add_image(story, path, width=16 * cm):
    img = Image(path, width=width, height=width * 0.55)
    story.append(img)
    story.append(Spacer(1, 0.4 * cm))


def build_pdf():
    doc = SimpleDocTemplate(
        OUTPUT, pagesize=A4,
        rightMargin=2 * cm, leftMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm
    )
    styles = build_styles()
    story = []

    # Kapak
    story.append(Spacer(1, 3 * cm))
    story.append(Paragraph("VIREON", styles["CoverTitle"]))
    story.append(Paragraph("Ekip Görev Dağılımı Raporu", styles["CoverSub"]))
    story.append(Spacer(1, 0.5 * cm))
    for line in [
        "<b>Proje:</b> Dijital Banka Çekirdek Sistemi Simülasyonu",
        "<b>Ekip:</b> Cavit Batu Soylu · Enes Kaya · Kerem Arslan",
        "<b>Dönem:</b> 2026 Final Projesi",
        "<b>Repository:</b> github.com/Cavitbatusoylu/Vireon",
    ]:
        story.append(Paragraph(line, styles["CoverSub"]))
    story.append(PageBreak())

    # Genel bakış
    story.append(Paragraph("1. Genel Bakış", styles["H1"]))
    story.append(Paragraph(
        "Vireon projesi üç kişilik ekip tarafından katmanlı mimari prensiplerine göre geliştirilmiştir. "
        "Her üye belirli bir teknik alandan birincil sorumludur; ancak entegrasyon noktalarında "
        "iş birliği zorunludur. Aşağıdaki şemalar görev sınırlarını ve veri akışını görselleştirir.",
        styles["Body"]
    ))
    story.append(Spacer(1, 0.3 * cm))
    add_image(story, draw_team_matrix())

    story.append(Paragraph("2. Katmanlı Mimari ve Sorumluluklar", styles["H1"]))
    add_image(story, draw_architecture_diagram())
    story.append(Paragraph(
        "Bağımlılık yönü: Presentation → Business + Data Access + DTO → Entity. "
        "Kerem alt katmanı (veri), Enes iş kuralları ve finans API'leri, Cavit sunum ve kullanıcı deneyimi katmanını yönetir.",
        styles["Body"]
    ))
    story.append(PageBreak())

    # Kerem
    story.append(Paragraph("3. Kerem Arslan — Veritabanı · Migration · Seed", styles["H1"]))
    story.append(Paragraph("<b>Ana sorumluluk:</b> Entity modeller, VireonContext, EF Core migration'lar, demo seed.", styles["Body"]))
    add_image(story, draw_er_diagram())
    story.append(Paragraph("3.1 Adım Adım Görevler", styles["H2"]))
    kerem_steps = [
        ["Adım", "Görev", "Dosya / Konum"],
        ["1", "Entity modellerini öğren", "Vireon.EntityLayer/Concrete/"],
        ["2", "VireonContext ilişkilerini anla", "OnModelCreating, SaveChanges override"],
        ["3", "Migration geçmişini incele", "InitialCreate, AddRowVersion, AddUserRole, AddPlainPassword"],
        ["4", "Yeni migration oluştur", "dotnet ef migrations add ..."],
        ["5", "Demo seed mantığını takip et", "Program.cs → EnsureDemoAccounts()"],
        ["6", "Paylaşımlı SQLite yolunu bil", "Database/vireon_local.db"],
        ["7", "FK silme sırasını koru", "Ledger → Fraud → Transaction → DailyLimit → Account → User"],
    ]
    story.append(make_table(kerem_steps, [1.2 * cm, 5 * cm, 9 * cm]))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("<b>Demo hesaplar (seed):</b>", styles["Body"]))
    story.append(make_table([
        ["Kullanıcı", "E-posta", "Hesap", "Rol"],
        ["Cavit Batu Soylu", "cavit@vireon.com", "VR-99999", "Admin"],
        ["Enes Kaya", "enes@vireon.com", "VR-88888", "User"],
        ["Kerem Arslan", "kerem@vireon.com", "VR-77777", "User"],
    ], [4 * cm, 4.5 * cm, 3 * cm, 2.5 * cm]))
    story.append(PageBreak())

    # Enes
    story.append(Paragraph("4. Enes Kaya — API · İş Kuralları · Doğrulama", styles["H1"]))
    story.append(Paragraph(
        "<b>Ana sorumluluk:</b> Finans API'leri, TransactionManager, FraudModelService, FluentValidation, AutoMapper.",
        styles["Body"]
    ))
    add_image(story, draw_transfer_flow())
    story.append(Paragraph("4.1 Controller Envanteri", styles["H2"]))
    story.append(make_table([
        ["Controller", "Endpoint'ler", "Görev"],
        ["TransfersController", "send, send-by-account, deposit", "Transfer kapısı + fraud gate"],
        ["AccountsController", "CRUD /api/accounts", "Hesap yönetimi"],
        ["TransactionsController", "GET /api/transactions", "İşlem listeleme"],
        ["LedgerEntriesController", "GET /api/ledgerentries", "Immutable defter"],
        ["FraudLogsController", "GET /api/fraudlogs", "Risk kayıtları"],
        ["DailyLimitsController", "CRUD /api/dailylimits", "Günlük limit"],
    ], [4 * cm, 5.5 * cm, 5.5 * cm]))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("4.2 TransactionManager Kontrolleri", styles["H2"]))
    for item in [
        "Gönderici/alıcı hesap var mı? Kendine transfer yasak.",
        "Tutar > 0, yetersiz bakiye kontrolü, döviz çevrimi (TRY/USD/EUR/GBP).",
        "Günlük limit — aşımda FraudLog (LIMIT_EXCEEDED).",
        "Bakiye güncelle + Transaction (Completed) + 2 LedgerEntry.",
        "Fraud log: HIGH_AMOUNT (>10k), NIGHT (>5k, 00–05), FREQUENT (3+/dk).",
        "DbUpdateConcurrencyException → rollback.",
    ]:
        story.append(Paragraph(f"• {item}", styles["VBullet"]))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph("4.3 FraudModelService", styles["H2"]))
    story.append(Paragraph(
        "Skor = 0.6×(amount/25000) + 0.2×gece_riski + 0.2×(frequency/8). Eşik: <b>%70</b>. "
        "Üzerinde TransfersController transferi engeller.",
        styles["Body"]
    ))
    story.append(PageBreak())

    # Cavit
    story.append(Paragraph("5. Cavit Batu Soylu — Full Stack · Neon AI · Deploy", styles["H1"]))
    story.append(Paragraph(
        "<b>Ana sorumluluk:</b> PWA arayüzü, Neon AI, UsersController, paylaşımlı DB senkronu, README/landing, deploy.",
        styles["Body"]
    ))
    story.append(Paragraph("5.1 Frontend Dosya Haritası", styles["H2"]))
    story.append(make_table([
        ["Dosya", "İçerik", "Satır (yaklaşık)"],
        ["index.html", "Landing, modals, dashboard, admin, Neon AI", "~1700"],
        ["vireon.js", "Auth, fetchDashboardData, transfer, admin, i18n", "~2400"],
        ["vireon.css", "Neon tema, responsive, floating chat", "~5400"],
        ["manifest.json + sw.js", "PWA kurulum ve cache", "—"],
    ], [3.5 * cm, 7 * cm, 3.5 * cm]))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("5.2 UsersController Endpoint'leri", styles["H2"]))
    story.append(make_table([
        ["Method", "Route", "Açıklama"],
        ["POST", "/api/users/register", "Kayıt + Account + DailyLimit"],
        ["POST", "/api/users/login", "BCrypt giriş + session verisi"],
        ["POST", "/api/users/forgot-password", "E-posta + hesap no ile sıfırlama"],
        ["POST", "/api/users/{id}/delete-account", "Kalıcı silme (admin demo korunur)"],
        ["PUT", "/api/users/{id}", "Profil güncelleme"],
        ["GET", "/api/users/admin-*", "Admin panel verileri"],
    ], [2 * cm, 6 * cm, 7 * cm]))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("5.3 Neon AI Bileşenleri", styles["H2"]))
    for item in [
        "NeonAIService — Groq API (llama-3.1-8b-instant) + offline TR/EN sözlük.",
        "AIController — POST /api/ai/chat.",
        "Frontend — floating chat + dashboard sohbet, localStorage geçmiş.",
        "appsettings.Development.json — Groq ApiToken (gitignore).",
    ]:
        story.append(Paragraph(f"• {item}", styles["VBullet"]))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph("5.4 Paylaşımlı DB (SharedDatabaseGitSync)", styles["H2"]))
    story.append(Paragraph(
        "PullOnStartup: GitHub'dan DB çek. AutoGitSync: değişiklik sonrası ~8 sn otomatik push. "
        "Manuel: npm run sync-db. Branch: appsettings.json → SharedDatabase:GitBranch.",
        styles["Body"]
    ))
    story.append(PageBreak())

    # Koordinasyon
    story.append(Paragraph("6. Ekip Koordinasyonu", styles["H1"]))
    add_image(story, draw_coordination())
    story.append(make_table([
        ["Konu", "Birincil", "İkincil"],
        ["Yeni tablo/sütun", "Kerem", "Enes (TM), Cavit (UI)"],
        ["Transfer kuralı", "Enes", "Kerem (entity)"],
        ["Fraud eşiği", "Enes", "Cavit (admin UI)"],
        ["Login/profil", "Cavit", "Kerem (User entity)"],
        ["Neon AI", "Cavit", "—"],
        ["DB senkron conflict", "Cavit", "Kerem"],
        ["README/deploy", "Cavit", "Herkes"],
    ], [5 * cm, 4 * cm, 6 * cm]))
    story.append(Spacer(1, 0.5 * cm))

    story.append(Paragraph("7. 2 Haftalık Öğrenme Takvimi", styles["H1"]))
    story.append(make_table([
        ["Gün", "Kerem", "Enes", "Cavit"],
        ["1–2", "Entity + Context", "API haritası + TransfersController", "Frontend + auth"],
        ["3–4", "Migrations + seed", "TransactionManager", "Dashboard + transfer UI"],
        ["5", "SQLite pratik", "FraudModelService", "Neon AI"],
        ["6", "FK/silme sırası", "Validators + DTO", "Admin panel + PWA"],
        ["7", "Code review", "Swagger test", "Git sync + deploy"],
        ["8–14", "Entegrasyon", "Entegrasyon", "Sunum provası"],
    ], [1.5 * cm, 4.5 * cm, 4.5 * cm, 4.5 * cm]))

    story.append(Spacer(1, 0.8 * cm))
    story.append(Paragraph(
        "<i>MIT License — Vireon Eğitim Projesi 2026. Bu belge görev dağılımı ve proje hakimiyeti için hazırlanmıştır.</i>",
        styles["Body"]
    ))

    doc.build(story)
    return OUTPUT


if __name__ == "__main__":
    path = build_pdf()
    print(f"Olusturuldu: {path}")
