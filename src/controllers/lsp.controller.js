const prisma = require('../config/db');
const bcrypt = require('bcryptjs');

const roles = { admin: 'ADMIN_LSP', assessor: 'ASESOR', student: 'ASESI_SISWA' };
const studentClasses = [
  'Rekayasa Perangkat Lunak',
  'Teknik Komputer dan Jaringan',
  'Teknik Jaringan Akses Telekomunikasi',
  'Animasi'
];
const portal = (res, data) => res.render('portal', data);
const redirect = (res, path, notice) => res.redirect(`${path}?notice=${encodeURIComponent(notice)}`);

exports.loginPage = (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { title: 'Masuk | LSP-P1', error: null, notice: req.query.notice || '' });
};

exports.login = async (req, res, next) => {
  const user = await prisma.user.findUnique({ where: { username: String(req.body.username || '').trim() } });
  if (!user || !await bcrypt.compare(String(req.body.password || ''), user.password)) {
    return res.status(401).render('login', { title: 'Masuk | LSP-P1', error: 'Username atau password tidak sesuai.', notice: '' });
  }
  req.session.regenerate((error) => {
    if (error) return next(error);
    req.session.user = { id: user.id, username: user.username, nama: user.nama, role: user.role, kelas: user.kelas };
    req.session.save((saveError) => {
      if (saveError) return next(saveError);
      res.redirect('/');
    });
  });
};

exports.registerStudent = async (req, res) => {
  const nama = String(req.body.nama || '').trim();
  const username = String(req.body.username || '').trim();
  const nisn = String(req.body.nisn || '').trim();
  const kelas = String(req.body.kelas || '').trim();
  const password = String(req.body.password || '');

  if (!nama || !username || !nisn || !studentClasses.includes(kelas) || password.length < 8) {
    return res.status(400).render('login', {
      title: 'Masuk | LSP-P1', error: 'Lengkapi nama, username, NISN, kelas, dan password minimal 8 karakter.', notice: ''
    });
  }

  try {
    await prisma.user.create({ data: {
      nama, username, nisn, kelas, role: roles.student, password: await bcrypt.hash(password, 10)
    } });
    redirect(res, '/login', 'Pendaftaran siswa berhasil. Silakan masuk dengan username dan password baru.');
  } catch (error) {
    const message = error.code === 'P2002' ? 'Username atau NISN sudah digunakan.' : 'Pendaftaran gagal. Periksa data yang dimasukkan.';
    res.status(400).render('login', { title: 'Masuk | LSP-P1', error: message, notice: '' });
  }
};

exports.logout = (req, res) => req.session.destroy(() => res.redirect('/login'));

exports.dashboard = async (req, res) => {
  const user = req.session.user;
  if (user.role === roles.student) return res.redirect('/student');
  if (user.role === roles.assessor) return res.redirect('/assessment');
  const [schemes, sessions, students, assessors, totals] = await Promise.all([
    prisma.certificationScheme.findMany({ include: { _count: { select: { units: true, sessions: true } } }, orderBy: { namaSkema: 'asc' } }),
    prisma.assessmentSession.findMany({ include: { scheme: true, student: true, assessor: true }, orderBy: { tglUjian: 'desc' } }),
    prisma.user.findMany({ where: { role: roles.student }, orderBy: { nama: 'asc' } }),
    prisma.user.findMany({ where: { role: roles.assessor }, orderBy: { nama: 'asc' } }),
    prisma.assessmentSession.groupBy({ by: ['statusAsesmen'], _count: { _all: true } })
  ]);
  const countByStatus = Object.fromEntries(totals.map((row) => [row.statusAsesmen, row._count._all]));
  portal(res, { title: 'Ringkasan LSP', page: 'admin', schemes, sessions, students, assessors, countByStatus });
};

exports.schemes = async (req, res) => {
  const schemes = await prisma.certificationScheme.findMany({ include: { units: true }, orderBy: { namaSkema: 'asc' } });
  portal(res, { title: 'Skema Sertifikasi', page: 'schemes', schemes });
};

