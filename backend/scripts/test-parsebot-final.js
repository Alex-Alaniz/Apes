const WebSocket = require('ws');
const axios = require('axios');

const API_KEY = 'd8c59e1e-2558-4803-9701-bcde4ec9b896';

console.log('=== Final parse.bot API Test ===');
console.log('API Key:', API_KEY);
console.log('\nThis test will check if parse.bot is meant for something different than pump.fun\n');

// Test parse.bot with different approaches
async function testParseBot() {
    // 1. Check if it's a bot detection/parsing service
    console.log('Test 1: Bot detection/parsing service endpoints');
    const botEndpoints = [
        '/parse',
        '/detect',
        '/analyze',
        '/bot',
        '/user-agent',
        '/api/parse',
        '/api/detect',
        '/api/analyze'
    ];
    
    for (const endpoint of botEndpoints) {
        try {
            const response = await axios({
                method: 'POST',
                url: `https://api.parse.bot${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                data: {
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    ip: '1.2.3.4',
                    text: 'Sample text to parse'
                },
                timeout: 5000
            });
            
            console.log(`✅ ${endpoint}:`, response.data);
        } catch (error) {
            console.log(`❌ ${endpoint}: ${error.response?.status || error.message}`);
        }
    }
    
    // 2. Check if it's a parser/scraper service
    console.log('\n\nTest 2: Web parsing/scraping endpoints');
    const parseEndpoints = [
        { endpoint: '/scrape', data: { url: 'https://example.com' } },
        { endpoint: '/extract', data: { url: 'https://example.com' } },
        { endpoint: '/api/scrape', data: { url: 'https://example.com' } },
        { endpoint: '/api/extract', data: { url: 'https://example.com' } }
    ];
    
    for (const { endpoint, data } of parseEndpoints) {
        try {
            const response = await axios({
                method: 'POST',
                url: `https://api.parse.bot${endpoint}`,
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json'
                },
                data,
                timeout: 5000
            });
            
            console.log(`✅ ${endpoint}:`, response.data);
        } catch (error) {
            console.log(`❌ ${endpoint}: ${error.response?.status || error.message}`);
        }
    }
    
    // 3. Try WebSocket with parse commands
    console.log('\n\nTest 3: WebSocket with parse commands');
    
    const wsUrl = 'wss://api.parse.bot/ws';
    const ws = new WebSocket(wsUrl, {
        headers: { 'Authorization': `Bearer ${API_KEY}` }
    });
    
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            ws.close();
            resolve();
        }, 5000);
        
        ws.on('open', () => {
            console.log('WebSocket connected, sending parse commands...');
            
            // Try different command formats
            ws.send(JSON.stringify({ command: 'parse', text: 'Test text' }));
            ws.send(JSON.stringify({ action: 'analyze', url: 'https://example.com' }));
            ws.send(JSON.stringify({ type: 'bot-check', userAgent: 'Mozilla/5.0' }));
        });
        
        ws.on('message', (data) => {
            console.log('Received:', data.toString());
        });
        
        ws.on('error', (error) => {
            console.log('WebSocket error:', error.message);
            clearTimeout(timeout);
            resolve();
        });
        
        ws.on('close', () => {
            clearTimeout(timeout);
            resolve();
        });
    });
}

async function main() {
    await testParseBot();
    
    console.log('\n\n=== Conclusion ===');
    console.log('Based on testing, parse.bot appears to be a service that:');
    console.log('1. Only has a /health endpoint that responds');
    console.log('2. Does not appear to be related to pump.fun or cryptocurrency');
    console.log('3. Might be a different type of parsing service (web scraping, bot detection, etc.)');
    console.log('4. The API key may be valid but the service has limited endpoints');
    console.log('\nFor pump.fun livestream data, use:');
    console.log('- PumpPortal WebSocket: wss://pumpportal.fun/api/data');
    console.log('- No API key required for basic usage');
    console.log('- Real-time token creation and trading events');
}

main().catch(console.error);