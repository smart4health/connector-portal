const express = require('express');

const PORT = 4000;

const server = express();

server.use('/styles', express.static('build/styles'));
server.use('/images', express.static('build/images'));
server.use('/javascript', express.static('build/javascript'));
server.use('/fonts', express.static('build/fonts'));
server.use('/en', express.static('build/en'));
server.use('/de', express.static('build/de'));
server.use('/pt', express.static('build/pt'));

server.get('/', (req, res) => {
    res.sendFile(`${__dirname}/build/en/start.html`);
});

server.listen(PORT);

console.log(`Server is listening on port ${PORT}`)
console.log(`DE Entrypoint at http://localhost:${PORT}/de/start.html?token=123456&lang=en_US`)
