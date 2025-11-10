const axios = require('axios');
const WebSocket = require('ws');

const API_KEY = 'd8c59e1e-2558-4803-9701-bcde4ec9b896';
const BASE_URL = 'https://api.parse.bot';

// Color codes for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

async function testEndpoint(method, endpoint, data = null, headers = {}) {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`\n${colors.blue}Testing ${method} ${url}${colors.reset}`);
    
    try {
        const config = {
            method,
            url,
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
                ...headers
            }
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        console.log(`${colors.green}✓ Success (${response.status})${colors.reset}`);
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return response.data;
    } catch (error) {
        if (error.response) {
            console.log(`${colors.red}✗ Error ${error.response.status}: ${error.response.statusText}${colors.reset}`);
            if (error.response.data) {
                console.log('Error details:', JSON.stringify(error.response.data, null, 2));
            }
        } else {
            console.log(`${colors.red}✗ Network error: ${error.message}${colors.reset}`);
        }
        return null;
    }
}

async function testWebSocketWithAuth(endpoint, authType = 'header') {
    let url = `wss://api.parse.bot${endpoint}`;
    const options = {};
    
    if (authType === 'header') {
        options.headers = {
            'Authorization': `Bearer ${API_KEY}`
        };
    } else if (authType === 'query') {
        url += `?api_key=${API_KEY}`;
    }
    
    console.log(`\n${colors.blue}Testing WebSocket ${url} (auth: ${authType})${colors.reset}`);
    
    return new Promise((resolve) => {
        const ws = new WebSocket(url, options);
        
        const timeout = setTimeout(() => {
            console.log(`${colors.yellow}WebSocket connection timeout${colors.reset}`);
            ws.close();
            resolve(false);
        }, 10000);
        
        ws.on('open', () => {
            console.log(`${colors.green}✓ WebSocket connected${colors.reset}`);
            clearTimeout(timeout);
            
            // Try different message formats
            const messages = [
                { type: 'subscribe', channel: 'pump.fun' },
                { type: 'subscribe', stream: 'livestream' },
                { action: 'subscribe', data: { platform: 'pump.fun' } },
                { subscribe: 'pump.fun' },
                'subscribe:pump.fun'
            ];
            
            messages.forEach((msg, index) => {
                setTimeout(() => {
                    console.log('Sending:', typeof msg === 'string' ? msg : JSON.stringify(msg));
                    ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
                }, index * 1000);
            });
            
            // Keep connection alive for a bit to see responses
            setTimeout(() => {
                ws.close();
            }, 8000);
        });
        
        ws.on('message', (data) => {
            console.log(`${colors.green}Received message:${colors.reset}`, data.toString());
        });
        
        ws.on('error', (error) => {
            console.log(`${colors.red}✗ WebSocket error: ${error.message}${colors.reset}`);
            clearTimeout(timeout);
            ws.close();
            resolve(false);
        });
        
        ws.on('close', (code, reason) => {
            console.log(`${colors.yellow}WebSocket closed - Code: ${code}, Reason: ${reason}${colors.reset}`);
            clearTimeout(timeout);
            resolve(true);
        });
    });
}

async function runTests() {
    console.log(`${colors.yellow}=== Testing parse.bot API ===${colors.reset}`);
    console.log(`API Key: ${API_KEY}`);
    
    // Test working endpoint first
    await testEndpoint('GET', '/health');
    
    // Test with different auth headers
    console.log(`\n${colors.yellow}Testing with different authentication headers...${colors.reset}`);
    await testEndpoint('GET', '/api/streams', null, { 'X-API-Key': API_KEY });
    await testEndpoint('GET', '/api/streams', null, { 'Api-Key': API_KEY });
    await testEndpoint('GET', '/api/v1/streams');
    
    // Test more specific endpoints
    const endpoints = [
        // API versioned endpoints
        { method: 'GET', endpoint: '/api/v1/health' },
        { method: 'GET', endpoint: '/api/v1/platforms' },
        { method: 'GET', endpoint: '/api/v1/streams/pump.fun' },
        { method: 'GET', endpoint: '/api/v1/streams/pump' },
        { method: 'GET', endpoint: '/api/v1/livestreams' },
        
        // Direct stream endpoints
        { method: 'GET', endpoint: '/stream' },
        { method: 'GET', endpoint: '/stream/pump.fun' },
        { method: 'GET', endpoint: '/live' },
        { method: 'GET', endpoint: '/live/pump.fun' },
        
        // Event endpoints
        { method: 'GET', endpoint: '/events' },
        { method: 'GET', endpoint: '/events/pump.fun' },
        { method: 'GET', endpoint: '/api/events' },
        
        // Different API structures
        { method: 'GET', endpoint: '/api/pump.fun' },
        { method: 'GET', endpoint: '/api/pump.fun/stream' },
        { method: 'GET', endpoint: '/api/pump.fun/live' },
        { method: 'GET', endpoint: '/api/platforms/pump.fun/stream' },
        
        // POST endpoints for subscriptions
        { method: 'POST', endpoint: '/subscribe', data: { platform: 'pump.fun' } },
        { method: 'POST', endpoint: '/api/subscribe', data: { platform: 'pump.fun' } },
        { method: 'POST', endpoint: '/api/v1/subscribe', data: { platform: 'pump.fun' } },
        
        // Documentation endpoints
        { method: 'GET', endpoint: '/docs' },
        { method: 'GET', endpoint: '/api/docs' },
        { method: 'GET', endpoint: '/swagger' },
        { method: 'GET', endpoint: '/openapi' }
    ];
    
    console.log(`\n${colors.yellow}Testing additional REST endpoints...${colors.reset}`);
    for (const { method, endpoint, data } of endpoints) {
        await testEndpoint(method, endpoint, data);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Test WebSocket connections with different auth methods
    console.log(`\n${colors.yellow}Testing WebSocket connections with different auth methods...${colors.reset}`);
    const wsEndpoints = [
        '/ws',
        '/websocket',
        '/stream',
        '/live',
        '/api/ws',
        '/api/v1/ws',
        '/api/stream',
        '/api/live'
    ];
    
    for (const endpoint of wsEndpoints) {
        await testWebSocketWithAuth(endpoint, 'header');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await testWebSocketWithAuth(endpoint, 'query');
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Try WebSocket without SSL
    console.log(`\n${colors.yellow}Testing non-SSL WebSocket...${colors.reset}`);
    try {
        const ws = new WebSocket(`ws://api.parse.bot/ws`, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        
        ws.on('open', () => {
            console.log(`${colors.green}Non-SSL WebSocket connected!${colors.reset}`);
            ws.close();
        });
        
        ws.on('error', (error) => {
            console.log(`${colors.red}Non-SSL WebSocket error: ${error.message}${colors.reset}`);
        });
        
        await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
        console.log(`${colors.red}Non-SSL test failed: ${error.message}${colors.reset}`);
    }
    
    console.log(`\n${colors.yellow}=== Test Complete ===${colors.reset}`);
    console.log('\nSummary: Only /health endpoint responded successfully.');
    console.log('The API might require different authentication method or specific documentation.');
}

// Run the tests
runTests().catch(console.error);