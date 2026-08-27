const router = require('express').Router();
const ctrl = require('../controllers/settingController');

router.get('/',  ctrl.getSettings);
router.put('/',  ctrl.updateSettings);

module.exports = router;
