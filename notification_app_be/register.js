const https = require('http');

const data = JSON.stringify({
  email: "anshikajain7566@gmail.com",
  name: "Anshika Jain",
  mobileNo: "7566738902",
  githubUsername: "Annshikaa",
  rollNo: "22MIM10093",
  accessCode: "SfFuWg"
});

const options = {
  hostname: '4.224.186.213',
  path: '/evaluation-service/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('SAVE THIS RESPONSE:');
    console.log(body);
  });
});

req.on('error', (e) => console.error('error:', e));
req.write(data);
req.end();