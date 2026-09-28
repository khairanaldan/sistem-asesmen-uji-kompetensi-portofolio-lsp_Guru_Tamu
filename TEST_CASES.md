# Test Cases Sistem Asesmen UKK & Portofolio LSP

## Persiapan

1. Siapkan database dengan `npx prisma db push` dan `npm run seed`.
2. Jalankan aplikasi menggunakan `npm run dev`.
3. Buka `http://localhost:3002`; akun demo dapat dipilih dari tombol akses demo pada halaman login.

## TC-01: Admin membuat skema Junior Web Developer

**Aktor:** Admin LSP (`adminlsp`)

1. Masuk sebagai Admin LSP.
2. Buka **Skema & unit**, isi kode unik (misalnya `JWD-2026`), nama `Junior Web Developer`, jurusan `Rekayasa Perangkat Lunak`.
3. Isi tiga unit kompetensi inti dengan kode, judul, dan deskripsi, lalu simpan.

**Hasil yang diharapkan:** skema tersimpan; detailnya menampilkan ketiga unit. Database menjaga keunikan kode skema dan kombinasi kode unit per skema.

## TC-02: Siswa mendaftar, mengisi FR-APL 02, dan mengirim portofolio

**Aktor:** Asesi (`asesisiswa`)

1. Keluar dari akun Admin, lalu masuk sebagai Asesi siswa.
2. Pilih skema `Junior Web Developer` dan tekan **Daftar skema**.
3. Isi asesmen mandiri untuk unit yang dikuasai.
4. Masukkan judul mini project, URL GitHub, URL demo aplikasi, dan catatan; simpan.

**Hasil yang diharapkan:** sesi asesmen dibuat satu kali per siswa dan skema; respons FR-APL 02 serta tautan bukti tercatat; status sesi menjadi `PROSES_NILAI`.

## TC-03: Asesor membuka asesmen dan memverifikasi demo

**Aktor:** Admin untuk plotting, lalu Asesor (`asesor`)

1. Masuk sebagai Admin LSP dan buka **Plotting asesmen**.
2. Tetapkan siswa `Nadia Putri Ramadhani`, skema `Junior Web Developer`, dan asesor `Budi Santoso, S.Kom.`.
3. Keluar, lalu masuk sebagai Asesor.
4. Buka sesi Nadia dan ikuti tautan GitHub serta demo pada **Bukti portofolio**.

**Hasil yang diharapkan:** sesi muncul dalam daftar asesor yang ditugaskan. Tautan bukti terbuka pada tab baru. Asesor tidak dapat membuka sesi milik asesor lain.

## TC-04: Asesor menilai unit dan memberi rekomendasi

**Aktor:** Asesor (`asesor`)

1. Pada lembar Nadia, pilih **Kompeten** untuk ketiga unit.
2. Tambahkan catatan observasi bila diperlukan.
3. Isi rekomendasi akhir, lalu simpan hasil asesmen.

**Hasil yang diharapkan:** setiap hasil unit tersimpan sebagai kompeten; sesi berubah menjadi `KOMPETEN`; rekomendasi akhir tercatat dan terlihat pada berita acara.

## TC-05: Siswa mengumumkan hasil dan mencetak verifikasi

**Aktor:** Asesi (`asesisiswa`)

1. Keluar, lalu masuk kembali sebagai Asesi siswa.
2. Buka **Ruang asesi** dan lihat hasil skema Junior Web Developer.
3. Pilih **Cetak hasil** lalu gunakan **Cetak / Simpan PDF** pada berita acara.

**Hasil yang diharapkan:** status `KOMPETEN`, rekomendasi asesor, rekap seluruh unit, identitas peserta/asesor, dan bukti portofolio tampil. Dialog cetak menghasilkan lembar verifikasi dengan tata letak print yang rapi.

## Pemeriksaan otorisasi

- Pengunjung tanpa login diarahkan ke halaman login untuk halaman HTML.
- Akses role yang salah pada endpoint terproteksi menghasilkan HTTP 403.
- Siswa hanya dapat mengakses dan mengubah sesi miliknya.
- Asesor hanya dapat melihat dan menilai sesi yang ditugaskan kepadanya.