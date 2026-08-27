const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/apiController');

router.post('/',          ctrl.createApi);
router.put('/:apiId',     ctrl.updateApi);
router.delete('/:apiId',  ctrl.deleteApi);

module.exports = router;
