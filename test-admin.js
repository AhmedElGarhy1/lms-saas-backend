const axios = require('axios');

async function testAdminProfile() {
  try {
    // First, login to get a token
    console.log('Logging in as admin...');
    const loginData = {
      email: 'admin@lms.com',
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

    // Test the profile endpoint
    console.log('Testing profile endpoint...');
    const profileResponse = await axios.get(
      'http://localhost:3000/users/profile',
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('✅ Profile endpoint works for admin!');
    console.log('Profile data:', {
      id: profileResponse.data.id,
      name: profileResponse.data.name,
      email: profileResponse.data.email,
      centers: profileResponse.data.centers?.length || 0,
      context: profileResponse.data.context ? 'present' : 'missing',
    });
  } catch (error) {
    console.error(
      '❌ Error occurred:',
      error.response?.data?.message || error.message,
    );
    if (error.response?.data) {
      console.error('Error details:', error.response.data);
    }
  }
}

testAdminProfile();
