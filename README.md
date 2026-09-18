<div align="center">

<img src="assets/banner.svg" alt="WNERSAI — WNERSDEV AI Platform" width="100%">

<br>

[![Sürüm](https://img.shields.io/badge/s%C3%BCr%C3%BCm-0.1.0-5865F2?style=for-the-badge&labelColor=0B1024)](https://github.com/wnersdev/wnersai/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=0B1024)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node.js-18%2B-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white&labelColor=0B1024)](https://nodejs.org)
[![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white&labelColor=0B1024)](https://discord.js.org)
<br>
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white&labelColor=0B1024)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-BullMQ-FF4438?style=for-the-badge&logo=redis&logoColor=white&labelColor=0B1024)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-haz%C4%B1r-2496ED?style=for-the-badge&logo=docker&logoColor=white&labelColor=0B1024)](https://www.docker.com/)
[![Dil](https://img.shields.io/badge/dil-tr%20%7C%20en%20%7C%20de%20%7C%20es-A78BFA?style=for-the-badge&labelColor=0B1024)](#dil-desteği)

</div>

<br>

## WNERSAI nedir

Beş farklı yapay zekâ sağlayıcısını tek bir kapıdan geçiren, o kapının arkasında istediğiniz kadar Discord botu çalıştırabilen bir platform.

Tek bir bota sabitlenmiş "AI botu" değil. Sağlayıcıyı siz seçersiniz, anahtar sizde kalır, biri çökerse istek sıradakine devrolur, hepsi tek bir yönlendirme ve güvenlik katmanından geçer.

| | |
|:--|:--|
| **Beş sağlayıcı, tek arayüz** | OpenAI, Gemini, Claude, Grok ve OpenAI uyumlu kendi API'niz — hepsi aynı `AIProvider` arayüzünün arkasında |
| **Kesintiye dayanıklı** | Yeniden deneme, zaman aşımı, devre kesici ve isteğe bağlı yedek zincir |
| **Çok botlu** | Tek kurulum üzerinden onlarca bot; süreçler arasında paylaştırma hazır |
| **Çok kiracılı** | Bir kullanıcının botu, anahtarı ve konuşması diğerine kapalı |
| **Türkçe öncelikli** | Komut isimleri Türkçe kalır, arayüz metinleri dört dile çevrilir |
| **Anahtarlar şifreli** | Bot token'ları ve API anahtarları AES-256-GCM ile saklanır, hiçbir yere sızmaz |

<br>

## Nasıl çalışıyor

<div align="center">
<img src="assets/architecture.svg" alt="WNERSAI sistem mimarisi" width="100%">
</div>

Buradaki asıl fikir şu: **slash komutu, prefix komutu, buton ve Web API — dördü de aynı `AIService`'e iner.** Yani `/ai` ile `w!ai` arasında kopyalanmış iş mantığı yok. Bir davranışı değiştirmek istediğinizde tek bir yeri değiştiriyorsunuz.

```
Slash  ─┐
Prefix ─┼─▶  AIService  ─▶  ProviderRouter  ─▶  OpenAI · Gemini · Claude · Grok · Custom
Buton  ─┤
API    ─┘
```

<br>

## Bir sağlayıcı düştüğünde

<div align="center">
<img src="assets/fallback.svg" alt="Yedek zincir ve devre kesici" width="100%">
</div>

Yedek zincir **kendiliğinden devreye girmez.** İki koşul birden gerekir: kullanıcının onu açmış olması ve o sağlayıcı için geçerli bir anahtarının bulunması. Aksi halde istek birincil sağlayıcıda kalır ve hata olduğu gibi raporlanır.

Devre kesici durumu Redis'te tutulur, böylece birden fazla worker süreci aynı sağlayıcının çöktüğünü ayrı ayrı keşfetmek zorunda kalmaz.

<br>

## Discord'da görünüşü

<div align="center">
<img src="assets/panel.svg" alt="Discord'da /ai paneli" width="92%">
</div>

<br>

## Komutlar

Komut isimleri Türkçedir ve öyle kalır. Yalnızca kullanıcıya gösterilen metinler çevrilir.

| Komut | Ne yapar |
|:--|:--|
| `/ai [mesaj]` | Mesaj verirseniz yanıtlar, vermezseniz kontrol panelini açar |
| `/sohbet [mesaj]` | `/ai` ile aynı |
| `/model` | Önce sağlayıcı, sonra model seçtirir |
| `/modeller` | Sağlayıcının desteklediği modelleri listeler |
| `/ayarla` | API anahtarınızı ekler veya değiştirir |
| `/bellek temizle` | Uzun süreli belleğinizi siler |
| `/sifirla` | Aktif konuşmayı sıfırlar |
| `/istatistik` | İstek, token, gecikme ve sağlayıcı dağılımınız |
| `/kontrol` | Botlarınızın ve sağlayıcıların genel durumu |
| `/botlar` | Botlarınızı başlatır, durdurur, yeniden başlatır |
| `/araclar` | Araçları listeler veya çalıştırır |
| `/dil` | Arayüz dilini değiştirir |
| `/yardim` | Komut listesi |

Prefix tarafı varsayılan olarak `w!` ile çalışır ve sunucu bazında değiştirilebilir:

```
w!ai Merhaba
w!prefix ?      →  artık ?ai Merhaba
```

<br>

## Kurulum

```bash
git clone https://github.com/wnersdev/wnersai.git
cd wnersai
cp .env.example .env
npm install
```

`.env` içinde doldurmanız gerekenler:

```env
MONGODB_URI=mongodb://localhost:27017/wnersai
REDIS_URL=redis://localhost:6379
ENCRYPTION_KEY=<64 karakterlik hex>
API_KEY_HASH_SECRET=<uzun rastgele bir dize>
```

Şifreleme anahtarını üretmek için:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Sonra komutları Discord'a tanıtın ve çalıştırın:

```bash
npx ts-node src/scripts/deployCommands.ts <BOT_TOKEN> <APPLICATION_ID> [GUILD_ID]
npm run build
npm start
```

> `GUILD_ID` verirseniz komutlar anında görünür. Vermezseniz global kayıt yapılır ve yayılması bir saati bulabilir.

<details>
<summary><b>Docker ile</b></summary>

<br>

```bash
ENCRYPTION_KEY=... API_KEY_HASH_SECRET=... docker compose up --build
```

`docker-compose.yml` üç servis ayağa kaldırır: WNERSAI, MongoDB ve Redis. Bot sayınız arttığında `WORKER_COUNT` ve `WORKER_INDEX` değerlerini vererek birden fazla replika çalıştırabilirsiniz.

</details>

<br>

## Araçlar ve yapay zekânın yetki sınırı

Yapay zekânın çağırabildiği her araç şu zincirden geçer:

```
doğrulama → kullanıcı yetkisi → bot yetkisi → hız limiti → zaman aşımı → çalıştırma
```

Kayıtlı araçların tamamı **salt okunur**:

| Araç | Ne döndürür |
|:--|:--|
| `calculator` | Matematiksel ifadenin sonucu (mathjs, kod çalıştırma yok) |
| `web-search` | Arama sonuçları (kendi arama API anahtarınızla) |
| `discord-info` | Botun gecikmesi ve çalışma süresi |
| `user-info` | Bir kullanıcının herkese açık profil bilgisi |
| `server-info` | Botun bulunduğu sunucunun genel bilgisi |

Yasak olanlar listeye eklenmedi — **sistemde karşılığı hiç yok.** Yani yapay zekâ ban atamaz, kick atamaz, rol yönetemez, kanal silemez, token'lara erişemez, yetki değiştiremez. Bunlar engellenen davranışlar değil, var olmayan yetenekler.

<br>

## Güvenlik

| Ne | Nasıl |
|:--|:--|
| Bot token'ları ve sağlayıcı anahtarları | AES-256-GCM ile şifreli saklanır, loglanmaz, arayüze geri gönderilmez |
| Arayüzde gösterim | `sk-••••••••••••1234` biçiminde maskelenir |
| WNERSAI'nin kendi API anahtarları | Yalnızca HMAC-SHA256 özeti saklanır, ham hali bir kez gösterilir |
| İstek doğrulama | Zod şemaları |
| HTTP katmanı | Helmet, hız limiti, istek zaman aşımı |
| İzlenebilirlik | Denetim kaydı ve hassas alanları ayıklanmış yapılandırılmış log |

Sağlayıcı entegrasyonları yalnızca **resmî API'ler** üzerinden çalışır. Sızdırılmış anahtar, kırılmış API, yetkilendirme atlatma veya hız limiti atlatma yöntemleri projeye dahil değildir ve "sınırsız ücretsiz yapay zekâ" gibi bir iddiası yoktur.

<br>

## Dil desteği

🇹🇷 Türkçe · 🇬🇧 English · 🇩🇪 Deutsch · 🇪🇸 Español

Sabit kodlanmış kullanıcı metni yoktur; her metin `src/localization/` altındaki katalogdan gelir.

<br>

## Web API

```http
POST /v1/chat
Authorization: Bearer wners_live_xxxxxxxxxxxx
Content-Type: application/json

{ "botInstanceId": "...", "prompt": "Merhaba" }
```

| Uç nokta | Döndürdüğü |
|:--|:--|
| `POST /v1/chat` | Yapay zekâ yanıtı, kullanılan sağlayıcı ve model |
| `GET /v1/models` | Sizin açık sağlayıcılarınız ve seçili modelleri |
| `GET /v1/providers` | Desteklenen sağlayıcı listesi |
| `GET /v1/usage` | Son kullanım kayıtlarınız |

<br>

## Proje yapısı

```
src/
├── commands/        her komut kendi klasöründe
├── prefix/          w! komutları — aynı AIService'i çağırır
├── providers/       AIProvider arayüzü ve beş adaptör
├── ai/
│   ├── router/      ProviderRouter, CircuitBreaker
│   ├── context/     bellek ve bağlam yönetimi
│   └── tools/       ToolManager ve araçlar
├── bots/            BotManager, BotRuntime, WorkerManager, HealthManager
├── models/          Mongoose şemaları
├── services/        AIService — tek iş mantığı girişi
├── components/      etkileşim yönlendirici, panel arayüzü
├── canvas/          yanıt ve kullanım kartları
├── queues/          BullMQ istek kuyruğu
├── api/             Express /v1
├── security/        şifreleme, anahtar üretimi
└── localization/    tr, en, de, es
```

<br>

## Ölçeklenme hakkında dürüst not

Mimari çok botlu çalışacak şekilde kuruldu: `WorkerManager` bot kimliklerini süreçler arasında hash'e göre paylaştırır, kuyruk ani yük patlamalarını emer, devre kesici çöken sağlayıcıyı devreden çıkarır.

Ama şunu abartmadan söylemek gerekir: **binlerce bot rakamı bir hedef, ölçülmüş bir sonuç değil.** Oraya giderken Discord'un hız limitleri, bellek ve ağ maliyeti gerçek sınırlar olarak karşınıza çıkar. Sistem o yöne büyüyebilecek şekilde kurgulandı, gereksiz karmaşıklık eklenmeden.

<br>

## Test

```bash
npm test
```

Şu an testler yönlendirici ve yedek zincir mantığını, araç yetki zincirini, şifreleme turunu ve yeniden deneme davranışını kapsıyor.

<br>

---

<div align="center">

**WNERSDEV**

*Simple where possible. Powerful where necessary.*

</div>