exports.users = async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: [{ role: 'asc' }, { nama: 'asc' }] });
  portal(res, { title: 'Pengguna LSP', page: 'users', users, studentClasses });
};

exports.createUser = async (req, res) => {
  const nama = String(req.body.nama || '').trim();
  const username = String(req.body.username || '').trim();
  const role = String(req.body.role || '');
  const password = String(req.body.password || '');
  const kelas = String(req.body.kelas || '').trim();
  const nisn = String(req.body.nisn || '').trim();
  const noRegAsesor = String(req.body.noRegAsesor || '').trim();

  if (!nama || !username || !Object.values(roles).includes(role) || password.length < 8) {
    return redirect(res, '/users', 'Nama, username, role, dan password minimal 8 karakter wajib diisi.');
  }
  if (role === roles.student && (!nisn || !studentClasses.includes(kelas))) {
    return redirect(res, '/users', 'Akun siswa wajib memiliki ID/NISN dan memilih kelas yang tersedia.');
  }

  try {
    await prisma.user.create({ data: {
      nama, username, role, password: await bcrypt.hash(password, 10),
      kelas: role === roles.student ? kelas : null,
      nisn: role === roles.student ? nisn : null,
      noRegAsesor: role === roles.assessor ? noRegAsesor || null : null
    } });
    redirect(res, '/users', `Akun ${nama} berhasil dibuat.`);
  } catch (error) {
    redirect(res, '/users', error.code === 'P2002' ? 'Username atau ID pengguna sudah digunakan.' : 'Akun gagal dibuat. Periksa kembali data.');
  }
};

exports.updateUser = async (req, res) => {
  const id = Number(req.params.id);
  const nama = String(req.body.nama || '').trim();
  if (!nama) return redirect(res, '/users', 'Nama pengguna wajib diisi.');

  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) return res.status(404).send('Pengguna tidak ditemukan.');

  const data = { nama };
  if (existingUser.role === roles.student) {
    const kelas = String(req.body.kelas || '').trim();
    if (kelas && !studentClasses.includes(kelas)) return redirect(res, '/users', 'Kelas siswa tidak valid.');
    data.kelas = kelas || null;
    data.nisn = String(req.body.nisn || '').trim() || null;
  }
  if (existingUser.role === roles.assessor) data.noRegAsesor = String(req.body.noRegAsesor || '').trim() || null;

  try {
    const updatedUser = await prisma.user.update({ where: { id }, data });
    if (req.session.user.id === updatedUser.id) req.session.user.nama = updatedUser.nama;
    redirect(res, '/users', `Profil ${updatedUser.nama} berhasil diperbarui.`);
  } catch (error) {
    redirect(res, '/users', error.code === 'P2002' ? 'NISN atau nomor registrasi asesor sudah digunakan.' : 'Profil pengguna gagal diperbarui.');
  }
};

function parseUnits(body) {
  const codes = Array.isArray(body.unitCode) ? body.unitCode : [body.unitCode];
  const titles = Array.isArray(body.unitTitle) ? body.unitTitle : [body.unitTitle];
  const descriptions = Array.isArray(body.unitDescription) ? body.unitDescription : [body.unitDescription];
  return codes.map((kodeUnit, index) => ({ kodeUnit: String(kodeUnit || '').trim(), judulUnit: String(titles[index] || '').trim(), deskripsi: String(descriptions[index] || '').trim() }))
    .filter((unit) => unit.kodeUnit && unit.judulUnit);
}

