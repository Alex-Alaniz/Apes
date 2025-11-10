const WebSocket = require('ws');
const axios = require('axios');

// Color codes for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

// Test configuration
const APIS = {
    pumpPortal: {
        name: 'PumpPortal',
        websocket: 'wss://pumpportal.fun/api/data',
        requiresApiKey: false,
        documentation: 'https://pumpportal.fun/'
    },
    noLimitNodes: {
        name: 'NoLimitNodes',
        websocket: 'wss://api.nolimitnodes.com/pump-fun',
        requiresApiKey: true,
        apiKey: 'YOUR_API_KEY', // Replace with actual key if available
        documentation: 'https://nolimitnodes.com/'
    }
};

// Test PumpPortal WebSocket
async function testPumpPortal() {
    console.log(`\n${colors.cyan}=== Testing PumpPortal WebSocket ===${colors.reset}`);
    console.log('URL:', APIS.pumpPortal.websocket);
    
    return new Promise((resolve) => {
        const ws = new WebSocket(APIS.pumpPortal.websocket);
        let messageCount = 0;
        const messages = [];
        
        const timeout = setTimeout(() => {
            console.log(`${colors.yellow}Closing connection after 30 seconds...${colors.reset}`);
            ws.close();
            resolve({ success: true, messages });
        }, 30000);
        
        ws.on('open', () => {
            console.log(`${colors.green}✓ WebSocket connected${colors.reset}`);
            
            // Subscribe to new token events
            const subscribeNewToken = {
                method: "subscribeNewToken"
            };
            console.log('Subscribing to new tokens:', JSON.stringify(subscribeNewToken));
            ws.send(JSON.stringify(subscribeNewToken));
            
            // Also try account trades subscription
            const subscribeAccountTrade = {
                method: "subscribeAccountTrade",
                keys: ["5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1"] // Example pump.fun deployer
            };
            console.log('Subscribing to account trades:', JSON.stringify(subscribeAccountTrade));
            ws.send(JSON.stringify(subscribeAccountTrade));
        });
        
        ws.on('message', (data) => {
            messageCount++;
            const message = JSON.parse(data.toString());
            messages.push(message);
            
            console.log(`\n${colors.green}Message #${messageCount}:${colors.reset}`);
            console.log(JSON.stringify(message, null, 2));
            
            // Close after receiving 5 messages to see the data structure
            if (messageCount >= 5) {
                clearTimeout(timeout);
                ws.close();
                resolve({ success: true, messages });
            }
        });
        
        ws.on('error', (error) => {
            console.log(`${colors.red}✗ WebSocket error: ${error.message}${colors.reset}`);
            clearTimeout(timeout);
            resolve({ success: false, error: error.message });
        });
        
        ws.on('close', (code, reason) => {
            console.log(`${colors.yellow}WebSocket closed - Code: ${code}, Reason: ${reason}${colors.reset}`);
            clearTimeout(timeout);
        });
    });
}

