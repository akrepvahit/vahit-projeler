# Vahit Projeler

Netlify uzerinde sorunsuz calismasi icin hazirlanmis, projelerini sergileyebilecegin vitrin sitesi ve yonetim paneli.

## Ozellikler

- Sahne etkili modern portfolyo ana sayfasi
- Proje ekle, guncelle, sil ve kaydet yapan admin paneli
- Netlify Functions + Netlify Blobs ile kalici veri yapisi
- Tek proje icerisinde hem vitrin hem yonetim akisi
- Vite + React ile hizli gelistirme ve build

## Yerelde Calistirma

```bash
npm install
npm run dev
```

Yerel gelistirmede admin paneli icin demo sifre otomatik olarak `vahit-demo` olur.

Admin panel adresi:

```text
/yonetim
```

## Netlify Ayarlari

Netlify tarafinda bu iki environment variable'i ekle:

```text
ADMIN_PASSWORD=senin-guclu-sifren
AUTH_SECRET=uzun-rastgele-bir-imza
```

`netlify.toml` zaten build ayarlarini hazirlar:

- Build command: `npm run build`
- Publish directory: `dist`

## Icerik Yonetimi

- Public listeleme: `/api/projects`
- Admin oturumu: `/api/admin/session`
- Admin CRUD: `/api/admin/projects`
- JSON aktarimi: localde `JSON disa aktar`, canlida `JSON ice aktar`

Kapak gorseli icin istersen link yapistirabilir, istersen yonetim panelinden dogrudan dosya secerek data URL olarak saklayabilirsin.
# vahit-projeler
