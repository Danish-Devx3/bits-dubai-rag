/**
 * Test script for document upload endpoint
 * Run with: npx ts-node scripts/test-upload.ts
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';

const BACKEND_URL = 'http://localhost:3001';

async function testUpload() {
    try {
        console.log('🔐 Step 1: Login as admin...');
        const loginResponse = await axios.post(`${BACKEND_URL}/auth/login`, {
            email: 'admin@bitsdubai.ac.ae',
            password: 'admin@bits2024'
        }, {
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('✅ Login successful!');
        console.log('User:', loginResponse.data.user);

        // Extract cookies from response
        const cookies = loginResponse.headers['set-cookie'];
        if (!cookies) {
            throw new Error('No cookies received from login');
        }

        console.log('Cookies received:', cookies);

        // Prepare a test file
        console.log('\n📄 Step 2: Preparing test file...');
        const testFilePath = path.resolve(__dirname, '../test-doc.txt');
        const testContent = 'This is a test document for the BITS Dubai RAG system.\n\nIt contains some sample text to test the ingestion pipeline.';
        fs.writeFileSync(testFilePath, testContent);
        console.log('✅ Test file created:', testFilePath);

        // Upload the file
        console.log('\n📤 Step 3: Uploading file...');
        const formData = new FormData();
        formData.append('file', fs.createReadStream(testFilePath));

        const uploadResponse = await axios.post(`${BACKEND_URL}/ingestion/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Cookie': cookies.join('; ')
            }
        });

        console.log('✅ Upload successful!');
        console.log('Response:', uploadResponse.data);

        // Clean up
        fs.unlinkSync(testFilePath);
        console.log('\n✨ Test completed successfully!');

    } catch (error: any) {
        console.error('\n❌ Test failed:');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
        process.exit(1);
    }
}

testUpload();
