const PAIR_MAP = {
  'EUR/USD': 'EURUSD', 'USD/JPY': 'USDJPY', 'GBP/USD': 'GBPUSD', 'AUD/NZD': 'AUDNZD',
  'AUD/JPY': 'AUDJPY', 'EUR/JPY': 'EURJPY', 'NZD/USD': 'NZDUSD', 'USD/CHF': 'USDCHF',
  'CAD/JPY': 'CADJPY', 'GBP/JPY': 'GBPJPY', 'EUR/GBP': 'EURGBP', 'EUR/AUD': 'EURAUD',
  'AUD/CAD': 'AUDCAD', 'GBP/AUD': 'GBPAUD', 'NZD/JPY': 'NZDJPY', 'EUR/CHF': 'EURCHF',
  'USD/CAD': 'USDCAD', 'AUD/USD': 'AUDUSD', 'CHF/JPY': 'CHFJPY', 'GBP/CHF': 'GBPCHF',
  'NZD/CAD': 'NZDCAD', 'USD/SGD': 'USDSGD', 'EUR/NZD': 'EURNZD', 'GBP/NZD': 'GBPNZD',
  'CAD/CHF': 'CADCHF'
};

function renderKotakAnomali(data) {
  const pairSelected = document.getElementById("pair").value;
  const pairKey = PAIR_MAP[pairSelected] || pairSelected.replace("/", "");
  const found = data.find(p => p.name === pairKey);
  const anomaliOutput = document.getElementById("anomali-output");

  if (found && found.signal) {
    // Signal: SELL/BUY, Tujuan = signal, Anomali = kebalikannya
    const tujuan = found.signal;
    const anomali = (tujuan === "BUY") ? "SELL" : "BUY";
    anomaliOutput.innerHTML = `
      <div class="row-x"><span class="label-x">PAIR:</span> <span class="value-x">${pairSelected}</span></div>
      <div class="row-x"><span class="label-x">Anomali:</span> <span class="value-x ${anomali === "BUY" ? "green" : "red"}">${anomali}</span></div>
      <div class="row-x"><span class="label-x">Tujuan:</span> <span class="value-x ${tujuan === "BUY" ? "green" : "red"}">${tujuan}</span></div>
      <div class="subsection-x">
        <div class="sub-label-x">Sumber Data:</div>
        <ul class="datasource-x">
          <li>MyFXBook <span class="stats-x">buy ${found.buy}% sell ${found.sell}%</span></li>
        </ul>
      </div>
    `;
  } else {
    anomaliOutput.innerHTML = "<i>Belum ada sinyal untuk pair ini.</i>";
  }
}

function renderKotakSinyalHariIni(data) {
  // Filter semua data yang buy >= 70 atau sell >= 70, dan signal tidak kosong
  const filtered = data.filter(p => (p.buy >= 70 || p.sell >= 70) && p.signal);
  const output = filtered.map(p => 
    `<div class="row-x">
      <span class="label-x" style="min-width:60px;">${p.name}:</span>
      <span class="value-x ${p.signal === "BUY" ? "green" : "red"}">${p.signal}</span>
    </div>`
  ).join('') || "<i>Tidak ada sinyal dengan kriteria (≥ 70%)</i>";
  document.getElementById("signal-output").innerHTML = output;
}

function ambilDataMyfxbook() {
  fetch("sinyal.json")
    .then(res => res.json())
    .then(data => {
      renderKotakAnomali(data);
      renderKotakSinyalHariIni(data);
    })
    .catch(err => {
      document.getElementById("signal-output").innerText = "Gagal ambil sinyal: " + err;
      document.getElementById("anomali-output").innerText = "Gagal ambil anomali: " + err;
      console.error(err);
    });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("pair").addEventListener("change", () => {
    fetch("sinyal.json")
      .then(res => res.json())
      .then(data => renderKotakAnomali(data));
  });
  ambilDataMyfxbook();
});