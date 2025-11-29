import axios from 'axios';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '../.env') });

const API_BASE_URL = process.env.API_URL || process.env.DATABASE_URL?.replace(/\/\/.*@/, '//api@') || 'http://localhost:3001/api/v1';
const ADMIN_TOKEN = process.env.ADMIN_JWT_TOKEN || process.argv[2];

async function runMigration() {
  if (!ADMIN_TOKEN) {
    console.error('❌ Error: Admin JWT token is required.');
    console.error('Usage: ADMIN_JWT_TOKEN=your_token npm run migration:run-match-applicant');
    console.error('   or: npm run migration:run-match-applicant your_token');
    process.exit(1);
  }

  console.log('🚀 Running match_applicant migration...');
  console.log(`📍 API URL: ${API_BASE_URL}`);

  try {
    const response = await axios.post(
      `${API_BASE_URL}/admin/migrations/run-match-applicant`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    if (response.data.success) {
      console.log('✅ Migration completed successfully!');
      console.log(`📝 Message: ${response.data.message}`);
      process.exit(0);
    } else {
      console.error('❌ Migration failed!');
      console.error(`📝 Message: ${response.data.message}`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error running migration:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.message || error.response.statusText}`);
    } else if (error.request) {
      console.error('   No response received from server');
      console.error('   Check if the backend is running and accessible');
    } else {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  }
}

runMigration();




