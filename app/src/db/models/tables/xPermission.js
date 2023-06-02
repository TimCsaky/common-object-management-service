const { Model } = require('objection');

const { stamps } = require('../jsonSchema');
const { Timestamps } = require('../mixins');
const { filterOneOrMany } = require('../utils');

class XPermission extends Timestamps(Model) {
  static get tableName() {
    return 'x_permission';
  }

  static get relationMappings() {
    const Permission = require('./permission');
    const User = require('./user');

    return {
      permission: {
        relation: Model.HasOneRelation,
        modelClass: Permission,
        join: {
          from: 'x_permission.permCode',
          to: 'permission.permCode'
        }
      },
      user: {
        relation: Model.HasOneRelation,
        modelClass: User,
        join: {
          from: 'x_permission.userId',
          to: 'user.userId'
        }
      }
    };
  }

  static get modifiers() {
    return {
      // filterBucketId(query, value) {
      //   filterOneOrMany(query, value, 'bucketId');
      // },
      filterUserId(query, value) {
        filterOneOrMany(query, value, 'userId');
      },
      filterPermissionPath(query, value) {
        // pattern match on start of db value
        //const currentDirAndAbove = value;
        if (value) {

          // break path into folders

          var reg = /.+?:\/\/.+?(\/.+?)(?:#|\?|$)/;
          var pathname = reg.exec(value)[0];
          console.log(pathname);

          query
            .where('permissionPath', 'ilike', `${value}%`);
        }

        // has exact match
        //filterOneOrMany(query, value, 'permissionPath');
      },
      filterPermissionCode(query, value) {
        filterOneOrMany(query, value, 'permCode');
      }
    };
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['id', 'userId', 'permissionPath', 'permCode'],
      properties: {
        id: { type: 'string', maxLength: 255 },
        userId: { type: 'string', maxLength: 255 },
        permissionPath: { type: 'string', maxLength: 255 },
        permCode: { type: 'string', maxLength: 255 }, // TODO: update to S3 allowed length
        ...stamps
      },
      additionalProperties: false
    };
  }
}

module.exports = XPermission;
