# Translation TXT - Multi-Provider LLM Translator

Aplikasi web sederhana untuk menerjemahkan file teks (.txt) menggunakan berbagai LLM API provider. Aplikasi ini berfungsi sebagai platform universal yang memungkinkan pengguna memilih provider API dan model yang mereka inginkan.

## Struktur Project

- `index.html`: File HTML utama untuk interface aplikasi web
- `style.css`: Berisi CSS untuk styling interface pengguna
- `script.js`: Berisi logika JavaScript untuk handling file, integrasi API, proses terjemahan, dan interaksi UI
- `TODO.md`: Spesifikasi lengkap dan rencana pengembangan project

## Fitur yang Diimplementasi

### 🔌 **Multi-Provider API Support**
- **OpenRouter**: Mendukung berbagai model seperti qwen/qwen3-4b:free, meta-llama/llama-3.2-3b-instruct:free, dll
- **Cerebras**: Mendukung model seperti llama-4-scout-17b-16e-instruct, qwen-3-32b, dll
- **Google Gemini**: Mendukung model seperti gemini-2.5-flash-lite, gemini-1.5-pro, dll

### 📁 **Interface Upload File**
- Drag & drop atau pilih file `.txt`
- Preview konten file dengan informasi detail (nama, ukuran, jumlah baris)
- Mendukung berbagai format teks: .txt, .csv, .md, .json, .log, .srt, .vtt, .xml, .yaml, .yml

### 🌐 **Konfigurasi Bahasa**
- Dropdown untuk bahasa sumber dan tujuan
- Opsi deteksi otomatis bahasa sumber
- Mendukung: Indonesia, Inggris, Jepang, Spanyol

### ⚙️ **Pengaturan API Fleksibel**
- **User-defined Model Names**: Pengguna mengisi sendiri nama model sesuai provider
- **API Key Management**: Penyimpanan lokal per provider
- **Persistent Settings**: Preferensi tersimpan di localStorage

### 📝 **Instruksi Kustom**
- Opsi menggunakan instruksi standar atau kustom
- Placeholder dengan contoh instruksi yang user-friendly

### ✂️ **Konfigurasi Pemisahan File**
- **Pemisahan Otomatis**: Target ~300 baris per chunk (default)
- **Pemisahan Manual**: Konfigurasi maksimal baris per chunk dan overlap
- **Kalkulasi Real-time**: Estimasi jumlah chunk yang akan dibuat

### 🚀 **Proses Terjemahan**
- Progress bar dengan informasi real-time
- Log panel untuk monitoring proses
- Kontrol: Mulai, Jeda, Lanjut, Batalkan

### 📊 **Manajemen Hasil**
- Preview side-by-side (teks asli vs terjemahan)
- Download sebagai file .txt tunggal
- Copy ke clipboard
- (Fitur ZIP dalam pengembangan)

### 🛡️ **Error Handling yang Robust**
- Pesan error yang user-friendly
- Penanganan error API yang spesifik:
  - `PROHIBITED_CONTENT` dari Google Gemini
  - Validasi input yang komprehensif
  - Network error handling

## Setup dan Menjalankan

Untuk menjalankan project ini secara lokal, ikuti langkah-langkah berikut:

### 1. **Clone repository atau download file project**

### 2. **Buka `index.html` di browser web**

Karena ini adalah aplikasi client-side, Anda bisa langsung membuka file `index.html` di browser. Tidak diperlukan web server untuk fungsionalitas dasar.

### 3. **Konfigurasi API Key (Penting)**

Aplikasi ini mendukung berbagai provider API. Anda perlu mengisi API key sesuai provider yang dipilih:

1. **Pilih Provider**: OpenRouter, Cerebras, atau Google Gemini
2. **Masukkan Nama Model**: Sesuai dengan provider yang dipilih
3. **Masukkan API Key**: Kunci akan disimpan lokal di browser

**Contoh Konfigurasi:**
- **OpenRouter**: Model `qwen/qwen3-4b:free`, API key dari OpenRouter
- **Cerebras**: Model `llama-4-scout-17b-16e-instruct`, API key dari Cerebras
- **Google Gemini**: Model `gemini-2.5-flash-lite`, API key dari Google AI Studio

**Catatan**: Untuk keamanan, API key disimpan lokal di browser pengguna. Setup ini untuk penggunaan lokal dan demonstrasi.

## Cara Penggunaan

1. **Upload File**: Drag and drop file `.txt` ke area yang ditentukan atau klik untuk memilih
2. **Konfigurasi Provider**: Pilih provider API, masukkan nama model, dan API key
3. **Pengaturan Bahasa**: Pilih bahasa sumber dan tujuan
4. **Konfigurasi Pemisahan**: Atur opsi pemisahan file (otomatis/manual)
5. **Mulai Terjemahan**: Klik tombol "Mulai Terjemahkan"
6. **Lihat Hasil**: Setelah diterjemahkan, teks asli dan hasil terjemahan akan ditampilkan
7. **Download/Salin**: Unduh file hasil atau salin ke clipboard

## Pengaturan Default

- **Pemisahan Otomatis**: Target ~300 baris per chunk
- **Pemisahan Manual**: Default 300 baris per chunk
- **Overlap**: 0 baris (dapat diatur manual)
- **Instruksi**: Menggunakan instruksi standar (dapat dikustomisasi)

## Peningkatan Masa Depan (dari TODO.md)

- **Batch Processing**: Upload dan proses multiple file sekaligus
- **Translation History**: Riwayat terjemahan dengan localStorage
- **Quality Control**: Confidence scoring dan manual review
- **Performance Optimization**: Caching, kompresi, Web Workers
- **Download ZIP**: Implementasi lengkap download sebagai .zip
- **Pause/Resume**: Fitur jeda dan lanjut terjemahan
- **Provider Tambahan**: Dukungan untuk provider API lainnya

## Lisensi

Project ini open-source dan tersedia di bawah MIT License.