exports.createScheme = async (req, res) => {
  const units = parseUnits(req.body);
  if (!req.body.kodeSkema?.trim() || !req.body.namaSkema?.trim() || !req.body.jurusan?.trim() || !units.length) {
    return redirect(res, '/schemes', 'Lengkapi data skema dan minimal satu unit kompetensi.');
  }
  try {
    await prisma.certificationScheme.create({ data: {
      kodeSkema: req.body.kodeSkema.trim().toUpperCase(), namaSkema: req.body.namaSkema.trim(), jurusan: req.body.jurusan.trim(),
      units: { create: units }
    } });
    redirect(res, '/schemes', 'Skema sertifikasi berhasil dibuat.');
  } catch (error) {
    redirect(res, '/schemes', error.code === 'P2002' ? 'Kode skema atau unit sudah digunakan.' : 'Skema gagal disimpan.');
  }
};

exports.updateScheme = async (req, res) => {
  const id = Number(req.params.id);
  const units = parseUnits(req.body);
  if (!req.body.namaSkema?.trim() || !req.body.jurusan?.trim()) return redirect(res, '/schemes', 'Nama dan jurusan wajib diisi.');
  try {
    await prisma.certificationScheme.update({ where: { id }, data: { namaSkema: req.body.namaSkema.trim(), jurusan: req.body.jurusan.trim() } });
    if (units.length) {
      await prisma.$transaction([
        prisma.competencyUnit.deleteMany({ where: { schemeId: id, results: { none: {} }, selfAssessments: { none: {} } } }),
        ...units.map((unit) => prisma.competencyUnit.upsert({
          where: { schemeId_kodeUnit: { schemeId: id, kodeUnit: unit.kodeUnit } },
          create: { ...unit, schemeId: id }, update: { judulUnit: unit.judulUnit, deskripsi: unit.deskripsi }
        }))
      ]);
    }
    redirect(res, '/schemes', 'Skema dan unit berhasil diperbarui.');
  } catch (error) {
    redirect(res, '/schemes', 'Perubahan tidak dapat disimpan. Periksa kode unit dan hasil asesmen yang sudah tercatat.');
  }
};

exports.deleteScheme = async (req, res) => {
  const id = Number(req.params.id);
  const sessions = await prisma.assessmentSession.count({ where: { schemeId: id } });
  if (sessions) return redirect(res, '/schemes', 'Skema yang sudah memiliki sesi ujian tidak dapat dihapus.');
  await prisma.certificationScheme.delete({ where: { id } });
  redirect(res, '/schemes', 'Skema berhasil dihapus.');
};

exports.assignments = async (req, res) => {
  const [students, assessors, schemes, sessions] = await Promise.all([
    prisma.user.findMany({ where: { role: roles.student }, orderBy: { nama: 'asc' } }),
    prisma.user.findMany({ where: { role: roles.assessor }, orderBy: { nama: 'asc' } }),
    prisma.certificationScheme.findMany({ orderBy: { namaSkema: 'asc' } }),
    prisma.assessmentSession.findMany({ include: { student: true, assessor: true, scheme: true }, orderBy: { tglUjian: 'desc' } })
  ]);
  portal(res, { title: 'Plotting Asesor', page: 'assignments', students, assessors, schemes, sessions });
};

exports.createAssignment = async (req, res) => {
  try {
    const studentId = Number(req.body.studentId);
    const schemeId = Number(req.body.schemeId);
    const assessorId = Number(req.body.assessorId);
    const [scheme, student, assignedAssessor] = await Promise.all([
      prisma.certificationScheme.findUnique({ where: { id: schemeId }, include: { units: true } }),
      prisma.user.findFirst({ where: { id: studentId, role: roles.student } }),
      prisma.user.findFirst({ where: { id: assessorId, role: roles.assessor } })
    ]);
    if (!scheme?.units.length) return redirect(res, '/assignments', 'Skema harus memiliki unit kompetensi sebelum plotting.');
    if (!student || !assignedAssessor) return redirect(res, '/assignments', 'Pilih akun siswa dan asesor yang valid.');
    const existing = await prisma.assessmentSession.findUnique({ where: { schemeId_studentId: { schemeId, studentId } } });
    if (existing?.assessorId) return redirect(res, '/assignments', 'Sesi siswa ini sudah memiliki penugasan asesor.');
    const examDate = req.body.tglUjian ? new Date(req.body.tglUjian) : new Date();
    if (existing) {
      await prisma.$transaction([
        ...scheme.units.map((unit) => prisma.competencyResult.upsert({
          where: { sessionId_unitId: { sessionId: existing.id, unitId: unit.id } },
          create: { sessionId: existing.id, unitId: unit.id }, update: {}
        })),
        prisma.assessmentSession.update({ where: { id: existing.id }, data: { assessorId, tglUjian: examDate } })
      ]);
    } else {
      await prisma.assessmentSession.create({ data: {
        studentId, schemeId, assessorId, tglUjian: examDate,
        results: { create: scheme.units.map((unit) => ({ unitId: unit.id })) }
      } });
    }
    redirect(res, '/assignments', 'Peserta berhasil diplotkan ke asesor dan skema.');
  } catch (error) {
    redirect(res, '/assignments', error.code === 'P2002' ? 'Siswa sudah memiliki sesi pada skema tersebut.' : 'Penugasan gagal dibuat.');
  }
};