// Test NoLimitNodes WebSocket
async function testNoLimitNodes(apiKey) {
    console.log(`\n${colors.cyan}=== Testing NoLimitNodes WebSocket ===${colors.reset}`);
    
    if (!apiKey || apiKey === 'YOUR_API_KEY') {
        console.log(`${colors.yellow}Skipping - API key required${colors.reset}`);
        console.log('Get a free API key at: https://nolimitnodes.com/');
        return { success: false, error: 'API key required' };
    }
    
    const url = `${APIS.noLimitNodes.websocket}?api_key=${apiKey}`;
    console.log('URL:', url);
    
    return new Promise((resolve) => {
        const ws = new WebSocket(url);
        let messageCount = 0;
        const messages = [];
        
        const timeout = setTimeout(() => {
            console.log(`${colors.yellow}Closing connection after 30 seconds...${colors.reset}`);
            ws.close();
            resolve({ success: true, messages });
        }, 30000);
        
        ws.on('open', () => {
            console.log(`${colors.green}✓ WebSocket connected${colors.reset}`);
            console.log('Listening for pump.fun events...');
        });
        
        ws.on('message', (data) => {
            messageCount++;
            const message = JSON.parse(data.toString());
            messages.push(message);
            
            console.log(`\n${colors.green}Message #${messageCount}:${colors.reset}`);
            console.log(JSON.stringify(message, null, 2));
            
            // Close after receiving 5 messages
            if (messageCount >= 5) {
                clearTimeout(timeout);
                ws.close();
                resolve({ success: true, messages });
            }
        });
        
        ws.on('error', (error) => {
            console.log(`${colors.red}✗ WebSocket error: ${error.message}${colors.reset}`);
            clearTimeout(timeout);
            resolve({ success: false, error: error.message });
        });
        
        ws.on('close', (code, reason) => {
            console.log(`${colors.yellow}WebSocket closed - Code: ${code}, Reason: ${reason}${colors.reset}`);
            clearTimeout(timeout);
        });
    });
}

// Test REST endpoints if available
async function testRestEndpoints() {
    console.log(`\n${colors.cyan}=== Testing REST Endpoints ===${colors.reset}`);
    
    // Test PumpPortal REST endpoints
    const endpoints = [
        {
            name: 'PumpPortal - Token Info',
            url: 'https://api.pumpportal.fun/coins/latest',
            method: 'GET'
        }
    ];
    
    for (const endpoint of endpoints) {
        console.log(`\n${colors.blue}Testing ${endpoint.name}${colors.reset}`);
        console.log('URL:', endpoint.url);
        
        try {
            const response = await axios({
                method: endpoint.method,
                url: endpoint.url,
                timeout: 5000
            });
            
            console.log(`${colors.green}✓ Success (${response.status})${colors.reset}`);
            console.log('Response:', JSON.stringify(response.data, null, 2));
        } catch (error) {
            console.log(`${colors.red}✗ Error: ${error.response?.status || error.message}${colors.reset}`);
        }
    }
}

// Main test function
async function runTests() {
    console.log(`${colors.yellow}=== Testing Pump.fun Streaming APIs ===${colors.reset}`);
    console.log('This script tests various pump.fun streaming data sources\n');
    
    // Test REST endpoints
    await testRestEndpoints();
    
    // Test WebSocket connections
    console.log(`\n${colors.yellow}Testing WebSocket connections for real-time data...${colors.reset}`);
    console.log('Note: Will listen for up to 5 messages or 30 seconds per service\n');
    
    // Test PumpPortal
    const pumpPortalResult = await testPumpPortal();
    
    // Test NoLimitNodes (if API key is provided)
    // const noLimitNodesResult = await testNoLimitNodes('YOUR_API_KEY');
    
    // Summary
    console.log(`\n${colors.yellow}=== Test Summary ===${colors.reset}`);
    console.log('\nPumpPortal:', pumpPortalResult.success ? 
        `${colors.green}✓ Working - Received ${pumpPortalResult.messages?.length || 0} messages${colors.reset}` : 
        `${colors.red}✗ Failed - ${pumpPortalResult.error}${colors.reset}`
    );
    
    console.log(`\n${colors.cyan}Recommendation:${colors.reset}`);
    console.log('PumpPortal appears to be the best option for pump.fun livestream data:');
    console.log('- No API key required for basic usage');
    console.log('- Real-time WebSocket feed of new tokens and trades');
    console.log('- Can subscribe to specific tokens or accounts');
    console.log('- Documentation: https://pumpportal.fun/');
    
    console.log(`\n${colors.yellow}Note about parse.bot:${colors.reset}`);
    console.log('The parse.bot API with the provided key only responds to /health endpoint.');
    console.log('It may not be designed for pump.fun livestream data.');
    console.log('Consider using PumpPortal or NoLimitNodes instead.');
}

// Run the tests
runTests().catch(console.error);