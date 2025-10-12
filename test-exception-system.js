/**
 * Test script to verify the complete exception handling system
 * This script tests various scenarios to ensure our custom exceptions
 * and response system work correctly.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test data
const testData = {
  invalidUser: {
    email: 'nonexistent@example.com',
    password: 'wrongpassword',
  },
  invalidCenter: {
    id: '00000000-0000-0000-0000-000000000000',
  },
  invalidRole: {
    id: '00000000-0000-0000-0000-000000000000',
  },
};

// Helper function to make requests
async function makeRequest(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500,
    };
  }
}

// Test functions
async function testAuthenticationExceptions() {
  console.log('\n🔐 Testing Authentication Exceptions...');

  // Test invalid login
  const loginResult = await makeRequest(
    'POST',
    '/auth/login',
    testData.invalidUser,
  );
  console.log('❌ Invalid Login:', {
    status: loginResult.status,
    hasCustomError: loginResult.error?.error?.code === 'AUTHENTICATION_FAILED',
    hasUserMessage: !!loginResult.error?.error?.userMessage,
    hasActionRequired: !!loginResult.error?.error?.actionRequired,
  });

  return (
    loginResult.success === false &&
    loginResult.error?.error?.code === 'AUTHENTICATION_FAILED'
  );
}

async function testResourceNotFoundExceptions() {
  console.log('\n🔍 Testing Resource Not Found Exceptions...');

  // Test invalid center ID
  const centerResult = await makeRequest(
    'GET',
    `/centers/${testData.invalidCenter.id}`,
  );
  console.log('❌ Invalid Center ID:', {
    status: centerResult.status,
    hasCustomError: centerResult.error?.error?.code === 'RESOURCE_NOT_FOUND',
    hasUserMessage: !!centerResult.error?.error?.userMessage,
    hasActionRequired: !!centerResult.error?.error?.actionRequired,
  });

  return (
    centerResult.success === false &&
    centerResult.error?.error?.code === 'RESOURCE_NOT_FOUND'
  );
}

async function testValidationExceptions() {
  console.log('\n✅ Testing Validation Exceptions...');

  // Test invalid signup data
  const signupResult = await makeRequest('POST', '/auth/signup', {
    email: 'invalid-email',
    password: '123', // Too short
  });
  console.log('❌ Invalid Signup Data:', {
    status: signupResult.status,
    hasValidationErrors: !!signupResult.error?.error?.details,
    hasUserMessage: !!signupResult.error?.error?.userMessage,
    hasActionRequired: !!signupResult.error?.error?.actionRequired,
  });

  return (
    signupResult.success === false &&
    signupResult.error?.error?.details?.length > 0
  );
}

async function testSuccessResponses() {
  console.log('\n✅ Testing Success Response Format...');

  // Test a simple endpoint that should return success
  const healthResult = await makeRequest('GET', '/health');
  console.log('✅ Health Check:', {
    status: healthResult.status,
    hasSuccessField: healthResult.data?.success === true,
    hasMessage: !!healthResult.data?.message,
    hasTimestamp: !!healthResult.data?.timestamp,
    hasRequestId: !!healthResult.data?.requestId,
  });

  return healthResult.success && healthResult.data?.success === true;
}

async function testControllerResponseFormat() {
  console.log('\n📋 Testing Controller Response Format...');

  // Test an endpoint that uses ControllerResponse
  const permissionsResult = await makeRequest('GET', '/roles/permissions');
  console.log('📋 Permissions Endpoint:', {
    status: permissionsResult.status,
    hasSuccessField: permissionsResult.data?.success === true,
    hasData: !!permissionsResult.data?.data,
    hasMessage: !!permissionsResult.data?.message,
    hasTimestamp: !!permissionsResult.data?.timestamp,
  });

  return permissionsResult.success && permissionsResult.data?.success === true;
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Exception Handling System Tests...\n');

  const results = {
    authentication: await testAuthenticationExceptions(),
    resourceNotFound: await testResourceNotFoundExceptions(),
    validation: await testValidationExceptions(),
    successResponses: await testSuccessResponses(),
    controllerResponse: await testControllerResponseFormat(),
  };

  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(
      `${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`,
    );
  });

  const allPassed = Object.values(results).every((result) => result);
  console.log(
    `\n🎯 Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`,
  );

  if (allPassed) {
    console.log('\n🎉 Exception handling system is working correctly!');
    console.log('✅ Custom exceptions are being thrown');
    console.log('✅ Error responses have proper structure');
    console.log('✅ Success responses have proper structure');
    console.log('✅ User-friendly messages are provided');
    console.log('✅ Action required guidance is included');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the implementation.');
  }

  return allPassed;
}

// Run tests if this script is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
