const models = {
  // Tables
  Bucket: require('./tables/bucket'),
  BucketPermission: require('./tables/bucketPermission'),
  IdentityProvider: require('./tables/identityProvider'),
  Metadata: require('./tables/metadata'),
  ObjectModel: require('./tables/objectModel'),
  ObjectPermission: require('./tables/objectPermission'),
  Permission: require('./tables/permission'),
  Tag: require('./tables/tag'),
  User: require('./tables/user'),
  Version: require('./tables/version'),
  VersionMetadata: require('./tables/versionMetadata'),
  VersionTag: require('./tables/versionTag'),
  XPermission: require('./tables/xpermission'),

  // Views
};

module.exports = models;
