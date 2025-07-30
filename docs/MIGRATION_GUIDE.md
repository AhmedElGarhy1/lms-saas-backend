# Migration Guide: Prisma to TypeORM with DDD Architecture

This guide provides step-by-step instructions for migrating from the old Prisma-based architecture to the new TypeORM-based Domain-Driven Design (DDD) architecture.

---

## 🎯 Migration Overview

### What Changed

- **ORM**: Prisma → TypeORM
- **Architecture**: Monolithic → Domain-Driven Design (DDD)
- **Validation**: class-validator → Zod
- **Repository Pattern**: Custom → BaseRepository with comprehensive features
- **Module Structure**: Feature-based → Domain-based

### Benefits

- **Better Separation of Concerns**: Clear domain boundaries
- **Improved Maintainability**: Modular architecture
- **Enhanced Type Safety**: TypeORM with decorators
- **Comprehensive Data Access**: BaseRepository with advanced features
- **Scalable Architecture**: Easy to add new domains

---

## 📋 Pre-Migration Checklist

### Environment Setup

- [ ] Node.js 18+ installed
- [ ] PostgreSQL database running
- [ ] Environment variables configured
- [ ] Backup of current database

### Dependencies

- [ ] Install TypeORM: `npm install @nestjs/typeorm typeorm pg`
- [ ] Install Zod: `npm install zod`
- [ ] Remove Prisma: `npm uninstall @prisma/client prisma`

---

## 🚀 Step-by-Step Migration

### Step 1: Database Migration

#### 1.1 Export Current Data

```bash
# Export current data (if needed)
pg_dump -h localhost -U postgres -d lms > backup.sql
```

#### 1.2 Update Database Configuration

```typescript
// src/infrastructure/database/typeorm.config.ts
export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get('DB_PORT', 5432),
  username: configService.get('DB_USERNAME', 'postgres'),
  password: configService.get('DB_PASSWORD', ''),
  database: configService.get('DB_NAME', 'lms'),
  entities: [
    // All your entities here
  ],
  synchronize: configService.get('NODE_ENV') === 'development',
  logging: configService.get('NODE_ENV') === 'development',
});
```

#### 1.3 Generate TypeORM Migrations

```bash
# Generate initial migration
npm run typeorm migration:generate -- -n InitialMigration

# Run migrations
npm run typeorm migration:run
```

### Step 2: Entity Migration

#### 2.1 Convert Prisma Schema to TypeORM Entities

**Before (Prisma)**:

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**After (TypeORM)**:

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### 2.2 Key Entity Conversion Patterns

**Primary Keys**:

```typescript
// Prisma
id String @id @default(cuid())

// TypeORM
@PrimaryGeneratedColumn('uuid')
id: string;
```

**Relationships**:

```typescript
// Prisma
user User @relation(fields: [userId], references: [id])

// TypeORM
@ManyToOne(() => User, user => user.roles)
@JoinColumn({ name: 'userId' })
user: User;
```

**Indexes**:

```typescript
// Prisma
@@index([email])

// TypeORM
@Index(['email'])
@Column()
email: string;
```

### Step 3: Repository Migration

#### 3.1 Replace PrismaService with BaseRepository

**Before**:

```typescript
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findUser(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { roles: true },
    });
  }
}
```

**After**:

```typescript
@Injectable()
export class UserService {
  constructor(private userRepository: UserRepository) {}

  async findUser(id: string) {
    return this.userRepository.findOne(id);
  }

  async findUserWithRelations(id: string) {
    return this.userRepository.findOneWithRelations(id, ['roles']);
  }
}
```

#### 3.2 Create Repository Classes

```typescript
@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(
    @InjectRepository(User)
    repository: Repository<User>,
    dataSource: DataSource,
    logger: Logger,
  ) {
    super(repository, dataSource, logger);
  }

  // Custom methods specific to User domain
  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }
}
```

### Step 4: Validation Migration

#### 4.1 Convert class-validator to Zod

**Before**:

```typescript
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}
```

**After**:

```typescript
export const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
```

#### 4.2 Update Controllers

```typescript
@Post()
@UsePipes(new ZodValidationPipe(CreateUserSchema))
async createUser(@Body() createUserDto: CreateUserDto) {
  return this.userService.create(createUserDto);
}
```

### Step 5: Module Structure Migration

#### 5.1 Create New Module Structure

```bash
src/modules/user/
├── controllers/
│   └── user.controller.ts
├── services/
│   └── user.service.ts
├── repositories/
│   └── user.repository.ts
├── entities/
│   └── user.entity.ts
├── dto/
│   └── create-user.dto.ts
└── user.module.ts
```

#### 5.2 Update Module Files

**Module Definition**:

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User]), SharedModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository],
})
export class UserModule {}
```

### Step 6: Update Imports and Dependencies

#### 6.1 Update Import Paths

Search and replace old import paths:

```bash
# Find all files with old imports
find src -name "*.ts" -exec grep -l "from.*prisma" {} \;

