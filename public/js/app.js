// TrajetX - Application Client avec Autocompletion
const API_BASE = '/trajetX/api';

let config = null;
let selectedPrestations = [];
let distanceKm = 0;
let selectedCoords = { A: null, B: null };
let searchTimeout = null;

document.addEventListener('DOMContentLoaded', async function() {
    await loadConfig();
    setupEventListeners();
    setupAutocomplete();
});

async function loadConfig() {
    try {
        const res = await fetch(API_BASE + '/config');
        config = await res.json();
        renderPrestations();
        updatePhoneButton();
    } catch (e) {
        console.error('Erreur chargement config:', e);
    }
}

function renderPrestations() {
    const container = document.getElementById('prestationsList');
    if (!container || !config || !config.prestations) return;
    
    let html = '';
    config.prestations.forEach(function(p) {
        html += '<div class="prestation-item" data-id="' + p.id + '">';
        html += '<span class="check"></span>';
        html += '<div class="prestation-info">';
        html += '<div class="nom">' + p.nom + '</div>';
        html += '<div class="prix">' + p.prix.toFixed(2) + ' EUR</div>';
        html += '</div></div>';
    });
    container.innerHTML = html;

    container.querySelectorAll('.prestation-item').forEach(function(item) {
        item.addEventListener('click', function() {
            item.classList.toggle('selected');
            updateSelectedPrestations();
            calculateDevis();
        });
    });
}

function updateSelectedPrestations() {
    selectedPrestations = [];
    document.querySelectorAll('.prestation-item.selected').forEach(function(item) {
        const id = parseInt(item.getAttribute('data-id'));
        const prestation = config.prestations.find(function(p) { return p.id === id; });
        if (prestation) selectedPrestations.push(prestation);
    });
}

function updatePhoneButton() {
    const btn = document.getElementById('btnAppeler');
    if (!btn) return;
    if (config.phone && config.phone !== 'Num depanneur') {
        btn.href = 'tel:' + config.phone.replace(/\s/g, '');
        btn.textContent = config.phone;
    } else {
        btn.href = '#';
        btn.textContent = 'Appeler le depanneur';
    }
}

function setupEventListeners() {
    var btnCalculer = document.getElementById('btnCalculer');
    var optionNuit = document.getElementById('optionNuit');
    var optionWeekend = document.getElementById('optionWeekend');
    
    if (btnCalculer) btnCalculer.addEventListener('click', calculateDistance);
    if (optionNuit) optionNuit.addEventListener('change', calculateDevis);
    if (optionWeekend) optionWeekend.addEventListener('change', calculateDevis);
}

// === AUTOCOMPLETION ===
function setupAutocomplete() {
    const inputA = document.getElementById('adresseA');
    const inputB = document.getElementById('adresseB');
    const resultsA = document.getElementById('resultsA');
    const resultsB = document.getElementById('resultsB');

    if (inputA && resultsA) setupInput(inputA, resultsA, 'A');
    if (inputB && resultsB) setupInput(inputB, resultsB, 'B');

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.autocomplete-wrapper')) {
            if (resultsA) resultsA.classList.remove('show');
            if (resultsB) resultsB.classList.remove('show');
        }
    });
}

function setupInput(input, resultsDiv, key) {
    input.addEventListener('input', function() {
        const query = input.value.trim();
        selectedCoords[key] = null;

        if (query.length < 3) {
            resultsDiv.classList.remove('show');
            return;
        }

        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(function() {
            searchAddresses(query, resultsDiv, input, key);
        }, 300);
    });

    input.addEventListener('focus', function() {
        if (resultsDiv.children.length > 0 && input.value.length >= 3) {
            resultsDiv.classList.add('show');
        }
    });
}

async function searchAddresses(query, resultsDiv, input, key) {
    resultsDiv.innerHTML = '<div class="autocomplete-loading">Recherche...</div>';
    resultsDiv.classList.add('show');

    try {
        const url = 'https://nominatim.openstreetmap.org/search?format=json&q=' +
                    encodeURIComponent(query) +
                    '&limit=5&countrycodes=fr&addressdetails=1';

        const res = await fetch(url);
        const data = await res.json();

        if (data.length === 0) {
            resultsDiv.innerHTML = '<div class="autocomplete-loading">Aucun resultat</div>';
            return;
        }

        resultsDiv.innerHTML = '';
        data.forEach(function(place) {
            const item = document.createElement('div');
            item.className = 'autocomplete-item';

            const parts = place.display_name.split(', ');
            const mainText = parts.slice(0, 2).join(', ');
            const subText = parts.slice(2, 4).join(', ');

            item.innerHTML = '<div class="main-text">' + mainText + '</div>' +
                           '<div class="sub-text">' + subText + '</div>';

            item.addEventListener('click', function() {
                input.value = place.display_name;
                selectedCoords[key] = {
                    lat: parseFloat(place.lat),
                    lon: parseFloat(place.lon)
                };
                resultsDiv.classList.remove('show');
            });

            resultsDiv.appendChild(item);
        });

    } catch (e) {
        console.error('Erreur recherche:', e);
        resultsDiv.innerHTML = '<div class="autocomplete-loading">Erreur de recherche</div>';
    }
}

