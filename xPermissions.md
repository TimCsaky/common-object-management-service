# Re-factor Permission model that supports folder hierarchy

context: proposed redesign of permissions model required to support folder hierarchy and syncing.

See code: https://github.com/TimCsaky/common-object-management-service/tree/multi-perm
## High-level design:

- permissions cascade down object path (**inherited** from 'folder' above)
- tie user permissions to S3 object **key** (eg: `/coms/cats/cat.txt` or `coms/cats/`), instead of bucketId and objectId.
  - see new `x_permissions` db table
  - derive `permissionPath` from bucket `endpoint`+`bucket`+`key` (eg `https://nrs.objectstorage.com/ehyjj/coms/cats/cat.txt`)
- for permission check, do pattern match on object or parent folders.
  - util function to sanitize path params
  - use ilike, regex, split to path parts
  - the sql select queries could benefilt from a temp hash table or derived columns
  - see comments in x_permission model.
  - replace current `hasPermission()` service function, re-use in route middleware.
- when creating object, user must have CREATE permission on any existing parent folders, or they get all 5 perms on new folders
- createObject would replace `bucketId` query param with `path` param
- `currentObject` (injected to req object) becomes `currentPath`)

## Benefits of new design

- permissions can be granted on objects in folders
- objects can exist in folders
- objects in folders can be synced
- A bucket (or subfolder) can be mounted to multiple COMS 'buckets'. All permissions are visible accross all buckets. Eg:
  - COMS `bucket A: /coms/` and COMS `bucket B: /coms/cats/`
  - BCBox user in `bucket A` can see subfolder `cats` and see that another user has permissions on that folder and contents
- permission model is simpler. Instead of doing a union of bucket permissions and object permissions, we check one db table

## Other considerations

- The API shape changes a little
  - new `path` query param
  - `:objectId` is still valid for all atomic object operations (except create and update obeject)
  - bucketId is no longer a query param (also column is removed from object table). bucketId is still used internally as a reference to the bucket configuration
- upgrade to this design does preserve existing permissions. (see sql migration file)
- BCBox would need updating:
  - gets/grants permissions using `path`
  - permissions would move to one store - permissions for each path
  - BCBox ui could implement navigating between folders
