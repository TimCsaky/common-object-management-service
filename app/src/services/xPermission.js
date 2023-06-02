const { v4: uuidv4, NIL: SYSTEM_USER } = require('uuid');
const utils = require('../components/utils');

const { Permissions } = require('../components/constants');
const { XPermission } = require('../db/models');

/**
 * The Permission DB Service
 */
const service = {
  /**
   * @function addPermissions
   * Grants permissions to users
   * @param {string} path The path string
   * @param {object[]} data Incoming array of `userId` and `permCode` tuples to add for this `path`
   * @param {string} [currentUserId=SYSTEM_USER] The optional userId uuid actor; defaults to system user if unspecified
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the insert operation
   * @throws The error encountered upon db transaction failure
   */
  addPermissions: async (path, data, currentUserId = SYSTEM_USER, etrx = undefined) => {
    if (!path) {
      throw new Error('Invalid path supplied');
    }
    if (!data || !Array.isArray(data) || !data.length) {
      throw new Error('Invalid data supplied');
    }

    let trx;
    try {
      trx = etrx ? etrx : await XPermission.startTransaction();

      // Get existing permissions for the current object
      const currentPerms = await service.searchPermissions({ path });
      const obj = data
        // Ensure all codes are upper cased
        .map(p => ({ ...p, code: p.permCode.toUpperCase().trim() }))
        // Filter out any invalid code values
        .filter(p => Object.values(Permissions).some(perm => perm === p.permCode))
        // Filter entry tuples that already exist
        .filter(p => !currentPerms.some(cp => cp.userId === p.userId && cp.permCode === p.permCode))
        // Create DB objects to insert
        .map(p => ({
          id: uuidv4(),
          userId: p.userId,
          permissionPath: path,
          permCode: p.permCode,
          createdBy: currentUserId,
        }));

      // Insert missing entries
      let response = [];
      if (obj.length) {
        response = await XPermission.query(trx).insertAndFetch(obj);
      }

      if (!etrx) await trx.commit();
      return Promise.resolve(response);
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function removePermissions
   * Deletes object permissions for a user
   * @param {string} path The objectId uuid
   * @param {string[]} [userIds=undefined] Optional incoming array of user userId uuids to change
   * @param {string[]} [permissions=undefined] An optional array of permission codes to remove; defaults to undefined
   * @param {object} [etrx=undefined] An optional Objection Transaction object
   * @returns {Promise<object>} The result of running the delete operation
   * @throws The error encountered upon db transaction failure
   */
  removePermissions: async (path, userIds = undefined, permissions = undefined, etrx = undefined) => {
    if (!path) {
      throw new Error('Invalid path supplied');
    }

    let trx;
    try {
      trx = etrx ? etrx : await XPermission.startTransaction();

      let perms = undefined;
      if (permissions && Array.isArray(permissions) && permissions.length) {
        const cleanPerms = permissions
          // Ensure all codes are upper cased
          .map(p => p.toUpperCase().trim())
          // Filter out any invalid code values
          .filter(p => Object.values(Permissions).some(perm => perm === p));
        // Set as undefined if empty array
        perms = (cleanPerms.length) ? cleanPerms : undefined;
      }

      const response = await XPermission.query(trx)
        .delete()
        .modify('filterUserId', userIds)
        .modify('permissionPath', path)
        .modify('filterPermissionCode', perms)
        // Returns array of deleted rows instead of count
        // https://vincit.github.io/objection.js/recipes/returning-tricks.html
        .returning('*');

      if (!etrx) await trx.commit();
      return response;
    } catch (err) {
      if (!etrx && trx) await trx.rollback();
      throw err;
    }
  },

  /**
   * @function searchPermissions
   * Search and filter for specific object permissions
   * @param {string|string[]} [params.bucketId] Optional string or array of uuids representing the bucket
   * @param {string|string[]} [params.userId] Optional string or array of uuids representing the user
   * @param {string|string[]} [params.path] Optional string or array of uuids representing the object
   * @param {string|string[]} [params.permCode] Optional string or array of permission codes
   * @returns {Promise<object>} The result of running the find operation
   */
  searchPermissions: async (params) => {

    // join params.path to bucket endpoint, bucket and key
    const data = await utils.getBucket(params.bucketId);
    const filename = params.name ? `${params.name}` : '';
    const permissionPath = `${data.endpoint}/${data.bucket}/${data.key}/${params.path}/${filename}`; // eg: http://localhost:9000/versioned/coms/dev/cats/

    // permissions are inherited.
    // when checking for any perm (except CREATE), you can have that perm for the full path, with filename

    // when you create a file in a subfolder, if that subfolder exists, you must have CREATE permission for the subfolder or any parent folders
    // it must be an exact match (not ilike) on permissionPath
    // eg: http://localhost:9000/versioned/coms/dev/cats/
    // or: http://localhost:9000/versioned/coms/dev/
    // or: http://localhost:9000/versioned/coms/
    // or: http://localhost:9000/versioned/

    // when you create a file in a subfolder,
    // for each sub-path (examples above), starting from root (eg: http://localhost:9000/versioned/)
    // if no matching permissionPath, create a permission record for current user with that sub-path.

    return XPermission.query()
      .modify('filterUserId', params.userId)
      .modify('filterPermissionPath', permissionPath )
      .modify('filterPermissionCode', params.permCode);
  }
};

module.exports = service;
