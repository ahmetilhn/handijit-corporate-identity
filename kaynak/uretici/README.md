# Kurumsal kimlik üreticisi

Paketteki renkli dosyaları ve kılavuzu tasarım tokenlarından üretir. Renk, logo ve font değerlerinin tek kaynağı web sitesinin de kullandığı `@handijitcom/ui` paketinin `/design` alt yoludur; burada hiçbir renk elle yazılmaz.

## Çalıştırma

```sh
cd kaynak/uretici
npm install
npm run uret
```

Node 24 veya üstü gerekir (TypeScript doğrudan Node ile çalışır). PDF'ler ve küçük ikonlar Playwright'ın Chromium'uyla basılır; makinede yoksa bir kez `npx playwright install chromium` çalıştırın. Bir çalıştırma birkaç saniye sürer ve aynı girdiyle aynı dosyaları üretir.

## Ne üretir

| Klasör | Dosyalar |
| --- | --- |
| `01-logo` | Renkli ve negatif işaret, yatay ve dikey logo, karo logo (svg, png, pdf); bant uygulama ikonu. Siyah ve beyaz ana dosyalara dokunmaz. |
| `04-basili` | Kartvizit (ön beyaz, arka bant), antetli kâğıt, sticker: baskı PDF'leri ve `kaynak/` altında düzenlenebilir SVG'ler. Kartvizitteki karekod her çalıştırmada okutularak doğrulanır. |
| `05-ofis` | Sunum şablonunun kapak, bölüm ayracı ve kapanış düzenleri ile bu düzenlerdeki örnek slaytlar. Word antetli, teklif oluşturucu ve örnek teklif bilinçli olarak siyah-beyaz kalır ve üretilmez. |
| `06-dijital` | OG, LinkedIn kapak, gönderi, hikâye, profil, GitHub, toplantı arka planı (svg, png) ve favicon seti. |
| `07-gelistirici` | `marka-tokenlari.css` |
| `00-kilavuz` | Kılavuz HTML (tek dosya, fontlar ve görseller gömülü) ve PDF. |

`02-font` ve `03-konstruksiyon` girdidir, değişmez. `girdi/` klasöründeki PNG'ler üreticinin üretmediği siyah-beyaz ofis dosyalarının (teklif, Word, sunum içerik slaytları) kılavuzdaki ekran görüntüleridir; o dosyalar değişirse yenileriyle değiştirin.

## Değiştirme

- Renk ya da logo: `@handijitcom/ui` sürümünü yükseltip `npm run uret`.
- Metinler (telefon, başlıklar, bilgi şeridi, kurucu adı): `src/config.ts`.
- Yerleşim: her dosya grubunun kendi modülü var (`src/assets/*.ts`); ortak parçalar (karo, eyebrow, başlık, düğme, bant, süper grafik) `src/brand.ts` içinde.
- Dikey logo, sade işaret ve iki satırlık yazı çizimi paket henüz taşımadığı için `src/geometry.ts` içinde, web sitesinin `src/constants` dosyalarından kopyadır; orada değişirse burada da güncelleyin.

## Notlar

- PDF'ler RGB'dir. Matbaa CMYK'ya çevirip prova göndermelidir (kılavuz, bölüm 12).
- SVG'lerde metin canlıdır ve kullanılan karakterlerin font alt kümeleri gömülüdür; tasarım programında düzenlemek için `02-font` fontlarını yükleyin.
- `npm run typecheck` tip denetimi yapar.
