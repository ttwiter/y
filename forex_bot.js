const http = require('http');
const fetch = require('node-fetch');

// Link sumber data di GitHub Pages (ganti di sini jika ingin)
const DATA_URL = 'https://tradersharing.github.io/Tradersharing/index_V2.html';

const PORT = 8080;

http.createServer(async (req, res) => {
  try {
    // Ambil data dari GitHub Pages
    const response = await fetch(DATA_URL);
    const html = await response.text();

    // Kirim isi HTML ke client (bisa diproses/parse sesuai kebutuhan)
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);

  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Gagal ambil data dari GitHub Pages: ' + e.message);
  }
}).listen(PORT, () => {
  console.log(`Forex Bot running on port ${PORT}`);
  console.log(`Ambil data dari: ${DATA_URL}`);
});