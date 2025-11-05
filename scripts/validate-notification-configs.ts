#!/usr/bin/env ts-node

/**
 * Standalone validation script for notification configurations
 * Can be run manually or in CI/CD pipelines
 * Exits with code 1 if validation fails, 0 if successful
 */

import {
  validateTemplatePaths,
  validateProfileScopedChannels,
} from '../src/modules/notifications/config/config-validator';

function main() {
  console.log('🔍 Validating notification configurations...\n');

  // Validate template paths
  const pathResult = validateTemplatePaths();
  let hasErrors = !pathResult.isValid;

  if (!pathResult.isValid) {
    console.error(
      `❌ Found ${pathResult.errors.length} template path mismatch(es):\n`,
    );

    for (const error of pathResult.errors) {
      console.error(`  - ${error.message}`);
    }
    console.error('');
  } else {
    console.log('✓ Template paths are valid');
  }

  // Validate profile-scoped channels
  const profileResult = validateProfileScopedChannels();
  if (!profileResult.isValid) {
    hasErrors = true;
    console.error(
      `❌ Found ${profileResult.errors.length} profile-scoped channel validation error(s):\n`,
    );

    for (const error of profileResult.errors) {
      console.error(`  - ${error.message}`);
    }
    console.error('');
  } else {
    console.log('✓ Profile-scoped channels are valid');
  }

  if (hasErrors) {
    console.error(
      '\n❌ Validation failed. Please fix the errors above.\n',
    );
    process.exit(1);
  } else {
    console.log('\n✅ All notification configurations are valid!\n');
    process.exit(0);
  }
}

// Run validation
main();

