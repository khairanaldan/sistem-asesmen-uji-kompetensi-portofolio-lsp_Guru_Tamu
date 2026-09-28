const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  await prisma.competencyResult.deleteMany();
  await prisma.selfAssessment.deleteMany();
  await prisma.portfolioEvidence.deleteMany();
  await prisma.assessmentSession.deleteMany();
  await prisma.competencyUnit.deleteMany();
  await prisma.certificationScheme.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash('password123', 10);
  const [admin, assessor, student, secondStudent] = await Promise.all([
    prisma.user.create({ data: { username: 'adminlsp', password, nama: 'Admin LSP', role: 'ADMIN_LSP' } }),
    prisma.user.create({ data: { username: 'asesor', password, nama: 'Asesor', role: 'ASESOR', noRegAsesor: 'MET.000.004812.2024' } }),
    prisma.user.create({ data: { username: 'asesisiswa', password, nama: 'Asesi Siswa', role: 'ASESI_SISWA', kelas: 'Rekayasa Perangkat Lunak', nisn: '0075821941' } }),
    prisma.user.create({ data: { username: 'siswa2', password, nama: 'Asesi Siswa 2', role: 'ASESI_SISWA', kelas: 'Teknik Komputer dan Jaringan', nisn: '0075821952' } })
  ]);

  const rpl = await prisma.certificationScheme.create({ data: {
    kodeSkema: 'RPL-WEB-01', namaSkema: 'Pengembang Aplikasi Web', jurusan: 'Rekayasa Perangkat Lunak',
    units: { create: [
      { kodeUnit: 'J.620100.004.01', judulUnit: 'Menggunakan Struktur Data', deskripsi: 'Menerapkan struktur data yang sesuai dengan kebutuhan aplikasi.' },
      { kodeUnit: 'J.620100.009.01', judulUnit: 'Menggunakan Spesifikasi Program', deskripsi: 'Menerjemahkan spesifikasi menjadi rancangan program.' },
      { kodeUnit: 'J.620100.025.02', judulUnit: 'Melakukan Debugging Program', deskripsi: 'Menemukan dan memperbaiki kesalahan program.' }
    ] }
  }, include: { units: true } });

  const tkj = await prisma.certificationScheme.create({ data: {
    kodeSkema: 'TKJ-NET-01', namaSkema: 'Teknisi Jaringan Komputer', jurusan: 'Teknik Komputer dan Jaringan',
    units: { create: [
      { kodeUnit: 'J.611000.001.01', judulUnit: 'Merancang Pengalamatan Jaringan', deskripsi: 'Menyusun skema alamat dan subnet jaringan.' },
      { kodeUnit: 'J.611000.010.02', judulUnit: 'Memasang Jaringan Nirkabel', deskripsi: 'Mengonfigurasi perangkat akses jaringan nirkabel.' },
      { kodeUnit: 'J.611000.012.02', judulUnit: 'Mengonfigurasi Switch', deskripsi: 'Mengonfigurasi switch sesuai kebutuhan topologi.' }
    ] }
  }, include: { units: true } });

  const tjat = await prisma.certificationScheme.create({ data: {
    kodeSkema: 'TJAT-FTTH-01', namaSkema: 'Teknisi Instalasi Fiber Optik', jurusan: 'Teknik Jaringan Akses Telekomunikasi',
    units: { create: [
      { kodeUnit: 'J.611000.020.01', judulUnit: 'Menyiapkan Material dan Perangkat Fiber Optik', deskripsi: 'Mengidentifikasi material, perangkat, dan alat kerja instalasi.' },
      { kodeUnit: 'J.611000.021.01', judulUnit: 'Melaksanakan Instalasi Kabel Fiber Optik', deskripsi: 'Melakukan penarikan dan pemasangan kabel sesuai prosedur.' },
      { kodeUnit: 'J.611000.022.01', judulUnit: 'Melakukan Pengukuran Jaringan Fiber Optik', deskripsi: 'Mengukur dan menguji kualitas link fiber optik.' }
    ] }
  }, include: { units: true } });

  const animasi = await prisma.certificationScheme.create({ data: {
    kodeSkema: 'ANIM-2D-01', namaSkema: 'Pembuatan Animasi 2D', jurusan: 'Animasi',
    units: { create: [
      { kodeUnit: 'ANIM.001.01', judulUnit: 'Membuat Desain Karakter', deskripsi: 'Mengembangkan desain karakter berdasarkan brief dan lembar model.' },
      { kodeUnit: 'ANIM.002.01', judulUnit: 'Membuat Storyboard', deskripsi: 'Menyusun storyboard dengan alur visual dan komposisi adegan.' },
      { kodeUnit: 'ANIM.003.01', judulUnit: 'Membuat Animasi 2D', deskripsi: 'Menganimasikan adegan 2D sesuai prinsip gerak dan timing.' }
    ] }
  }, include: { units: true } });

  const today = new Date();
  const activeSession = await prisma.assessmentSession.create({ data: {
    schemeId: rpl.id, studentId: student.id, assessorId: assessor.id,
    tglUjian: today, statusAsesmen: 'PROSES_NILAI',
    results: { create: rpl.units.map((unit) => ({ unitId: unit.id })) },
    selfAssessments: { create: rpl.units.map((unit, index) => ({ unitId: unit.id, isCompetent: index < 2, catatan: index < 2 ? 'Pernah menerapkan pada proyek pembelajaran.' : 'Perlu pendalaman debugging.' })) },
    evidence: { create: {
      judulKarya: 'Mini Project - Inventaris Laboratorium',
      linkGithub: 'https://github.com/', linkDemoWeb: 'https://example.com/',
      catatanAsesi: 'Aplikasi pencatatan inventaris dengan autentikasi dan laporan.'
    } }
  } });

  const completedSession = await prisma.assessmentSession.create({ data: {
    schemeId: tkj.id, studentId: secondStudent.id, assessorId: assessor.id,
    tglUjian: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), statusAsesmen: 'KOMPETEN',
    rekomendasiAsesor: 'Seluruh unit kompetensi terpenuhi. Asesi direkomendasikan kompeten.',
    results: { create: tkj.units.map((unit) => ({ unitId: unit.id, isCompetent: true, catatanObservasi: 'Konfigurasi dan pengujian dilakukan sesuai prosedur.' })) },
    selfAssessments: { create: tkj.units.map((unit) => ({ unitId: unit.id, isCompetent: true, catatan: 'Mampu melakukan pekerjaan secara mandiri.' })) },
    evidence: { create: {
      judulKarya: 'Dokumentasi Topologi Jaringan Sekolah',
      linkGithub: 'https://github.com/', linkDemoWeb: 'https://example.com/', catatanAsesi: 'Dokumentasi konfigurasi jaringan dan hasil pengujian.'
    } }
  } });

  console.log(`Seed selesai: ${admin.username}, ${assessor.username}, ${student.username}; ${rpl.namaSkema}, ${tkj.namaSkema}, ${tjat.namaSkema}, ${animasi.namaSkema}; ${activeSession.id} sesi aktif dan ${completedSession.id} sesi kompeten.`);
}

main()
  .catch((error) => {
    console.error('Seed database gagal:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());