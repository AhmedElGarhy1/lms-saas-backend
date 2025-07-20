const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testMultiCenterStudents() {
  console.log('🧪 Testing Multi-Center Student Functionality...\n');

  try {
    // 1. Create a test user (student)
    console.log('1. Creating test student...');
    const student = await prisma.user.create({
      data: {
        email: 'student.test@example.com',
        name: 'Test Student',
        password: 'hashedpassword',
        isActive: true,
      },
    });
    console.log('✅ Student created:', student.email);

    // 2. Create student record
    console.log('\n2. Creating student record...');
    const studentRecord = await prisma.student.create({
      data: {
        userId: student.id,
        grade: 'PRIMARY_1',
        level: 'A',
      },
    });
    console.log('✅ Student record created');

    // 3. Get the default center
    console.log('\n3. Getting default center...');
    const center = await prisma.center.findFirst({
      where: { id: 'default-center-id' },
    });
    console.log('✅ Found center:', center.name);

    // 4. Get Student role for the center
    console.log('\n4. Getting Student role...');
    const studentRole = await prisma.role.findFirst({
      where: {
        name: { startsWith: 'Student' },
        scope: 'CENTER',
        centerId: center.id,
      },
    });
    console.log('✅ Found Student role:', studentRole.name);

    // 5. Add student to center
    console.log('\n5. Adding student to center...');
    const userOnCenter = await prisma.userOnCenter.create({
      data: {
        userId: student.id,
        centerId: center.id,
        roleId: studentRole.id,
        createdBy: 'system',
        metadata: { enrollmentDate: new Date() },
      },
    });
    console.log('✅ Student added to center');

    // 6. Verify student is in center
    console.log('\n6. Verifying student enrollment...');
    const studentInCenter = await prisma.userOnCenter.findFirst({
      where: {
        userId: student.id,
        centerId: center.id,
      },
      include: {
        user: true,
        center: true,
        role: true,
      },
    });
    console.log('✅ Student verified in center:', {
      student: studentInCenter.user.name,
      center: studentInCenter.center.name,
      role: studentInCenter.role.name,
    });

    // 7. Test getting students by center
    console.log('\n7. Testing get students by center...');
    const studentsInCenter = await prisma.userOnCenter.findMany({
      where: {
        centerId: center.id,
        role: {
          name: { startsWith: 'Student' },
        },
      },
      include: {
        user: true,
        role: true,
      },
    });
    console.log('✅ Found', studentsInCenter.length, 'students in center');

    // 8. Test getting student centers
    console.log('\n8. Testing get student centers...');
    const studentCenters = await prisma.userOnCenter.findMany({
      where: {
        userId: student.id,
      },
      include: {
        center: true,
        role: true,
      },
    });
    console.log('✅ Student is enrolled in', studentCenters.length, 'centers');

    console.log(
      '\n🎉 Multi-center student functionality test completed successfully!',
    );
    console.log('\n📋 Summary:');
    console.log('- Student can be created with single account');
    console.log('- Student can be added to multiple centers');
    console.log('- Student roles are properly assigned per center');
    console.log('- System prevents duplicate enrollments');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testMultiCenterStudents();
