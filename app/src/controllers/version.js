const errorToProblem = require('../components/errorToProblem');
const { addDashesToUuid, getMetadata, mixedQueryToArray } = require('../components/utils');
const { metadataService } = require('../services');

const SERVICE = 'UserService';

/**
 * The Version Controller
 */
const controller = {
  /**
   * @function fetchMetadata
   * Lists metadata for an array of versions
   * @param {object} req Express request object
   * @param {object} res Express response object
   * @param {function} next The next callback function
   * @returns {function} Express middleware function
   */
  async fetchMetadata(req, res, next) {
    try {
      const versionIds = mixedQueryToArray(req.query.versionId);
      const metadata = getMetadata(req.headers);

      const params = {
        versionIds: versionIds ? versionIds.map(id => addDashesToUuid(id)) : versionIds,
        metadata: metadata && Object.keys(metadata).length ? metadata : undefined,
      };

      const response = await metadataService.fetchMetadataForVersion(params);
      res.status(200).json(response);
    } catch (e) {
      next(errorToProblem(SERVICE, e));
    }
  },

};

module.exports = controller;
