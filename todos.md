# LMS Backend TODOs

## Groups Module Implementation

- [ ] Update Prisma schema to complete Group model with proper fields and relationships
- [ ] Run Prisma migration for Group model updates
- [ ] Scaffold NestJS groups module, service, and controller files
- [ ] Implement DTOs for create, update, assign student/teacher actions in groups module
- [ ] Implement service logic for creating, updating, deleting, and fetching groups, and for managing assignments
- [ ] Implement guards for group management access control, using RBAC decorators and context-aware logic
- [ ] Implement all group and assignment management endpoints in the controller
- [ ] Add Winston logging to all create/update/delete/assignment actions in the groups module
- [ ] Ensure all groups endpoints and DTOs have rich Swagger documentation with examples and field descriptions

## Subjects Module Implementation

- [ ] Update Prisma schema to complete Subject model with proper fields and relationships
- [ ] Run Prisma migration for Subject model updates
- [ ] Scaffold NestJS subjects module, service, and controller files
- [ ] Implement DTOs for create, update, assign teacher actions in subjects module
- [ ] Implement service logic for creating, updating, deleting, and fetching subjects, and for managing assignments
- [ ] Implement guards for subject management access control, using RBAC decorators and context-aware logic
- [ ] Implement all subject and assignment management endpoints in the controller
- [ ] Add Winston logging to all create/update/delete/assignment actions in the subjects module
- [ ] Ensure all subjects endpoints and DTOs have rich Swagger documentation with examples and field descriptions

## Academic Grades Module (Completed ✅)

- [x] Update Prisma schema to add GradeLevel model with fields and relationships
- [x] Run Prisma migration to apply the new GradeLevel model and relationships
- [x] Scaffold NestJS academic-grades module, service, and controller files
- [x] Implement DTOs for create, update, assign student/group/subject actions
- [x] Implement service logic for creating, updating, deleting, and fetching grade levels, and for managing assignments
- [x] Implement guards for grade level management access control, using RBAC decorators and context-aware logic
- [x] Implement all grade level and assignment management endpoints in the controller
- [x] Add Winston logging to all create/update/delete/assignment actions in the academic-grades module
- [x] Ensure all academic-grades endpoints and DTOs have rich Swagger documentation with examples and field descriptions
