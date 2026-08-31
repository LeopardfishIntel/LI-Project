import { verifyJobUrlHttp } from './src/firebase/admin';
import dotenv from 'dotenv';
import path from 'path';
import admin from 'firebase-admin';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, './.env.local') });

// Initialize admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

async function testVerify() {
  const url = "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQE7_x-RFwVxRP2JG7EY5VGbZqPKnJo2H6h5Iov16k0n2zvXhL2AL02Tx9lZC1wC_AzBz2vge8w2hFQEXNw-lxHCScGfrHGG36_1Lq2ADD8iTqy9-M4jQlD7x3SSvJhcpSb-oMND0_dPhHfI759k_NSCHvLMGGQ9zBHdfGnYgCQMj0oZZGmn1BdQEY3bWMs91T1UDb0==";
  console.log(`Verifying URL: ${url}`);
  const result = await verifyJobUrlHttp(url);
  console.log("Verification result:", JSON.stringify(result, null, 2));
}

testVerify().catch(console.error);
