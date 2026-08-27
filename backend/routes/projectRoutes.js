const router = require('express').Router();
const ctrl = require('../controllers/projectController');

router.get('/',        ctrl.getProjects);
router.get('/:id',     ctrl.getProjectById);
router.post('/',       ctrl.createProject);
router.put('/:id',     ctrl.updateProject);
router.delete('/:id',  ctrl.deleteProject);

module.exports = router;
