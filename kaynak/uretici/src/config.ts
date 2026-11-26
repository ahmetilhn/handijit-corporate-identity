import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Repository layout: the generator lives in kaynak/uretici, the pack folders sit two levels up.
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const dir = {
  guide: path.join(ROOT, '00-kilavuz'),
  logo: path.join(ROOT, '01-logo'),
  font: path.join(ROOT, '02-font'),
  construction: path.join(ROOT, '03-konstruksiyon'),
  print: path.join(ROOT, '04-basili'),
  office: path.join(ROOT, '05-ofis'),
  digital: path.join(ROOT, '06-dijital'),
  developer: path.join(ROOT, '07-gelistirici'),
  inputs: path.join(ROOT, 'kaynak/uretici/girdi'),
};

// Brand facts shown on the assets. They mirror the website (site.config.ts, the home hero and the trust facts);
// nothing here may be invented.
export const brand = {
  name: 'Han Dijit',
  descriptor: 'Yazılım firması',
  heroTitle: 'İşinize özel yazılım çözümleri',
  expertise: 'Yazılım · Yapay zekâ · Siber güvenlik',
  phone: '+90 552 579 93 21',
  whatsappUrl: 'https://wa.me/905525799321',
  web: 'handijit.com',
  github: 'github.com/handijit',
  cta: 'Teklif alın',
  facts: [
    { value: '6 yıl', label: 'tecrübe' },
    { value: '50+', label: 'proje' },
    { value: '81 il', label: 'hizmet bölgesi' },
    { value: '1 iş günü', label: 'teklif dönüşü' },
  ],
  founder: { name: 'Ahmet İlhan', role: 'Kurucu' },
} as const;

export const GUIDE_VERSION = '4.0';
export const GUIDE_DATE = 'Kasım 2026';
