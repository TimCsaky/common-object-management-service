const stamps = require('../stamps');
const { v4: uuidv4 } = require('uuid');

exports.up = function (knex) {
  return Promise.resolve()
    // add name column to object table
    .then(() => knex.schema.createTable('x_permission', table => {
      table.uuid('id').primary();
      table.string('permissionPath').notNullable();
      table.uuid('userId').references('userId').inTable('user').notNullable().onUpdate('CASCADE').onDelete('CASCADE');
      table.string('permCode').references('permCode').inTable('permission').notNullable().onUpdate('CASCADE').onDelete('CASCADE');
      stamps(knex, table);
    }))
    .then(() => knex.schema.raw(`CREATE TRIGGER audit_permission_trigger
    AFTER UPDATE OR DELETE ON x_permission
    FOR EACH ROW EXECUTE PROCEDURE audit.if_modified_func();`))

    // get buckets
    .then(() => knex('bucket'))
    // copy bucket perms to new permissions table
    .then((buckets) => {
      return Promise.all(buckets.map(b => {
        return knex('bucket_permission').where('bucketId', b.bucketId)
          .then((bperms) => {
            return Promise.all(bperms.map(bp => {
              return Promise.resolve(knex('x_permission').insert({
                id: uuidv4(),
                permissionPath: `${b.endpoint}/${b.bucket}/${b.key}`,
                userId: bp.userId,
                permCode: bp.permCode,
                createdBy: bp.createdBy,
                createdAt: bp.createdAt
              }));
            }));
          });
      }));
    })

    // // copy object perms to new permissions table
    .then(() => knex('bucket'))
    .then((buckets) => {
      return Promise.all(buckets.map(b => {
        return knex('object')
          .join('object_permission', 'object.id', 'object_permission.objectId')
          .where('object.bucketId', b.bucketId)
          .then((operms) => {
            return Promise.all(operms.map(op => {
              return Promise.resolve(knex('x_permission').insert({
                id: uuidv4(),
                permissionPath: b.endpoint + '/' + b.bucket + '/' + op.path,
                userId: op.userId,
                permCode: op.permCode,
                createdBy: op.createdBy,
                createdAt: op.createdAt
              }));
            }));
          });
      }));
    });
};

exports.down = function (knex) {
  return Promise.resolve()
    .then(() => knex.schema.raw('DROP TRIGGER IF EXISTS audit_permission_trigger ON x_permission'))
    .then(() => knex.schema.dropTableIfExists('x_permission'));
};