exports.student = async (req, res) => {
  const [schemes, sessions] = await Promise.all([
    prisma.certificationScheme.findMany({ include: { units: true }, orderBy: { namaSkema: 'asc' } }),
    prisma.assessmentSession.findMany({ where: { studentId: req.session.user.id }, include: {
      scheme: { include: { units: true } }, assessor: true, evidence: true, results: { include: { unit: true } }, selfAssessments: true
    }, orderBy: { tglUjian: 'desc' } })
  ]);
  portal(res, { title: 'Ruang Asesi', page: 'student', schemes, sessions });
};

exports.enroll = async (req, res) => {
  try {
    const schemeId = Number(req.body.schemeId);
    const scheme = await prisma.certificationScheme.findUnique({ where: { id: schemeId }, include: { units: true } });
    if (!scheme?.units.length) return redirect(res, '/student', 'Skema belum tersedia atau belum memiliki unit kompetensi.');
    await prisma.assessmentSession.create({ data: {
      schemeId, studentId: req.session.user.id,
      results: { create: scheme.units.map((unit) => ({ unitId: unit.id })) }
    } });
    redirect(res, '/student', 'Pendaftaran skema berhasil. Lengkapi asesmen mandiri dan bukti portofolio.');
  } catch (error) {
    redirect(res, '/student', error.code === 'P2002' ? 'Anda sudah terdaftar pada skema tersebut.' : 'Pendaftaran gagal.');
  }
};

exports.submitPortfolio = async (req, res) => {
  const sessionId = Number(req.params.id);
  const assessment = await prisma.assessmentSession.findFirst({ where: { id: sessionId, studentId: req.session.user.id }, include: { scheme: { include: { units: true } } } });
  if (!assessment) return res.status(404).send('Sesi asesmen tidak ditemukan.');
  if (['KOMPETEN', 'BELUM_KOMPETEN'].includes(assessment.statusAsesmen)) {
    return redirect(res, '/student', 'Asesmen sudah final dan tidak dapat diubah.');
  }
  const { judulKarya, linkGithub, linkDemoWeb, fileDokumenUrl, catatanAsesi } = req.body;
  if (!judulKarya?.trim() || !/^https?:\/\//i.test(linkGithub || '') || !/^https?:\/\//i.test(linkDemoWeb || '')) {
    return redirect(res, '/student', 'Judul karya dan tautan GitHub serta demo berformat URL http(s) wajib diisi.');
  }
  await prisma.$transaction(async (tx) => {
    await tx.portfolioEvidence.create({ data: { sessionId, judulKarya: judulKarya.trim(), linkGithub: linkGithub.trim(), linkDemoWeb: linkDemoWeb.trim(), fileDokumenUrl: fileDokumenUrl?.trim() || null, catatanAsesi: catatanAsesi?.trim() || null } });
    for (const unit of assessment.scheme.units) {
      const checked = req.body[`apl_${unit.id}`] === 'on';
      await tx.selfAssessment.upsert({
        where: { sessionId_unitId: { sessionId, unitId: unit.id } },
        create: { sessionId, unitId: unit.id, isCompetent: checked, catatan: req.body[`note_${unit.id}`] || null },
        update: { isCompetent: checked, catatan: req.body[`note_${unit.id}`] || null }
      });
    }
    await tx.assessmentSession.update({ where: { id: sessionId }, data: { statusAsesmen: 'PROSES_NILAI' } });
  });
  redirect(res, '/student', 'FR-APL 02 dan bukti portofolio tersimpan untuk diverifikasi asesor.');
};

