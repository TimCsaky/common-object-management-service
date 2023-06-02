const router = require('express').Router();

// Base Responder
// router.get('/', (_req, res) => {
//   res.status(200).json({
//     endpoints: [
//       '/bucket',
//       '/object'
//     ]
//   });
// });

// /** Bucket Permission Router */
// router.use('/bucket', require('./bucketPermission'));

// /** Object Permission Router */
// router.use('/object', require('./objectPermission'));


const { Permissions } = require('../../../components/constants');
const { permissionController } = require('../../../controllers');
const { xPermissionValidator } = require('../../../validators');
const { checkAppMode, currentPath, hasPermission } = require('../../../middleware/authorization');
const { requireDb, requireSomeAuth } = require('../../../middleware/featureToggle');

router.use(checkAppMode);
router.use(requireDb);

/** Search for permissions */
router.get('/', xPermissionValidator.searchPermissions, (req, res, next) => {
  permissionController.searchPermissions(req, res, next);
});

/** Returns the object permissions */
router.get('/:objectId', xPermissionValidator.listPermissions, requireSomeAuth, currentPath, hasPermission(Permissions.MANAGE), (req, res, next) => {
  permissionController.listPermissions(req, res, next);
});

/** Grants object permissions to users */
router.put('/:objectId', xPermissionValidator.addPermissions, requireSomeAuth, currentPath, hasPermission(Permissions.MANAGE), (req, res, next) => {
  permissionController.addPermissions(req, res, next);
});

/** Deletes object permissions for a user */
router.delete('/:objectId', xPermissionValidator.removePermissions, requireSomeAuth, currentPath, hasPermission(Permissions.MANAGE), (req, res, next) => {
  permissionController.removePermissions(req, res, next);
});

/** Returns the bucket path permissions */
router.get('/:bucketId', xPermissionValidator.listPermissions, requireSomeAuth, currentPath, hasPermission(Permissions.MANAGE), (req, res, next) => {
  permissionController.listPermissions(req, res, next);
});

/** Grants bucket path ermissions to users */
router.put('/:bucketId', xPermissionValidator.addPermissions, requireSomeAuth, currentPath, hasPermission(Permissions.MANAGE), (req, res, next) => {
  permissionController.addPermissions(req, res, next);
});

/** Deletes bucket path permissions for a user */
router.delete('/:bucketId', xPermissionValidator.removePermissions, requireSomeAuth, currentPath, hasPermission(Permissions.MANAGE), (req, res, next) => {
  permissionController.removePermissions(req, res, next);
});


module.exports = router;
