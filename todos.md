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

[ ] implement import user (or diffrent name) to import user from another center (internal center prespective)
[ ] make final decigion about will we have endpoint for each profile or shared endpoint for all profiles with custom permissions
[ ] update activity logs to cover more logs
[ ] update permissions to cover more permissions
[ ] double check permissions in all over the application (+ canActivate)
[ ] when i display tables data I should disply myself also
[ ] frontend invalidate language when profile update
[ ] activity logs on frontend
[ ] multi profile for parents
[ ] view modals in all modules
[ ] integrate twilio for some verifications
[ ] import functioanlity
[ ] builk operations
[ ] implement access all resources permission
[ ] consider using prisma instead of typeorm
[ ] check create user optionality
[ ] fix actor is required in all activity logs conside made system activities
[ ] add rate limit module

[ ] see who we handle and what is hte diffrence between logs and activity_logs and notification_logs
[ ] update notifications to cover all existing modules events
[x] (frontend) Data flow: ⚠️ Needs standardization (28 violations)
[x] notifications register user connection first when he opens (there is a problem in sending notifications because of redis not found user connection)

[x] implement DLQ for Queue
[x] clear correlationId from all events
[x] remove command related code
[x] standrize redis keys for easy mantainnce
[x] optimize notifications history meta filed it talkes tooooo much
[-] fix frontend build issue

[] (later if size is big) Bulk notification insertion - Batch insert DB writes for IN_APP channel - ⚙️ Medium–High - If DB write latency increases