// === CALCUL DISTANCE ===
async function calculateDistance() {
    const adresseA = document.getElementById('adresseA').value.trim();
    const adresseB = document.getElementById('adresseB').value.trim();

    if (!adresseA || !adresseB) {
        alert('Veuillez renseigner les deux adresses');
        return;
    }

    const btn = document.getElementById('btnCalculer');
    btn.innerHTML = '<span class="loading"></span>Calcul en cours...';
    btn.disabled = true;

    try {
        let coordsA = selectedCoords.A;
        let coordsB = selectedCoords.B;

        if (!coordsA) {
            coordsA = await geocodeAddress(adresseA);
        }
        if (!coordsB) {
            coordsB = await geocodeAddress(adresseB);
        }

        if (!coordsA) {
            throw new Error('Adresse de depart non trouvee');
        }
        if (!coordsB) {
            throw new Error('Adresse d arrivee non trouvee');
        }

        distanceKm = haversineDistance(coordsA.lat, coordsA.lon, coordsB.lat, coordsB.lon);
        const durationMin = Math.round(distanceKm / 50 * 60);

        document.getElementById('distanceKm').textContent = distanceKm.toFixed(1);
        document.getElementById('duration').textContent = 'Duree estimee: ' + formatDuration(durationMin);

        document.getElementById('distanceCard').style.display = 'block';
        document.getElementById('prestationsCard').style.display = 'block';
        document.getElementById('optionsCard').style.display = 'block';
        document.getElementById('devisCard').style.display = 'block';

        calculateDevis();

    } catch (e) {
        alert('Erreur: ' + e.message);
    } finally {
        btn.innerHTML = 'Calculer la distance';
        btn.disabled = false;
    }
}

async function geocodeAddress(address) {
    try {
        let searchAddress = address;
        if (!address.toLowerCase().includes('france')) {
            searchAddress = address + ', France';
        }

        const url = 'https://nominatim.openstreetmap.org/search?format=json&q=' +
                    encodeURIComponent(searchAddress) + '&limit=1&countrycodes=fr';
        const res = await fetch(url);
        const data = await res.json();

        if (data.length === 0) return null;
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    } catch (e) {
        console.error('Geocoding error:', e);
        return null;
    }
}

function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

function formatDuration(minutes) {
    if (minutes < 60) return minutes + ' min';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h + 'h' + (m > 0 ? m.toString().padStart(2, '0') : '');
}

function calculateDevis() {
    if (!config || distanceKm === 0) return;

    const tarifs = config.tarifs;
    const optNuit = document.getElementById('optionNuit');
    const optWeekend = document.getElementById('optionWeekend');
    const isNuit = optNuit ? optNuit.checked : false;
    const isWeekend = optWeekend ? optWeekend.checked : false;

    let priseEnCharge = tarifs.priseEnCharge || 0;
    let prixKm = (tarifs.prixKm || 0) * distanceKm;
    let totalPrestations = 0;
    selectedPrestations.forEach(function(p) {
        totalPrestations += p.prix;
    });

    let subtotal = priseEnCharge + prixKm + totalPrestations;

    let majoration = 1;
    if (isNuit) majoration *= tarifs.tarifNuit || 1;
    if (isWeekend) majoration *= tarifs.tarifWeekend || 1;

    let total = subtotal * majoration;

    let details = '<div class="devis-line"><span class="label">Prise en charge</span><span class="value">' + priseEnCharge.toFixed(2) + ' EUR</span></div>';
    details += '<div class="devis-line"><span class="label">Distance</span><span class="value">' + prixKm.toFixed(2) + ' EUR</span></div>';

    selectedPrestations.forEach(function(p) {
        details += '<div class="devis-line"><span class="label">' + p.nom + '</span><span class="value">' + p.prix.toFixed(2) + ' EUR</span></div>';
    });

    if (majoration > 1) {
        const majorationPct = ((majoration - 1) * 100).toFixed(0);
        let label = 'Majoration';
        if (isNuit) label += ' nuit';
        if (isWeekend) label += ' weekend';
        details += '<div class="devis-line"><span class="label">' + label + '</span><span class="value">+' + majorationPct + '%</span></div>';
    }

    document.getElementById('devisDetails').innerHTML = details;
    document.getElementById('totalTTC').textContent = total.toFixed(2) + ' EUR';
}