exports.assessmentList = async (req, res) => {
  const sessions = await prisma.assessmentSession.findMany({
    where: req.session.user.role === roles.admin ? {} : { assessorId: req.session.user.id },
    include: { student: true, scheme: true, evidence: true, results: true }, orderBy: { tglUjian: 'desc' }
  });
  portal(res, { title: 'Lembar Asesmen', page: 'assessment', sessions });
};

exports.assessmentDetail = async (req, res) => {
  const id = Number(req.params.id);
  const where = req.session.user.role === roles.admin ? { id } : { id, assessorId: req.session.user.id };
  const assessment = await prisma.assessmentSession.findFirst({ where, include: {
    student: true, assessor: true, scheme: { include: { units: true } }, evidence: true,
    results: { include: { unit: true } }, selfAssessments: { include: { unit: true } }
  } });
  if (!assessment) return res.status(404).send('Sesi asesmen tidak ditemukan.');
  portal(res, { title: `Asesmen ${assessment.student.nama}`, page: 'assessment-detail', assessment });
};

exports.scoreAssessment = async (req, res) => {
  const id = Number(req.params.id);
  const where = req.session.user.role === roles.admin ? { id } : { id, assessorId: req.session.user.id };
  const assessment = await prisma.assessmentSession.findFirst({ where, include: { scheme: { include: { units: true } } } });
  if (!assessment) return res.status(404).send('Sesi asesmen tidak ditemukan.');
  const scores = assessment.scheme.units.map((unit) => ({ unitId: unit.id, value: req.body[`result_${unit.id}`] }));
  if (scores.some((score) => !['true', 'false'].includes(score.value)) || !req.body.rekomendasiAsesor?.trim()) {
    return redirect(res, `/assessment/${id}`, 'Nilai seluruh unit dan rekomendasi akhir wajib diisi.');
  }
  const competent = scores.every((score) => score.value === 'true');
  await prisma.$transaction([
    ...scores.map((score) => prisma.competencyResult.update({
      where: { sessionId_unitId: { sessionId: id, unitId: score.unitId } },
      data: { isCompetent: score.value === 'true', catatanObservasi: req.body[`observation_${score.unitId}`]?.trim() || null }
    })),
    prisma.assessmentSession.update({ where: { id }, data: {
      statusAsesmen: competent ? 'KOMPETEN' : 'BELUM_KOMPETEN', rekomendasiAsesor: req.body.rekomendasiAsesor.trim()
    } })
  ]);
  redirect(res, `/assessment/${id}`, 'Hasil asesmen tersimpan dan status kelulusan diperbarui.');
};

exports.report = async (req, res) => {
  const id = Number(req.params.id);
  const user = req.session.user;
  const where = user.role === roles.student ? { id, studentId: user.id } : user.role === roles.assessor ? { id, assessorId: user.id } : { id };
  const assessment = await prisma.assessmentSession.findFirst({ where, include: {
    student: true, assessor: true, scheme: { include: { units: true } }, evidence: true,
    results: { include: { unit: true } }
  } });
  if (!assessment) return res.status(404).send('Lembar verifikasi tidak ditemukan.');
  res.render('report', { title: 'Berita Acara Asesmen', assessment });
};

exports.notFound = (req, res) => portal(res.status(404), { title: 'Halaman tidak ditemukan', page: 'not-found' });