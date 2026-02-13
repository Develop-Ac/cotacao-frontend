const https = require('https');

const url = 'https://api.feriadosapi.com/v1/feriados/nacionais?ano=2024';

https.get(url, (res) => {
    console.log('statusCode:', res.statusCode);
    console.log('headers:', res.headers);

    let data = '';
    res.on('data', (d) => {
        data += d;
    });

    res.on('end', () => {
        console.log('Body:', data);
    });

}).on('error', (e) => {
    console.error(e);
});
