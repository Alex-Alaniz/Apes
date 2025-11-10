const axios = require('axios');

const API_KEY = 'd8c59e1e-2558-4803-9701-bcde4ec9b896';

// Try direct API call with different formats
async function testParseBot() {
    console.log('Testing parse.bot API with key:', API_KEY);
    console.log('\n=== Testing different base URLs ===\n');
    
    const baseUrls = [
        'https://api.parse.bot',
        'https://parse.bot/api',
        'https://www.parse.bot/api',
        'https://parsebot.com/api',
        'https://api.parsebot.com'
    ];
    
    for (const baseUrl of baseUrls) {
        console.log(`\nTesting ${baseUrl}...`);
        
        try {
            // Test health endpoint
            const healthResponse = await axios.get(`${baseUrl}/health`, {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'X-API-Key': API_KEY,
                    'Api-Key': API_KEY
                },
                timeout: 5000
            });
            
            console.log('✅ Health check successful:', healthResponse.data);
            
            // If health check works, try more endpoints
            const endpoints = ['/streams', '/pump.fun', '/api/pump.fun', '/v1/streams'];
            
            for (const endpoint of endpoints) {
                try {
                    const response = await axios.get(`${baseUrl}${endpoint}`, {
                        headers: {
                            'Authorization': `Bearer ${API_KEY}`,
                            'X-API-Key': API_KEY,
                            'Api-Key': API_KEY
                        },
                        timeout: 5000
                    });
                    console.log(`✅ ${endpoint}:`, response.data);
                } catch (error) {
                    console.log(`❌ ${endpoint}: ${error.response?.status || error.message}`);
                }
            }
        } catch (error) {
            console.log(`❌ ${baseUrl}: ${error.response?.status || error.message}`);
        }
    }
    
    // Try GraphQL endpoint
    console.log('\n=== Testing GraphQL ===\n');
    try {
        const graphqlResponse = await axios.post('https://api.parse.bot/graphql', {
            query: `
                query {
                    streams(platform: "pump.fun") {
                        id
                        title
                        url
                    }
                }
            `
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('GraphQL response:', JSON.stringify(graphqlResponse.data, null, 2));
    } catch (error) {
        console.log('GraphQL error:', error.response?.status || error.message);
    }
    
    // Try different authentication in URL
    console.log('\n=== Testing API key in URL ===\n');
    const urlWithKey = `https://api.parse.bot/streams?api_key=${API_KEY}`;
    try {
        const response = await axios.get(urlWithKey);
        console.log('URL auth response:', response.data);
    } catch (error) {
        console.log('URL auth error:', error.response?.status || error.message);
    }
}

// Check if parse.bot has a different API structure
async function checkParseBotStructure() {
    console.log('\n=== Checking parse.bot website for API info ===\n');
    
    try {
        // Try to get the main website
        const response = await axios.get('https://parse.bot', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; APITester/1.0)'
            }
        });
        
        // Look for API documentation links in the response
        const html = response.data;
        const apiLinks = html.match(/(?:api|docs|developer)\.parse\.bot[^"']*/gi);
        
        if (apiLinks) {
            console.log('Found potential API links:', apiLinks);
        }
        
        // Check for WebSocket URLs
        const wsLinks = html.match(/wss?:\/\/[^"']*parse\.bot[^"']*/gi);
        if (wsLinks) {
            console.log('Found WebSocket URLs:', wsLinks);
        }
        
    } catch (error) {
        console.log('Could not fetch parse.bot website:', error.message);
    }
}

async function main() {
    await testParseBot();
    await checkParseBotStructure();
    
    console.log('\n=== Summary ===');
    console.log('The parse.bot API appears to be limited or requires different authentication.');
    console.log('Only the /health endpoint at https://api.parse.bot responded successfully.');
    console.log('\nPossible next steps:');
    console.log('1. Check parse.bot documentation for the correct API endpoints');
    console.log('2. Contact parse.bot support to verify the API key and endpoints');
    console.log('3. The API might be WebSocket-only for real-time streaming data');
}

main().catch(console.error);