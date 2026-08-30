# Deploy

Frontend dan backend jalan sebagai dua container di belakang nginx milik host.
Image dibangun di GitHub Actions; VPS hanya menariknya.

```
push ke main
  └─ .github/workflows/deploy.yml
       ├─ build + push  ghcr.io/eleazerv/smart-tourism-{api,web}:<sha>
       └─ ssh ke VPS → docker compose -f docker-compose.prod.yml pull && up -d
```

Langkah 1-7 di bawah hanya sekali seumur hidup. Setelah itu deploy = `git push`.

---

## 1. Domain dan DNS (Cloudflare)

Domain `iitech.id` sudah kamu punya, jadi ini cuma menambah satu subdomain.
Apa pun yang sudah jalan di `iitech.id` tidak tersentuh.

Di Cloudflare → pilih zona `iitech.id` → **DNS → Records → Add record**:

| Type | Name | IPv4 address | Proxy status | TTL |
| --- | --- | --- | --- | --- |
| A | `jelantara` | IP publik VPS | **DNS only** (awan abu-abu) | Auto |

Isi kolom Name dengan `jelantara` saja, bukan `jelantara.iitech.id` —
Cloudflare menambahkan nama zonanya sendiri.

**Mulai dari DNS only, jangan Proxied.** Certbot membuktikan kepemilikan
domain dengan mengakses `http://jelantara.iitech.id` dari luar; kalau
Cloudflare memproxy, yang menjawab adalah Cloudflare, bukan VPS-mu, dan
penerbitan sertifikat gagal. Let's Encrypt punya batas percobaan per jam,
jadi salah urutan berarti menunggu.

Kalau `iitech.id` punya record wildcard `*`, record spesifik ini menang —
tidak perlu menghapus wildcard-nya.

Tunggu sampai teresolusi, lalu pastikan yang keluar IP VPS-mu:

```bash
dig +short jelantara.iitech.id
```

### Kalau nanti mau dinyalakan Proxied (awan oranye)

Boleh, setelah sertifikat terbit — tapi dua hal harus ikut berubah:

1. **SSL/TLS → Overview → mode Full (strict).** Mode Flexible membuat
   Cloudflare menghubungi VPS lewat HTTP biasa, dan cookie sesi Supabase
   yang bertanda `Secure` tidak akan pernah terkirim: login gagal diam-diam.

2. **`trust proxy` di backend harus jadi `2`.** Sekarang
   [`main.js`](../backend/main.js) menyetel `app.set('trust proxy', 1)`,
   yang benar untuk satu lompatan (nginx). Dengan Cloudflare di depan,
   rantainya jadi dua: pengunjung → Cloudflare → nginx → Express. Nilai `1`
   membuat Express membaca IP Cloudflare sebagai IP pengunjung, sehingga
   rate limiter di `middleware/RateLimit.js` mengunci semua orang yang lewat
   satu edge Cloudflare ke dalam satu kuota yang sama.

Selama tetap DNS only, `trust proxy 1` sudah benar dan tidak perlu diapa-apakan.

## 2. Siapkan VPS

```bash
# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER          # logout & login lagi setelah ini

# Repo. Isinya dipakai untuk compose file + config nginx, bukan untuk build.
sudo mkdir -p /srv/smart-tourism && sudo chown $USER /srv/smart-tourism
git clone https://github.com/eleazerv/Smart-Tourism.git /srv/smart-tourism
cd /srv/smart-tourism
```

## 3. Dua file .env di VPS

Keduanya tidak pernah masuk git maupun image.

```bash
# a) Secret backend — dibaca container saat runtime
cp backend/.env.example backend/.env && nano backend/.env
chmod 600 backend/.env
```

Yang wajib diganti dari nilai lokalmu: `PAYMENT_SUCCESS_URL` dan
`PAYMENT_FAILURE_URL` harus mengarah ke domain production, bukan
`localhost:3000`.

```bash
# b) .env di root — hanya dibutuhkan langkah 6 (bootstrap)
cp .env.example .env && nano .env
```

Root `.env` terasa mubazir karena `docker-compose.prod.yml` tidak memakainya.
Tetap perlu: `docker-compose.yml` menginterpolasi **seluruh** file sebelum
memilih service, jadi `docker compose up api` pun menolak jalan kalau build
args milik `web` belum ada nilainya.

## 4. Akses ke GHCR

Image-nya private secara default. Buat PAT di GitHub dengan scope
`read:packages`, lalu sekali saja di VPS:

```bash
echo <PAT> | docker login ghcr.io -u eleazerv --password-stdin
```

## 5. nginx, firewall, TLS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/smart-tourism
sudo ln -s /etc/nginx/sites-available/smart-tourism /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default          # hapus welcome page bawaan

