const { Client } = require('pg');

async function testDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'root',
    database: 'lms',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Test basic query
    const result = await client.query('SELECT COUNT(*) FROM users');
    console.log('Users count:', result.rows[0].count);

    // Test UserCenter table
    const userCentersResult = await client.query(
      'SELECT COUNT(*) FROM user_on_centers',
    );
    console.log('UserCenter count:', userCentersResult.rows[0].count);

    // Test AdminCenterAccess table
    const adminAccessResult = await client.query(
      'SELECT COUNT(*) FROM admin_center_access',
    );
    console.log('AdminCenterAccess count:', adminAccessResult.rows[0].count);

    // Test a specific user
    const userResult = await client.query(
      'SELECT id, name, email FROM users WHERE email = $1',
      ['regular@lms.com'],
    );
    console.log('Regular user:', userResult.rows[0]);

    // Check regular user's center access
    const regularUserId = userResult.rows[0].id;

    // Check UserCenter for regular user
    const regularUserCenters = await client.query(
      'SELECT * FROM user_on_centers WHERE "userId" = $1',
      [regularUserId],
    );
    console.log('Regular UserCenter records:', regularUserCenters.rows);

    // Test the getUserRolesForScope query (ADMIN scope) - this is the problematic query
    console.log('\n--- Testing getUserRolesForScope Query ---');
    try {
      const adminScopeRoles = await client.query(
        `
        SELECT ur.*, r.* 
        FROM user_roles ur
        LEFT JOIN roles r ON ur."roleId" = r.id
        WHERE ur."userId" = $1 
        AND (ur."centerId" IS NULL OR ur."centerId" = '')
        AND r.type IN ('SUPER_ADMIN', 'ADMIN', 'USER')
      `,
        [regularUserId],
      );
      console.log('Admin scope roles query result:', adminScopeRoles.rows);
    } catch (error) {
      console.error('Error in getUserRolesForScope query:', error.message);
    }

    // Test the getUserRolesForScope query (CENTER scope)
    console.log('\n--- Testing getUserRolesForScope CENTER Query ---');
    try {
      const centerScopeRoles = await client.query(
        `
        SELECT ur.*, r.* 
        FROM user_roles ur
        LEFT JOIN roles r ON ur."roleId" = r.id
        WHERE ur."userId" = $1 
        AND ur."centerId" = $2
        AND r.type IN ('CENTER_ADMIN')
      `,
        [regularUserId, regularUserCenters.rows[0]?.centerId || 'test'],
      );
      console.log('Center scope roles query result:', centerScopeRoles.rows);
    } catch (error) {
      console.error(
        'Error in getUserRolesForScope CENTER query:',
        error.message,
      );
    }

    // Test roles and permissions
    console.log('\n--- Testing Roles and Permissions ---');

    // Check roles table
    const rolesResult = await client.query('SELECT COUNT(*) FROM roles');
    console.log('Roles count:', rolesResult.rows[0].count);

    // Check user_roles table
    const userRolesResult = await client.query(
      'SELECT COUNT(*) FROM user_roles',
    );
    console.log('UserRoles count:', userRolesResult.rows[0].count);

    // Check permissions table
    const permissionsResult = await client.query(
      'SELECT COUNT(*) FROM permissions',
    );
    console.log('Permissions count:', permissionsResult.rows[0].count);

    // Check regular user's roles
    const regularUserRoles = await client.query(
      'SELECT * FROM user_roles WHERE "userId" = $1',
      [regularUserId],
    );
    console.log('Regular user roles:', regularUserRoles.rows);

    // Test UserCenter with joins (fixed column names)
    const userCentersWithJoins = await client.query(
      `
      SELECT uoc.id, uoc."userId", uoc."centerId", u.name as userName, c.name as centerName
      FROM user_on_centers uoc
      LEFT JOIN users u ON uoc."userId" = u.id
      LEFT JOIN centers c ON uoc."centerId" = c.id
      WHERE uoc."userId" = $1
      LIMIT 5
    `,
      [regularUserId],
    );
    console.log('UserCenter with joins:', userCentersWithJoins.rows);
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await client.end();
  }
}

testDatabase();
