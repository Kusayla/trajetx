# TrajetX

Application PWA de devis pour service de depannage automobile.

## Fonctionnalites

- Calcul de distance entre deux adresses (Nominatim/OpenStreetMap)
- Estimation de devis automatique
- Gestion des prestations
- Majorations nuit/weekend
- Panel d'administration securise (JWT)

## Stack Technique

- **Frontend**: HTML5, CSS3, JavaScript vanilla
- **Backend**: Node.js + Express
- **Authentification**: JWT + bcryptjs
- **Geocoding**: Nominatim (OpenStreetMap)
- **Calcul distance**: Formule Haversine

## Installation

cd server
npm install
node index.js

Le serveur demarre sur le port 3020.

## Licence

MIT
