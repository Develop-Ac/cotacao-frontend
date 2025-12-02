
const https = require('https');

const url = 'https://rabbitmq-service.acacessorios.local/compras/cotacao/123';

const req = https.request(url, {
    method: 'DELETE',
    rejectUnauthorized: false // Ignore self-signed certs for testing
}, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
