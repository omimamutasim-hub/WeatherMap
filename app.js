const map = L.map('map').setView([15.5007, 32.5599], 6);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
} ).addTo(map);

let marker = L.marker([15.5007, 32.5599])
  .addTo(map)
  .bindPopup('Khartoum, Sudan')
  .openPopup();

map.on('zoomend', function () {
  if (marker && marker.isPopupOpen()) {
    marker.getPopup().update();
  }
});

const searchForm = document.querySelector('#search-form');
const statusMessage = document.querySelector('#status');

searchForm.addEventListener('submit', async function (event) {

  event.preventDefault();
  console.log('Search form submitted without reloading the page.');

const locationInput = document.querySelector('#location');
const locationName = locationInput.value.trim();
console.log(locationName);

const params = new URLSearchParams({
  q: locationName,
  format: 'jsonv2',
  limit: '1',
  featureType: 'city'

});
console.log(`https://nominatim.openstreetmap.org/search?${params.toString()}` );

const loadingIndicator = document.querySelector('#loading');
const spinner = document.querySelector('.spinner');

statusMessage.textContent = 'Searching for location…';
loadingIndicator.hidden = false;
spinner.hidden = false;

try {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`
  );

  if (!response.ok) {
    throw new Error('Location search request failed.');
  }

const results = await response.json();
if (results.length === 0) {
  statusMessage.textContent = 'No matching location found. Try another place.';
  return;
}

statusMessage.textContent = '';

if (results.length > 0) {
  const latitude = Number(results[0].lat);
  const longitude = Number(results[0].lon);

await new Promise((resolve) => {
  map.once('moveend', resolve);

  map.flyTo([latitude, longitude], 11, {
    duration: 1.5
  });
});

  map.removeLayer(marker);

marker = L.marker([latitude, longitude])
  .addTo(map)
  .bindPopup(results[0].display_name)
  .openPopup();

  const weatherUrl = new URL(
  'https://api.openweathermap.org/data/2.5/weather'
);

weatherUrl.search = new URLSearchParams({
  lat: latitude,
  lon: longitude,
  appid: 'My key',
  units: 'metric'
});

const weatherResponse = await fetch(weatherUrl);

if (!weatherResponse.ok) {
  if (weatherResponse.status === 404) {
    statusMessage.textContent = 'Weather data was not found for this location.';
  } else if (weatherResponse.status === 401) {
    statusMessage.textContent = 'The weather service rejected the API key.';
  } else {
    statusMessage.textContent =
      `Weather service error (${weatherResponse.status}). Please try again.`;
  }

  return;
}

const weatherData = await weatherResponse.json();

const popupContent = document.createElement('div');

const popupTitle = document.createElement('h3');
popupTitle.textContent = results[0].name || locationName;

const weatherDescriptionText = weatherData.weather[0].description;
const isNight =
  weatherData.dt < weatherData.sys.sunrise ||
  weatherData.dt >= weatherData.sys.sunset;


const weatherMain = weatherData.weather[0].main.toLowerCase();
const conditionId = weatherData.weather[0].id;

const isRainy = weatherMain === 'rain' || weatherMain === 'drizzle';
const isPartlyCloudy = conditionId === 801 || conditionId === 802;

let phaseIcon;

function createMoonIcon() {
  const moon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  moon.setAttribute('viewBox', '0 0 48 48');
  moon.setAttribute('class', 'moon-symbol');
  moon.setAttribute('aria-hidden', 'true');

  const crescent = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  crescent.setAttribute('d', 'M31 5a19 19 0 1 0 12 32A20 20 0 0 1 31 5z');
  crescent.setAttribute('fill', '#258bd2');
  moon.append(crescent);

  return moon;
}

if (isRainy) {
  phaseIcon = document.createElement('span');
  phaseIcon.className = 'weather-condition-symbol rainy-symbol';
  phaseIcon.textContent = '🌧️';
  phaseIcon.setAttribute('aria-label', 'Rainy weather');
} else if (isPartlyCloudy) {
  phaseIcon = document.createElement('span');
  phaseIcon.className = 'weather-condition-symbol partly-cloudy-symbol';
  phaseIcon.textContent = isNight ? '☁️☾' : '🌤️';
  phaseIcon.setAttribute('aria-label', 'Partly cloudy weather');
} else if (isNight) {
  phaseIcon = createMoonIcon();
} else {
  phaseIcon = document.createElement('span');
  phaseIcon.className = 'sun-symbol';
  phaseIcon.textContent = '☀️';
  phaseIcon.setAttribute('aria-hidden', 'true');
}

const iconSide = document.createElement('div');
iconSide.className = 'weather-popup-icons';
iconSide.append(phaseIcon);

const detailsSide = document.createElement('div');
detailsSide.className = 'weather-popup-details';

[
  `Temperature: ${weatherData.main.temp} °C`,
  `Humidity: ${weatherData.main.humidity}%`,
  `Wind: ${weatherData.wind.speed} m/s`,
  `Cloudiness: ${weatherData.clouds.all}%`
].forEach(function (text) {
  const line = document.createElement('p');
  line.textContent = text;
  detailsSide.append(line);
});

const popupLayout = document.createElement('div');
popupLayout.className = 'weather-popup-layout';
popupLayout.append(detailsSide, iconSide);

const shareButton = document.createElement('button');
shareButton.type = 'button';
shareButton.className = 'share-button';
shareButton.textContent = 'Share weather';

shareButton.addEventListener('click', async function () {
  const shareText =
    `${results[0].name || locationName}: ` +
    `${weatherData.main.temp} °C, ${weatherDescriptionText}`;

  try {
    if (navigator.share) {
      await navigator.share({ title: 'WeatherMap', text: shareText });
    } else {
      await navigator.clipboard.writeText(shareText);
      statusMessage.textContent = 'Weather details copied to clipboard.';
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      statusMessage.textContent = 'Could not share the weather details.';
    }
  }
});

popupContent.append(popupTitle, popupLayout, shareButton);

marker.bindPopup(popupContent, {
  autoPan: true,
  autoPanPadding: [30, 30]
}).openPopup();

}

} catch (error) {
  console.error(error);

    statusMessage.textContent =
      'Could not search for this location. Check your connection and try again.';
  }
finally {
  spinner.hidden = true;

  if (!statusMessage.textContent.trim()) {
    loadingIndicator.hidden = true;
  }
}

});