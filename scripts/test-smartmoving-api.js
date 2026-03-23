#!/usr/bin/env node
/**
 * Test SmartMoving API directly
 */

async function testAPI() {
  const quoteId = 317119;
  const SMARTMOVING_BASE_URL = 'https://api-public.smartmoving.com/v1';
  const SMARTMOVING_API_KEY = '29f2beddae514bff84a60a1578f8df83';
  const SMARTMOVING_CLIENT_ID = 'b0db4e2b-74af-44e2-8ecd-6f4921ec836f';
  
  try {
    console.log(`Testing SmartMoving API for quote ${quoteId}...`);
    console.log(`URL: ${SMARTMOVING_BASE_URL}/api/opportunities/quote/${quoteId}`);
    
    const response = await fetch(`${SMARTMOVING_BASE_URL}/api/opportunities/quote/${quoteId}`, {
      method: 'GET',
      headers: {
        'X-Api-Key': SMARTMOVING_API_KEY,
        'X-ClientId': SMARTMOVING_CLIENT_ID,
        'Accept': 'application/json'
      }
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:');
      console.log(errorText);
      return;
    }
    
    const data = await response.json();
    
    console.log('\nFull response:');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\nExtracted fields:');
    console.log('  estimatedTotal.subtotal:', data?.estimatedTotal?.subtotal);
    console.log('  branchName:', data?.branchName);
    console.log('  branch:', data?.branch);
    
  } catch (error) {
    console.error('API Error:', error.message);
  }
}

testAPI();
