# Sistem Asesmen UKK & Portofolio LSP-P1

Aplikasi asesmen sertifikasi profesi berbasis portofolio digital untuk SMK, menggunakan Express MVC, EJS, Prisma, SQLite, dan session-based RBAC.

## Menjalankan aplikasi

Prasyarat: Node.js 18 atau lebih baru dan npm.

```bash
npm install
```

Salin `.env.example` menjadi `.env`, lalu atur `DATABASE_URL`, `PORT`, dan `SESSION_SECRET`. Buat database dan akun demo:

```bash
npx prisma db push
npm run seed
npm run dev
```

Buka `http://localhost:3002`. `npm start` menjalankan server tanpa nodemon. `npx prisma studio` membuka inspeksi data lokal.

`npm run seed` mengosongkan lalu membangun ulang data demo. Jangan jalankan pada database berisi data nyata.

## Akun demo

| Peran | Username | Password |
|---|---|---|
| Admin LSP | `adminlsp` | `password123` |
| Asesor | `asesor` | `password123` |
| Asesi siswa | `asesisiswa` | `password123` |
| Asesi tambahan untuk rekap | `siswa2` | `password123` |

Password disimpan sebagai hash bcrypt. Tombol akses demo tersedia di halaman login.

## Membuat akun

Asesi siswa dapat memilih **Daftar akun asesi siswa** pada halaman login. Form meminta nama lengkap, ID/NISN, username, password (minimal 8 karakter), dan kelas/jurusan: Rekayasa Perangkat Lunak, Teknik Komputer dan Jaringan, Teknik Jaringan Akses Telekomunikasi, atau Animasi.

Admin LSP dapat membuat akun Admin LSP, Asesor, atau Asesi siswa lewat menu **Pengguna**. Field kelas dan ID/NISN hanya berlaku untuk siswa; Asesor memiliki nomor registrasi, sementara Admin tidak memiliki field kelas/ID siswa. Pilihan role Admin/Asesor tidak tersedia di registrasi publik.

## Hak akses

- **Admin LSP:** kelola skema dan unit kompetensi, plotting peserta/asesor, serta pantau rekap kelulusan.
- **Asesor:** hanya membuka sesi yang ditugaskan, memverifikasi GitHub/demo, menilai unit K/BK, menulis rekomendasi, dan mencetak berita acara.
- **Asesi siswa:** memilih skema, mengisi FR-APL 02, mengirim tautan GitHub/demo/dokumen, serta melihat dan mencetak pengumuman hasil.

Rute sensitif dilindungi middleware. Pengguna tanpa autentikasi menerima 401 pada request non-HTML; pengguna dengan role yang salah menerima 403.

## Struktur utama

- `src/controllers/lsp.controller.js`: logika workflow portal.
- `src/routes/lsp.routes.js`: pemetaan endpoint dan pembatasan role.
- `src/middlewares/auth.js`: pemeriksaan session dan RBAC.
- `prisma/schema.prisma`: pengguna, skema/unit, sesi, bukti, FR-APL 02, dan hasil unit.
- `prisma/seed.js`: akun dan data contoh.
- `views/`: dashboard role, formulir, lembar asesmen, dan berita acara cetak.

SQLite memakai `DATABASE_URL="file:./dev.db"`. Ganti `SESSION_SECRET` dengan nilai acak sebelum membuka aplikasi ke jaringan. Session store default Express cocok untuk demo/lokal; deployment produksi sebaiknya memakai session store persisten dan HTTPS.

## Pengujian

Lihat [TEST_CASES.md](TEST_CASES.md) untuk lima skenario UKK end-to-end. `npm test` menjalankan pengujian otomatis yang tersedia.