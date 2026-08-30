# Batas wilayah provinsi

`provinces-idn.geojson` — 34 poligon provinsi Indonesia, disederhanakan untuk
peta kepadatan di `/peta`.

## Sumber dan lisensi

Diturunkan dari **geoBoundaries** gbOpen IDN ADM1 (rilis 2023, batas
representasi tahun 2017), yang datanya berasal dari OpenStreetMap.

- Lisensi: **Open Data Commons Open Database License (ODbL) 1.0**
- Atribusi wajib, dan dipasang di kontrol atribusi peta:
  "Batas wilayah: geoBoundaries.org — ODbL"
- Sitasi akademis: Runfola, D. et al. (2020) *geoBoundaries: A global database
  of political administrative boundaries.* PLoS ONE 15(4): e0231866.

ODbL bersifat share-alike: berkas ini adalah database turunan, jadi ia tetap
berlisensi ODbL meskipun berada di dalam repo ini.

## Bagaimana berkas ini dibuat

1. Diambil dari `geoBoundaries-IDN-ADM1_simplified.geojson` (3,4 MB).
2. Disederhanakan dengan Douglas–Peucker, toleransi 0,02 derajat
   (117.173 titik menjadi 7.671 — sekitar 6%), koordinat dibulatkan 4 desimal.
   Hasilnya 144 KB dan masih terbaca jelas pada zoom nasional, yang merupakan
   satu-satunya zoom peta ini.
3. Nama provinsi berbahasa Inggris dipetakan ke kode BPS, yang merupakan kunci
   join terhadap `province_code` dari `GET /api/heatmap`.

## Papua

Sumber ini berasal dari tahun 2017, jadi tidak memuat empat provinsi hasil
pemekaran 2022: Papua Barat Daya (92), Papua Selatan (95), Papua Tengah (96),
dan Papua Pegunungan (97).

Tidak ada sumber batas garis pantai yang memuatnya. OpenStreetMap punya ke-38
provinsi, tetapi batas `admin_level=4`-nya digambar sebagai batas maritim —
poligon Provinsi Bali di sana hanya segi-sepuluh kasar di atas laut, bukan
bentuk pulaunya — sehingga tidak bisa dipakai untuk peta koroplet.

Karena itu poligon induknya membawa kode penerusnya:

- `Papua` -> 94, 95, 96, 97
- `Papua Barat` -> 91, 92

Peta mewarnainya memakai tingkat kepadatan **tertinggi** di antara provinsi
anggotanya, bukan jumlahnya: menjumlahkan empat provinsi sepi bisa membuat
wilayah itu tampak ramai. Tooltip-nya merinci angka tiap provinsi satu per satu
dan menyebutkan bahwa wilayahnya digabung.
