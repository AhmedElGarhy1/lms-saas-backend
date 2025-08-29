const axios = require('axios');

async function testUsersEndpoint() {
  try {
    // First, login to get a token
    console.log('Logging in as superadmin...');
    const loginData = {
      email: 'superadmin@lms.com',
      password: 'password123',
    };

    const loginResponse = await axios.post(
      'http://localhost:3000/auth/login',
      loginData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const token = loginResponse.data.data.accessToken;
    console.log('Login successful, token received');

    // Test the users endpoint
    console.log('Testing users endpoint...');
    const usersResponse = await axios.get(
      'http://localhost:3000/users?page=1&limit=10',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('✅ Users endpoint works!');
    console.log('Response status:', usersResponse.status);
    console.log('Users count:', usersResponse.data.data?.length || 0);
    console.log('Total users:', usersResponse.data.meta?.totalItems || 0);

    if (usersResponse.data.data?.length > 0) {
      console.log('First user:', {
        id: usersResponse.data.data[0].id,
        name: usersResponse.data.data[0].name,
        email: usersResponse.data.data[0].email,
      });
    }
  } catch (error) {
    console.error('❌ Error occurred:');
    console.error('Error message:', error.message);
    console.error('Response status:', error.response?.status);
    console.error('Response data:', error.response?.data);
  }
}

testUsersEndpoint();
