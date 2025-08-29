const axios = require('axios');

async function testProfileEndpoint() {
  try {
    // First, login to get a token
    console.log('Logging in...');
    const loginData = {
      email: 'regular@lms.com',
      password: 'password123',
    };
    console.log('Login data:', loginData);

    const loginResponse = await axios.post(
      'http://localhost:3000/auth/login',
      loginData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('Login response status:', loginResponse.status);
    console.log('Login response data:', loginResponse.data);

    const token = loginResponse.data.data.accessToken;
    console.log('Token received:', token ? 'Yes' : 'No');

    // Now test the profile endpoint
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

    console.log('Profile endpoint successful!');
    console.log('Response status:', profileResponse.status);
    console.log(
      'Full response data:',
      JSON.stringify(profileResponse.data, null, 2),
    );
    console.log('User data:', {
      id: profileResponse.data.id,
      name: profileResponse.data.name,
      email: profileResponse.data.email,
      centers: profileResponse.data.centers?.length || 0,
      context: profileResponse.data.context ? 'present' : 'missing',
    });
  } catch (error) {
    console.error('Error occurred:');
    console.error('Error message:', error.message);
    console.error('Response status:', error.response?.status);
    console.error('Response data:', error.response?.data);
    console.error('Response headers:', error.response?.headers);
  }
}

testProfileEndpoint();
