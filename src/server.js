const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();
process.env.DATABASE_URL ||= 'file:./dev.db';

const prisma = require('./config/db');
const lspRoutes = require('./routes/lsp.routes');

const app = express();
const initialPort = Number(process.env.PORT) || 3002;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'ukk-lsp-development-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000 }
}));
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.notice = req.query.notice || '';
  res.locals.formatDate = (date) => date ? new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
  next();
});
app.use('/', lspRoutes);
app.use((req, res) => res.status(404).render('portal', { title: 'Halaman tidak ditemukan', page: 'not-found' }));
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).send('Terjadi kesalahan pada aplikasi. Periksa log server.');
});

let server;
function startServer(port) {
  server = app.listen(port, () => console.log(`Sistem Asesmen LSP tersedia di http://localhost:${port}`));
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`Port ${port} sedang digunakan, mencoba ${port + 1}.`);
      startServer(port + 1);
    } else {
      console.error('Server gagal dimulai:', error);
      process.exitCode = 1;
    }
  });
}
startServer(initialPort);
async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = app;