const stamps = require('../stamps');
const { NIL: SYSTEM_USER } = require('uuid');

exports.up = function (knex) {
  return Promise.resolve()

    // Base COMS tables
    .then(() => knex.schema.createTable('identity_provider', table => {
      table.string('idp', 255).primary();
      table.boolean('active').notNullable().defaultTo(true);
      stamps(knex, table);
    }))

    .then(() => knex.schema.createTable('user', table => {
      table.uuid('userId').primary();
      table.uuid('identityId').index();
      table.string('idp', 255).references('idp').inTable('identity_provider').onUpdate('CASCADE').onDelete('CASCADE');
      table.string('username', 255).notNullable().index();
      table.string('email', 255).index();
      table.string('firstName', 255);
      table.string('fullName', 255);
      table.string('lastName', 255);
      table.boolean('active').notNullable().defaultTo(true);
      stamps(knex, table);
    }))

    .then(() => knex.schema.createTable('permission', table => {
      table.string('permCode', 255).primary();
      table.boolean('active').notNullable().defaultTo(true);
      stamps(knex, table);
    }))

    .then(() => knex.schema.createTable('object', table => {
      table.uuid('id').primary();
      table.string('originalName', 255).notNullable();
      table.string('path', 1024).notNullable();
      table.string('mimeType', 255).notNullable();
      table.boolean('public').notNullable().defaultTo(false);
      table.boolean('active').notNullable().defaultTo(true);
      stamps(knex, table);
    }))

    .then(() => knex.schema.createTable('object_permission', table => {
      table.uuid('id').primary();
      table.uuid('objectId').references('id').inTable('object').notNullable().onUpdate('CASCADE').onDelete('CASCADE');
      table.uuid('userId').references('userId').inTable('user').notNullable().onUpdate('CASCADE').onDelete('CASCADE');
      table.string('permCode').references('permCode').inTable('permission').notNullable().onUpdate('CASCADE').onDelete('CASCADE');
      stamps(knex, table);
    }))

    // Audit tables for object and object_permission
    .then(() => knex.schema.createTable('audit_object', table => {
      table.specificType(
        'id',
        'integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY'
      );
      table.uuid('objectId').notNullable().index();
      table.string('dbUser', 255).notNullable();
      table.string('updatedByUsername', 255);
      table.timestamp('actionTimestamp', { useTz: true }).defaultTo(knex.fn.now());
      table.string('action', 255).notNullable();
      table.jsonb('originalData');
    }))

    .then(() => knex.schema.createTable('audit_object_permission', table => {
      table.specificType(
        'id',
        'integer GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY'
      );
      table.uuid('objectPermissionId').notNullable().index();
      table.string('dbUser', 255).notNullable();
      table.string('updatedByUsername', 255);
      table.timestamp('actionTimestamp', { useTz: true }).defaultTo(knex.fn.now());
      table.string('action', 255).notNullable();
      table.jsonb('originalData');
    }))

    .then(() => knex.schema.raw(`CREATE OR REPLACE FUNCTION public.audit_object_func() RETURNS trigger AS $body$
    DECLARE
        v_old_data json;
    BEGIN
        if (TG_OP = 'UPDATE') then
            v_old_data := row_to_json(OLD);
            insert into public.audit_object ("objectId", "dbUser", "updatedByUsername", "actionTimestamp", "action", "originalData")
            values (
            OLD.id,
            SESSION_USER,
            NEW."updatedBy",
            now(),
            'UPDATE',
            v_old_data);
            RETURN NEW;
        elsif (TG_OP = 'DELETE') then
            v_old_data := row_to_json(OLD);
            insert into public.audit_object ("objectId", "dbUser", "actionTimestamp", "action", "originalData")
            values (
            OLD.id,
            SESSION_USER,
            now(),
            'DELETE',
            v_old_data);
            RETURN NEW;
        end if;
    END;
    $body$ LANGUAGE plpgsql`))

    .then(() => knex.schema.raw(`CREATE OR REPLACE FUNCTION public.audit_object_permission_func() RETURNS trigger AS $body$
    DECLARE
        v_old_data json;
    BEGIN
        if (TG_OP = 'UPDATE') then
            v_old_data := row_to_json(OLD);
            insert into public.audit_object_permission ("objectPermissionId", "dbUser", "updatedByUsername", "actionTimestamp", "action", "originalData")
            values (
            OLD.id,
            SESSION_USER,
            NEW."updatedBy",
            now(),
            'UPDATE',
            v_old_data);
            RETURN NEW;
        elsif (TG_OP = 'DELETE') then
            v_old_data := row_to_json(OLD);
            insert into public.audit_object_permission ("objectPermissionId", "dbUser", "actionTimestamp", "action", "originalData")
            values (
            OLD.id,
            SESSION_USER,
            now(),
            'DELETE',
            v_old_data);
            RETURN NEW;
        end if;
    END;
    $body$ LANGUAGE plpgsql`))

    .then(() => knex.schema.raw(`CREATE TRIGGER audit_object_trigger
    AFTER UPDATE OR DELETE ON object
    FOR EACH ROW EXECUTE PROCEDURE public.audit_object_func();`))

    .then(() => knex.schema.raw(`CREATE TRIGGER audit_object_permission_trigger
    AFTER UPDATE OR DELETE ON object_permission
    FOR EACH ROW EXECUTE PROCEDURE public.audit_object_permission_func();`))

    // Populate Data
    .then(() => {
      const users = ['system'];
      const items = users.map((user) => ({
        userId: SYSTEM_USER,
        username: user,
        active: true,
        createdBy: SYSTEM_USER,
      }));
      return knex('user').insert(items);
    })

    .then(() => {
      const perms = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'MANAGE' ];
      const items = perms.map((perm) => ({
        permCode: perm,
        active: true,
        createdBy: SYSTEM_USER,
      }));
      return knex('permission').insert(items);
    });
};

exports.down = function (knex) {
  return Promise.resolve()
    .then(() => knex.schema.raw('DROP TRIGGER audit_object_permission_trigger ON object_permission'))
    .then(() => knex.schema.raw('DROP TRIGGER audit_object_trigger ON object'))
    .then(() => knex.schema.raw('DROP FUNCTION audit_object_permission_func()'))
    .then(() => knex.schema.raw('DROP FUNCTION audit_object_func()'))
    .then(() => knex.schema.dropTableIfExists('audit_object_permission'))
    .then(() => knex.schema.dropTableIfExists('audit_object'))
    .then(() => knex.schema.dropTableIfExists('object_permission'))
    .then(() => knex.schema.dropTableIfExists('object'))
    .then(() => knex.schema.dropTableIfExists('permission'))
    .then(() => knex.schema.dropTableIfExists('user'))
    .then(() => knex.schema.dropTableIfExists('identity_provider'));
};
