# Cleanup Plan - DDD Architecture Migration

This document outlines the cleanup tasks needed to remove old files and directories after the DDD architecture migration.

## 🗑️ Files and Directories to Remove

### Old Module Directories

These have been migrated to the new `src/modules/` structure:

- `src/access-control/` → Migrated to `src/modules/access-control/`
- `src/users/` → Migrated to `src/modules/user/`
- `src/auth/` → Migrated to `src/modules/auth/`

### Old Database Files

These have been migrated to the new infrastructure structure:

- `src/database/` → Migrated to `src/infrastructure/database/`

### Old Entity Files

These have been migrated to their respective module entities:

- `src/entities/` → Migrated to individual module entity directories

### Old Configuration Files

These have been migrated to the new infrastructure structure:

- `src/config/` → Migrated to `src/infrastructure/config/` and `src/common/validation/`

### Prisma Files

These are no longer needed after TypeORM migration:

- `src/prisma/` → Empty directory, can be removed
- `prisma/` → Prisma schema and migrations (if exists)

### Old Shared Files

These have been migrated to the new common structure:

- `src/shared/guards/` → Migrated to `src/common/guards/`
- `src/shared/interceptors/` → Migrated to `src/common/interceptors/`
- `src/shared/decorators/` → Migrated to `src/common/decorators/`
- `src/shared/utils/` → Migrated to `src/common/utils/`
- `src/shared/types/` → Migrated to `src/common/types/`

### Old Mailer Files

These have been migrated to infrastructure:

- `src/shared/mail/` → Migrated to `src/infrastructure/mailer/`

## 📋 Cleanup Checklist

### Phase 1: Verify Migration Completeness

- [ ] Confirm all files have been migrated to new structure
- [ ] Verify no critical files are missing
- [ ] Check that all imports have been updated

### Phase 2: Remove Old Directories

- [ ] Remove `src/access-control/`
- [ ] Remove `src/users/`
- [ ] Remove `src/auth/`
- [ ] Remove `src/database/`
- [ ] Remove `src/entities/`
- [ ] Remove `src/prisma/`
- [ ] Remove `src/types/` (if empty or redundant)

### Phase 3: Remove Old Configuration

- [ ] Remove old `src/config/` directory (if exists)
- [ ] Remove any remaining Prisma configuration files

### Phase 4: Clean Up Package Files

- [ ] Remove Prisma dependencies from `package.json`
- [ ] Remove any unused dependencies
- [ ] Update scripts in `package.json`

### Phase 5: Final Verification

- [ ] Verify application starts correctly
- [ ] Verify all endpoints work
- [ ] Verify database operations work
- [ ] Check for any remaining import errors

## 🚨 Safety Measures

### Before Cleanup

1. **Backup**: Ensure all changes are committed to git
2. **Verification**: Double-check that all files have been properly migrated
3. **Testing**: Run the application to ensure it works correctly

### During Cleanup

1. **Incremental**: Remove directories one by one
2. **Verification**: Test after each removal
3. **Rollback**: Keep git history for easy rollback if needed

### After Cleanup

1. **Final Test**: Comprehensive testing of all functionality
2. **Documentation**: Update any remaining documentation
3. **Deployment**: Test in staging environment

## 📊 Expected Results

After cleanup, the directory structure should be:

```
src/
├── app/
│   ├── main.ts
│   └── app.module.ts
├── modules/
│   ├── user/
│   ├── auth/
│   ├── access-control/
│   └── roles/
├── common/
│   ├── repositories/
│   ├── guards/
│   ├── decorators/
│   ├── interceptors/
│   ├── utils/
│   ├── types/
│   └── validation/
├── infrastructure/
│   ├── database/
│   ├── config/
│   └── mailer/
└── shared/
    ├── modules/
    └── services/
```

## 🔍 Verification Steps

### Application Startup

```bash
npm run start:dev
```

### Database Operations

- Test user creation
- Test authentication
- Test role assignment
- Test permission management

### API Endpoints

- Test all auth endpoints
- Test all user endpoints
- Test all access control endpoints
- Test all roles endpoints

### Import Verification

- Check for any remaining old import paths
- Verify all TypeORM entities are properly registered
- Confirm all BaseRepository implementations work

## 📝 Post-Cleanup Tasks

1. **Update Documentation**: Ensure all documentation reflects the final structure
2. **Update CI/CD**: Update any deployment scripts if needed
3. **Team Communication**: Inform team about the new structure
4. **Training**: Provide training on the new DDD patterns

## 🆘 Rollback Plan

If issues arise during cleanup:

1. **Git Rollback**:

   ```bash
   git reset --hard HEAD~1
   ```

2. **Selective Restore**:

   ```bash
   git checkout HEAD~1 -- src/old-directory/
   ```

3. **Database Rollback**:
   ```bash
   # Restore from backup if needed
   psql -h localhost -U postgres -d lms < backup.sql
   ```

This cleanup plan ensures a safe and systematic removal of old files while maintaining application functionality.
