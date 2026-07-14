# Panduan Setup Google Sheets untuk Jurnal Mengajar

Ikuti langkah-langkah di bawah ini untuk menghubungkan Google Sheet Anda dengan web app Next.js secara aman.

---

## Langkah 1: Siapkan Google Sheet

1. Buka [Google Sheets](https://sheets.google.com) dan buat Spreadsheet baru (atau gunakan spreadsheet Jurnal Mengajar yang sudah Anda miliki).
2. Di baris pertama (Row 1), buat nama kolom (header) **persis** seperti di bawah ini secara berturut-turut dari kolom A sampai F:
   * **Kolom A:** `ID`
   * **Kolom B:** `Hari, tanggal`
   * **Kolom C:** `Jam ke-`
   * **Kolom D:** `Materi Pokok`
   * **Kolom E:** `Kegiatan Pembelajaran`
   * **Kolom F:** `Kehadiran`

   > [!IMPORTANT]
   > Nama kolom harus sama persis (sensitif terhadap huruf besar/kecil dan spasi) agar dapat dipetakan secara otomatis oleh skrip.

---

## Langkah 2: Memasang Google Apps Script

1. Di menu atas Google Sheet Anda, klik **Ekstensi (Extensions)** -> **Apps Script**.
2. Hapus semua kode default yang ada di dalam editor Apps Script.
3. Buka file [appscript.js](file:///home/annas/Desktop/javascript/jurnal-mengajar/appscript.js) di dalam folder project ini.
4. Copy seluruh kode dari file tersebut, lalu paste ke dalam editor Apps Script Anda.
5. Klik ikon **Simpan (Save)** (ikon disket) atau tekan `Ctrl + S` / `Cmd + S`.
6. Beri nama proyek Anda, misalnya: `Backend Jurnal Mengajar`.

---

## Langkah 3: Deploy sebagai Web App

Agar web app Next.js dapat berkomunikasi dengan sheet Anda, Apps Script harus di-deploy sebagai Web App:

1. Di bagian kanan atas editor Apps Script, klik tombol **Terapkan (Deploy)** -> **Penerapan baru (New deployment)**.
2. Klik ikon gerigi (Pilih jenis / Select type) di sebelah "Pilih jenis", lalu pilih **Aplikasi web (Web app)**.
3. Konfigurasikan pengaturan berikut:
   * **Deskripsi:** `v1` (atau bebas)
   * **Jalankan sebagai (Execute as):** **Saya (Me / email_anda@gmail.com)**
   * **Siapa yang memiliki akses (Who has access):** **Siapa saja (Anyone)**
4. Klik **Terapkan (Deploy)**.
5. Google mungkin akan meminta izin akses (**Authorize Access**). Klik "Authorize Access", pilih akun Google Anda, klik "Advanced", lalu klik **Go to Backend Jurnal Mengajar (unsafe)**, kemudian klik **Allow**.
6. Setelah berhasil, Anda akan mendapatkan **URL Aplikasi Web (Web App URL)**. Formatnya mirip seperti ini:
   `https://script.google.com/macros/s/XXXXXX-XXXXXX/exec`
7. Copy URL tersebut.

---

## Langkah 4: Konfigurasi Environment Variable (.env)

1. Buka file [.env](file:///home/annas/Desktop/javascript/jurnal-mengajar/.env) di dalam project Next.js ini.
2. Masukkan URL Web App yang sudah Anda salin tadi seperti berikut:
   ```env
   GOOGLE_SHEET_WEBAPP_URL=https://script.google.com/macros/s/XXXXXX-XXXXXX/exec
   ```
3. Simpan file `.env` tersebut.

---

## Langkah 5: Jalankan Aplikasi Next.js

1. Sebelum menjalankan, pastikan Anda berada di Node.js versi 24 dengan menjalankan perintah:
   ```bash
   nvm use 24
   ```
2. Jalankan server development:
   ```bash
   npm run dev
   ```
3. Buka browser dan akses [http://localhost:3000](http://localhost:3000). Sekarang aplikasi Jurnal Mengajar Anda siap digunakan untuk melakukan CRUD ke Google Sheet!
