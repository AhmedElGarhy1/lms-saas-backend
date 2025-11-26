[x] check create user
[x] add user to center (users page in center scope)
[x] cleanup centers table columns, filters, correct fileds required, create filter ect...
[x] centers manage users
[x] center access for users and admins
[x] edit modals in all modules
[x] validate before request operation create/update/delete that entity exist or not
[x] backend standard validation,exceptions, messages
[x] frontend api form handlers, sucess messages
[x] add backend integration form validation
[x] check delete, softDelete, restore
[x] simplify frontend error handling
[x] permissions restrictions and role_permissions table
[x] for forms display \* for requried fields (automatic)
[x] fix module actions incompatibility
[x] activity logs on backend
[x] export functioanlity
[x] fix login as center user
[x] continue on roles and permissions integration
[x] fix AccessDialog interface and paginations
[x] export functiaonlity support csv, xlsx, json add popup to choose
[x] fix manage roles in users and centers
[x] fix scope related conditions so it will be controled only by permission
[x] add backend loclization and integration
[x] query/parameter validation
[x] profile for user
[x] fronetnd issues (dialogs, delete)
[x] fronetnd issues (roles permissions)
[x] add transactions or unit of work
[x] think about implementing branches
[x] database indexing optimization
[x] refactor profile page
[x] fix autuntication and refresh token
[x] all dialogs close buttons and on success
[x] fix user manage access in global scope (it work only on center scope)
[x] user manage access (it should be user access, center access)
[x] multi profile continue admins
[x] multi profile user list in center issue
[x] continue testing existing functionality after migrating to userProfileId (start from checking table configs (admin|staff))
[x] implement center access activation for center users
[x] implement center access delete (delete user in center)
[x] check dialogs open/close
[x] (frontend) remove admin scope permissions from center roles page
[x] (frontend) fix role permissions bad ux in frontend and logic in edit making both for not both permissions
[x] (backend) create center with dublicated admin email doesn't throw error and doesn't store user
[x] (both) check soft delete for all modules
[x] (backend) role delete: remove users assigned to that user
[x] (both) create center with branch
[x] new: center role with admin permission throw error
[x] restrict phone number validation and fix not uniqe email when null
[x] implement sending notifications
[x] check all channels content in both languages
[x] check the overall app language and exceptions
[x] check if whatsapp and email and all channels are working or not
[x] implement import user (or diffrent name) to import user from another center (internal center prespective)
[x] update activity logs to cover more logs
[x] update permissions to cover more permissions
[x] activity logs on frontend
[x] integrate twilio for some verifications
[x] refactor logs and add only required not spam of logs
[x] (frontend) Data flow: ⚠️ Needs standardization (28 violations)
[x] notifications register user connection first when he opens (there is a problem in sending notifications because of redis not found user connection)
[x] add missing activity logs for users
[x] responsive frontend
[x] make consistant response in all endpoints
[x] arabic ltr translation animation in sidebar looks bad so check others also
[x] remove all emails for now make the primary think is phone and remove email at all not needed for now (big task)
[x] back to translations and update translations correctly and update in app notifications translations and refactor the overcomplicated reaseon, actionRequired, retible, and all htese useless files that frontend doesn't use
[x] add permission checks for userprofile module ass it have many profile type and permission (improve later)
[x] double check permissions in all over the application
[x] verify rate limit module is working
[x] remove all api reqeust transformation and middle functions that do nothing except transform request schema must be the same as reqeust payload
[x] frontend invalidate language when profile update
[x] user related functionality like 2fa, change password
[x] think about removing restrictions and permissions for diffrent profile types it's we already have restrictions you can only access users in your user_access
[x] fix local is not consistant between backend and frontend
[x] translation instead of injecting i18service everywhere we can make the internal services or utils like ControllerResponse take safe translaction key string and the service call is inside these utils

[ ] notification translations must be in one file notification.json for easy translation
[ ] view modals in all modules
[ ] builk operations
[ ] clean up notficiation service from testing (doesn't work) and from usless services and monitoring or metrics
[ ] add users endpoint for modules like activity logs search for user
[ ] user can update his center (throw settings)
[ ] activity logs and each one display his own logs only

[] (later if size is big) Bulk notification insertion - Batch insert DB writes for IN_APP channel - ⚙️ Medium–High - If DB write latency increases
[ ] update notifications to cover all existing modules events
[ ] consider using prisma instead of typeorm
[ ] implement access all resources permission
[ ] import functioanlity
[ ] multi profile for parents
[?] when i display tables data I should disply myself also
