const express = require('express');
const controller = require('../controllers/lsp.controller');
const { requireAuth, allowRoles } = require('../middlewares/auth');

const router = express.Router();
const admin = allowRoles('ADMIN_LSP');
const assessor = allowRoles('ASESOR');
const student = allowRoles('ASESI_SISWA');

router.get('/login', controller.loginPage);
router.post('/login', controller.login);
router.post('/register', controller.registerStudent);
router.post('/logout', requireAuth, controller.logout);
router.get('/', requireAuth, controller.dashboard);
router.get('/schemes', requireAuth, admin, controller.schemes);
router.get('/users', requireAuth, admin, controller.users);
router.post('/users', requireAuth, admin, controller.createUser);
router.post('/users/:id/update', requireAuth, admin, controller.updateUser);
router.post('/schemes', requireAuth, admin, controller.createScheme);
router.post('/schemes/:id/update', requireAuth, admin, controller.updateScheme);
router.post('/schemes/:id/delete', requireAuth, admin, controller.deleteScheme);
router.get('/assignments', requireAuth, admin, controller.assignments);
router.post('/assignments', requireAuth, admin, controller.createAssignment);
router.get('/student', requireAuth, student, controller.student);
router.post('/student/enroll', requireAuth, student, controller.enroll);
router.post('/student/:id/portfolio', requireAuth, student, controller.submitPortfolio);
router.get('/assessment', requireAuth, assessor, controller.assessmentList);
router.get('/assessment/:id', requireAuth, assessor, controller.assessmentDetail);
router.post('/assessment/:id/score', requireAuth, assessor, controller.scoreAssessment);
router.get('/assessment/:id/report', requireAuth, controller.report);
router.get('/results/:id/report', requireAuth, controller.report);

module.exports = router;