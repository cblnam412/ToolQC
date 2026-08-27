const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/noteController');

router.post('/',           ctrl.createNote);
router.put('/:noteId',     ctrl.updateNote);
router.delete('/:noteId',  ctrl.deleteNote);

module.exports = router;
