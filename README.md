<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/407a939a-b1e1-4ea0-b89f-8a1adf94559b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


## Ücretsiz TikTok LIVE bağlantısı (PirateTok)

Bu sürüm, Euler Stream imzalama servisini kullanmak yerine `piratetok-live-js` paketini kullanır. API anahtarı veya ücretli Euler planı gerektirmez. PirateTok yeni ve tersine mühendislik tabanlı bir projedir; TikTok tarafındaki değişiklikler bağlantıyı etkileyebilir.

**Gereksinim:** Node.js 22.19 veya üzeri (tercihen Node.js 24 LTS).

Kurulum: proje klasöründe `npm install`, ardından `npm run dev`.


### Hediye kataloğu ve profil fotoğrafları

`/api/tiktok-gifts` artık JSON döndürür; bu, tarayıcıdaki `Unexpected token '<'` hatasını önler. Ücretsiz PirateTok bağlantısı yaygın hediye kataloğunu yükler ve canlı yayında ilk kez görülen hediyeleri listeye ekler. TikTok'un o anki tüm bölgesel hediye kataloğunu doğrudan almak PirateTok'un şu anki API'sinde bulunmadığından katalog yüzde yüz canlı/tam liste olarak garanti edilemez. Profil fotoğrafları farklı TikTok avatar alanlarından okunacak şekilde genişletildi.


## Hediye kataloğu notu

Canlı yayın bağlantısı ve takip/beğeni/hediye olayları PirateTok üzerinden gider. Tam hediye kataloğu ayrı olarak `tiktok-live-connector` 1.2.3 sürümündeki `getAvailableGifts()` yöntemiyle alınmaya çalışılır; bu eski uç nokta TikTok tarafında değişirse katalog isteği hata verebilir. Bu proje bu yöntemi gerçek TikTok yayını üzerinde doğrulanmış olarak garanti etmez.


## Render dağıtım ayarları

Bu proje Render üzerinde ayrı bir **Web Service** olarak çalıştırılabilir.

- **Build Command:** `bun install && bun run build`
- **Start Command:** `bun run start`
- **Environment:** `NODE_ENV=production` (Start komutu bunu zaten ayarlar; ayrıca eklemek zorunlu değildir.)

Build adımı `dist/` klasörünü oluşturur. Sunucu üretim ortamında bu klasördeki `index.html` dosyasını sunar. `dist/` klasörünü GitHub'a ayrıca yüklemek gerekmez; Render her dağıtımda build komutuyla üretir.

## Çark ve otomatik çevirme düzeltmeleri

- Çark üzerindeki sektör sesi yanlış değişkeni çağırıyordu; ses motoruna bağlandı.
- Uygulamanın çağırdığı ses fonksiyonları eksikti; eksik ses efektleri eklendi ve ses hatalarının oyunu durdurması engellendi.
- Otomatik çevirme, React state güncellemesinin içinden çarkı başlatmayacak şekilde yeniden düzenlendi. Böylece aynı anda birden fazla dönüş tetiklenmesi ve otomatik mod sırasında ekranın çökmesine yol açabilen render döngüsü riski giderildi.
- Tek katılımcı kaldığında da dönüş kilidi tutarlı biçimde kapatılıyor.