# nginx.conf meng-include /etc/nginx/proxy_params dan menolak start kalau
# file itu tidak ada. Debian/Ubuntu sudah menyediakannya.
test -f /etc/nginx/proxy_params || sudo cp deploy/proxy_params /etc/nginx/proxy_params

sudo nginx -t && sudo systemctl reload nginx

# Firewall. Port 3000 dan 4000 sengaja tidak dibuka — hanya nginx yang
# boleh menjangkaunya.
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable

# Baru sekarang, setelah dig di langkah 1 mengeluarkan IP yang benar
sudo certbot --nginx -d jelantara.iitech.id
```

Wajar kalau `https://jelantara.iitech.id` masih 502 di titik ini — container-nya
memang belum ada.

## 6. Bootstrap: API harus hidup lebih dulu

Ini bagian yang tidak bisa dibalik urutannya. Halaman `/` dan `/peta`
di-prerender saat `next build` sambil memanggil API lewat `"use cache"`,
jadi **image frontend tidak bisa dibangun sebelum API melayani di domain
publik** — termasuk saat dibangunnya di GitHub Actions.

Deploy pertama juga belum punya image apa pun di GHCR, jadi API-nya dibangun
langsung di VPS satu kali:

```bash
docker compose -f docker-compose.yml up -d --build api
curl -s -o /dev/null -w '%{http_code}\n' https://jelantara.iitech.id/api/tags   # harus 200
```

Kalau bukan 200, berhenti di sini dan benahi dulu — push ke main akan gagal
di tahap build web. Cek `docker compose logs api` dan `sudo nginx -t`.

## 7. Variables dan Secrets di GitHub

**Settings → Secrets and variables → Actions → Variables**

| Nama | Contoh |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://jelantara.iitech.id` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` |
| `VPS_PATH` | `/srv/smart-tourism` |
| `VPS_PORT` | `22` (boleh dikosongkan) |

Ketiga `NEXT_PUBLIC_*` sengaja Variables, bukan Secrets: nilainya ikut dibakar
ke bundle JavaScript dan terkirim ke setiap pengunjung, jadi menyamarkannya di
log tidak menambah keamanan apa pun — hanya membuat build gagal sulit dibaca.

**Settings → Secrets and variables → Actions → Secrets**

| Nama | Isi |
| --- | --- |
| `VPS_HOST` | IP atau hostname VPS |
| `VPS_USER` | user SSH, jangan root |
| `VPS_SSH_KEY` | private key deploy, seluruh isinya termasuk baris BEGIN/END |
| `VPS_KNOWN_HOSTS` | keluaran `ssh-keyscan -p 22 <host>` |

Buat kunci khusus deploy, jangan pakai kunci pribadimu:

```bash
ssh-keygen -t ed25519 -f deploy_key -N "" -C "github-actions"
ssh-copy-id -i deploy_key.pub user@ip-vps    # yang .pub ke VPS
cat deploy_key                               # isinya ke secret VPS_SSH_KEY
ssh-keyscan -p 22 ip-vps                     # keluarannya ke VPS_KNOWN_HOSTS
```

## 8. Dashboard di luar repo

- **Supabase → Auth → URL Configuration** — isi Site URL `https://jelantara.iitech.id`
  dan tambahkan ke Redirect URLs. Tanpa ini email konfirmasi pendaftaran
  mengarah ke tempat yang salah dan reset password putus di tengah.
- **Xendit → Settings → Callbacks** — invoice callback ke
  `https://jelantara.iitech.id/api/webhooks/xendit`. Ini satu-satunya jalur yang
  boleh menandai booking jadi `paid`; kalau salah, pembayaran berhasil di
  Xendit tapi database tetap `unpaid`.
- Ganti `XENDIT_SECRET_KEY` ke kunci production kalau sudah mau terima uang
  sungguhan — yang sekarang masih `xnd_development_...`.

## 9. Deploy

Setelah semua di atas beres:

```bash
git push origin main
```

Workflow akan build kedua image, push ke GHCR, ssh ke VPS, `pull && up -d`,
lalu memastikan `https://jelantara.iitech.id/` balas 200 sebelum dinyatakan sukses.

---

## Operasi harian

```bash
# Lihat status & log
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api

# Rollback — tag tiap commit tersimpan di GHCR, tidak perlu build ulang
IMAGE_TAG=<sha commit lama> docker compose -f docker-compose.prod.yml up -d

# Sertifikat diperpanjang otomatis oleh timer certbot. Cek kalau ragu:
sudo certbot renew --dry-run
```

Mengubah nilai `NEXT_PUBLIC_*` berarti **rebuild**, bukan restart — nilainya
sudah menyatu di dalam bundle. Ubah Variable di GitHub lalu jalankan ulang
workflow Deploy (tombol Run workflow).
