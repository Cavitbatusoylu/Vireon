// Bu script, sisteme aynı milisaniyede çoklu istek atarak Concurrency ve Fraud testleri yapar.

const API_URL = 'http://localhost:5202/api/transfers/send-by-account';

// Test veritabanındaki hesap numaralarını buraya gir (Eğer farklıysa kendi hesap numaralarınla değiştir)
const SENDER_ACCOUNT = 'TR1001'; // Ahmet'in hesap numarası (Örnek)
const RECEIVER_ACCOUNT = 'TR1002'; // Ayşe'nin hesap numarası (Örnek)
const TRANSFER_AMOUNT = 10; // Küçük bir miktar

async function sendTransferRequest(id) {
    console.log(`[İstek ${id}] Sunucuya gönderiliyor...`);
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                senderAccountNumber: SENDER_ACCOUNT,
                receiverAccountNumber: RECEIVER_ACCOUNT,
                amount: TRANSFER_AMOUNT,
                description: `Stress Test - İstek ${id}`
            })
        });

        const data = await response.json();
        if (response.ok) {
            console.log(`✅ [İstek ${id}] Başarılı: Transfer gerçekleşti.`);
        } else {
            console.log(`❌ [İstek ${id}] Reddedildi: ${data.mesaj || data.message || JSON.stringify(data)}`);
        }
    } catch (error) {
        console.error(`💥 [İstek ${id}] Bağlantı Hatası:`, error.message);
    }
}

async function runStressTest() {
    console.log("🚀 VIREON STRESS TESTİ BAŞLIYOR...");
    console.log("Aynı anda 5 işlem isteği atılarak 'Optimistic Concurrency' ve 'Fraud' kalkanları test ediliyor...\n");

    const requests = [];
    // Aynı anda (paralel olarak) 5 istek atıyoruz
    for (let i = 1; i <= 5; i++) {
        requests.push(sendTransferRequest(i));
    }

    // Tüm isteklerin sonuçlanmasını bekle
    await Promise.all(requests);
    console.log("\n🏁 STRESS TESTİ BİTTİ.");
}

runStressTest();