# Update imports systematically
# Old: import { PrismaService } from '../shared/prisma.service'
# New: import { BaseRepository } from '../../../common/repositories/base.repository'
```

#### 6.2 Update Service Dependencies

```typescript
// Before
constructor(private prisma: PrismaService) {}

// After
constructor(private userRepository: UserRepository) {}
```

---

## 🔧 Advanced Migration Patterns

### Complex Queries

**Before (Prisma)**:

```typescript
const users = await this.prisma.user.findMany({
  where: {
    OR: [{ email: { contains: search } }, { name: { contains: search } }],
    roles: {
      some: {
        role: { name: 'ADMIN' },
      },
    },
  },
  include: {
    roles: {
      include: {
        role: true,
      },
    },
  },
  skip: (page - 1) * limit,
  take: limit,
});
```

**After (TypeORM)**:

```typescript
const users = await this.userRepository.paginate({
  page,
  limit,
  where: [{ email: Like(`%${search}%`) }, { name: Like(`%${search}%`) }],
  relations: ['roles', 'roles.role'],
  order: { createdAt: 'DESC' },
});
```

### Transactions

**Before (Prisma)**:

```typescript
await this.prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  await tx.userRole.create({ data: roleData });
  return user;
});
```

**After (TypeORM)**:

```typescript
await this.userRepository.transaction(async (manager) => {
  const user = await manager.save(User, userData);
  await manager.save(UserRole, roleData);
  return user;
});
```

---

## 🧪 Testing Migration

### 1. Unit Tests

Update test files to use new architecture:

```typescript
// Before
describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UserService, PrismaService],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });
});

// After
describe('UserService', () => {
  let service: UserService;
  let repository: UserRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get<UserRepository>(UserRepository);
  });
});
```

### 2. Integration Tests

Update integration tests to use new database setup:

```typescript
// Before
beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// After
beforeAll(async () => {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'test',
    password: 'test',
    database: 'lms_test',
    entities: [User, Role, Permission],
    synchronize: true,
  });
  await dataSource.initialize();
});
```

---

## 🚨 Common Issues and Solutions

### Issue 1: TypeORM Entity Registration

**Problem**: Entities not found by TypeORM
**Solution**: Ensure all entities are registered in the TypeORM configuration:

```typescript
// src/infrastructure/database/typeorm.config.ts
entities: [
  User,
  Role,
  Permission,
  UserRole,
  UserPermission,
  // ... all other entities
],
```

### Issue 2: Circular Dependencies

**Problem**: Circular import errors between modules
**Solution**: Use forwardRef() or restructure imports:

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User]), forwardRef(() => AuthModule)],
})
export class UserModule {}
```

### Issue 3: Migration Conflicts

**Problem**: Database schema conflicts during migration
**Solution**:

1. Backup current data
2. Drop and recreate database
3. Run migrations from scratch
4. Restore data if needed

### Issue 4: Validation Errors

**Problem**: Zod validation not working
**Solution**: Ensure ZodValidationPipe is properly configured:

```typescript
// main.ts
app.useGlobalPipes(new ZodValidationPipe());
```

---

## 📊 Migration Validation Checklist

### Database Layer

- [ ] All entities properly converted
- [ ] Relationships correctly defined
- [ ] Migrations run successfully
- [ ] Data integrity maintained
- [ ] Indexes and constraints preserved

### Application Layer

- [ ] All repositories extend BaseRepository
- [ ] Services use new repository pattern
- [ ] Controllers use Zod validation
- [ ] Module structure follows DDD
- [ ] Import paths updated

### Testing

- [ ] Unit tests updated and passing
- [ ] Integration tests updated and passing
- [ ] E2E tests updated and passing
- [ ] Test database configuration updated

### Performance

- [ ] Query performance maintained or improved
- [ ] Connection pooling configured
- [ ] Caching strategy implemented (if needed)
- [ ] Database indexes optimized

---

## 🔄 Rollback Plan

If issues arise during migration:

1. **Database Rollback**:

   ```bash
   # Restore from backup
   psql -h localhost -U postgres -d lms < backup.sql
   ```

2. **Code Rollback**:

   ```bash
   # Revert to previous commit
   git reset --hard HEAD~1
   ```

3. **Dependency Rollback**:
   ```bash
   # Reinstall Prisma
   npm install @prisma/client prisma
   npm uninstall @nestjs/typeorm typeorm
   ```

---

## 📚 Additional Resources

- [TypeORM Documentation](https://typeorm.io/)
- [NestJS Documentation](https://docs.nestjs.com/)
- [Zod Documentation](https://zod.dev/)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)

---

## 🆘 Getting Help

If you encounter issues during migration:

1. Check the troubleshooting section above
2. Review the error logs carefully
3. Verify all import paths are correct
4. Ensure all dependencies are properly installed
5. Test with a fresh database if needed

The migration process is designed to be incremental, so you can migrate module by module and test each step thoroughly.
