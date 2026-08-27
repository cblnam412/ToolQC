const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/graphController');

router.post('/',            ctrl.createGraph);
router.put('/:graphId',     ctrl.updateGraph);
router.delete('/:graphId',  ctrl.deleteGraph);

module.exports = router;
