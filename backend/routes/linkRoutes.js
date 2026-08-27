const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/linkController');

router.post('/',           ctrl.createLink);
router.delete('/:linkId',  ctrl.deleteLink);

module.exports = router;
