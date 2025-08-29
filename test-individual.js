const axios = require('axios');

async function testIndividualMethods() {
  try {
    // First, login to get a token
    console.log('Logging in...');
    const loginData = {
      email: 'regular@lms.com',
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

    // Test each endpoint individually to isolate the issue

    // Test 1: Basic user info
    console.log('\n--- Test 1: Basic user info ---');
    try {
      const userResponse = await axios.get(
        'http://localhost:3000/users/0d1590bc-1e3a-470c-8a76-7b2b8ba54193',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      console.log('✅ User info endpoint works');
    } catch (error) {
      console.log(
        '❌ User info endpoint failed:',
        error.response?.data?.message || error.message,
      );
    }

    // Test 2: User centers
    console.log('\n--- Test 2: User centers ---');
    try {
      const centersResponse = await axios.get(
        'http://localhost:3000/users/0d1590bc-1e3a-470c-8a76-7b2b8ba54193/centers',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      console.log('✅ User centers endpoint works');
    } catch (error) {
      console.log(
        '❌ User centers endpoint failed:',
        error.response?.data?.message || error.message,
      );
    }

    // Test 3: User access
    console.log('\n--- Test 3: User access ---');
    try {
      const accessResponse = await axios.get(
        'http://localhost:3000/users/0d1590bc-1e3a-470c-8a76-7b2b8ba54193/access',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      console.log('✅ User access endpoint works');
    } catch (error) {
      console.log(
        '❌ User access endpoint failed:',
        error.response?.data?.message || error.message,
      );
    }

    // Test 4: Access control checks
    console.log('\n--- Test 4: Access control checks ---');
    try {
      const checksResponse = await axios.get(
        'http://localhost:3000/access-control/checks/user-permissions/0d1590bc-1e3a-470c-8a76-7b2b8ba54193',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      console.log('✅ Access control checks endpoint works');
    } catch (error) {
      console.log(
        '❌ Access control checks endpoint failed:',
        error.response?.data?.message || error.message,
      );
    }

    // Test 5: Profile endpoint (the problematic one)
    console.log('\n--- Test 5: Profile endpoint ---');
    try {
      const profileResponse = await axios.get(
        'http://localhost:3000/users/profile',
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      console.log('✅ Profile endpoint works');
      console.log('Profile data:', {
        id: profileResponse.data.id,
        name: profileResponse.data.name,
        email: profileResponse.data.email,
        centers: profileResponse.data.centers?.length || 0,
        context: profileResponse.data.context ? 'present' : 'missing',
      });
    } catch (error) {
      console.log(
        '❌ Profile endpoint failed:',
        error.response?.data?.message || error.message,
      );
      console.log('Error details:', error.response?.data);
    }
  } catch (error) {
    console.error('Error occurred:', error.message);
  }
}

testIndividualMethods();
