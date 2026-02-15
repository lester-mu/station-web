const FIREBASE_URL = "https://estacion-de-calidad-default-rtdb.firebaseio.com";
const OPENWEATHER_API_KEY = "TU_API_KEY_AQUI";
const CITY = "Managua";
const UPDATE_INTERVAL = 3000;

// Umbrales
const THRESHOLDS = {
  TEMP_MAX: 32,
  CO2_MAX: 1000,
  TVOC_MAX: 500,
  HUM_MIN: 45,
  HUM_MAX: 75,
};

// Variables globales
let chart = null;
let historyData = {
  labels: [],
  temperature: [],
  co2: [],
  humidity: [],
};

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  initChart();
  fetchSensorData();
  fetchWeatherData();

  // Actualizar cada X segundos
  setInterval(fetchSensorData, UPDATE_INTERVAL);
  setInterval(fetchWeatherData, 600000); // Cada 10 minutos
});

// Obtener datos de sensores desde Firebase
async function fetchSensorData() {
  try {
    const response = await fetch(`${FIREBASE_URL}/current.json`);
    const data = await response.json();

    if (data) {
      updateSensorDisplay(data);
      updateHistory(data);
      updateLastUpdate();
    }
  } catch (error) {
    console.error("Error al obtener datos de Firebase:", error);
  }
}

// Actualizar display de sensores
function updateSensorDisplay(data) {
  // Temperatura
  document.getElementById("temperature").textContent =
    data.temperature.toFixed(1);
  updateStatus("temp", data.temperature, THRESHOLDS.TEMP_MAX, "alta", "°C");

  // Humedad
  document.getElementById("humidity").textContent = data.humidity.toFixed(1);
  updateHumidityStatus("hum", data.humidity);

  // CO2
  document.getElementById("co2").textContent = data.co2;
  updateStatus("co2", data.co2, THRESHOLDS.CO2_MAX, "alto", "ppm");

  // TVOC
  document.getElementById("tvoc").textContent = data.tvoc;
  updateStatus("tvoc", data.tvoc, THRESHOLDS.TVOC_MAX, "alto", "ppb");

  // Presión
  document.getElementById("pressure").textContent = data.pressure.toFixed(1);

  // Estado del ventilador
  const fanCard = document.getElementById("fan-card");
  const fanStatus = document.getElementById("fan-status");

  if (data.fan_active) {
    fanStatus.textContent = "ON";
    fanStatus.style.color = "#4caf50";
    fanCard.classList.add("active");
  } else {
    fanStatus.textContent = "OFF";
    fanStatus.style.color = "#aaa";
    fanCard.classList.remove("active");
  }
}

// Actualizar estado del sensor
function updateStatus(id, value, threshold, tipo, unit) {
  const card = document.getElementById(`${id}-card`);
  const status = document.getElementById(`${id}-status`);

  if (value > threshold) {
    card.classList.add("alert");
    status.textContent = `⚠️ Muy ${tipo}`;
    status.className = "sensor-status status-danger";
  } else if (value > threshold * 0.9) {
    card.classList.remove("alert");
    status.textContent = `Elevado`;
    status.className = "sensor-status status-warning";
  } else {
    card.classList.remove("alert");
    status.textContent = "Normal";
    status.className = "sensor-status status-good";
  }
}

// Estado especial para humedad
function updateHumidityStatus(id, value) {
  const card = document.getElementById(`${id}-card`);
  const status = document.getElementById(`${id}-status`);

  if (value < THRESHOLDS.HUM_MIN) {
    card.classList.add("alert");
    status.textContent = "⚠️ Muy baja";
    status.className = "sensor-status status-danger";
  } else if (value > THRESHOLDS.HUM_MAX) {
    card.classList.add("alert");
    status.textContent = "⚠️ Muy alta";
    status.className = "sensor-status status-danger";
  } else {
    card.classList.remove("alert");
    status.textContent = "Normal";
    status.className = "sensor-status status-good";
  }
}

// Actualizar historial y gráfica
async function updateHistory(data) {
  const now = new Date();
  const timeLabel = now.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  historyData.labels.push(timeLabel);
  historyData.temperature.push(data.temperature);
  historyData.co2.push(data.co2);
  historyData.humidity.push(data.humidity);

  // Mantener solo últimas 50 lecturas
  if (historyData.labels.length > 50) {
    historyData.labels.shift();
    historyData.temperature.shift();
    historyData.co2.shift();
    historyData.humidity.shift();
  }

  updateChart();
}

// Inicializar gráfica
function initChart() {
  const ctx = document.getElementById("historyChart").getContext("2d");

  chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: historyData.labels,
      datasets: [
        {
          label: "Temperatura (°C)",
          data: historyData.temperature,
          borderColor: "#ff6384",
          backgroundColor: "rgba(255, 99, 132, 0.1)",
          yAxisID: "y",
        },
        {
          label: "CO₂ (ppm)",
          data: historyData.co2,
          borderColor: "#36a2eb",
          backgroundColor: "rgba(54, 162, 235, 0.1)",
          yAxisID: "y1",
        },
        {
          label: "Humedad (%)",
          data: historyData.humidity,
          borderColor: "#4bc0c0",
          backgroundColor: "rgba(75, 192, 192, 0.1)",
          yAxisID: "y",
        },
      ],
    },
    options: {
      responsive: true,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          labels: {
            color: "#eee",
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: "#aaa",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
        y: {
          type: "linear",
          display: true,
          position: "left",
          ticks: {
            color: "#aaa",
          },
          grid: {
            color: "rgba(255, 255, 255, 0.1)",
          },
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          ticks: {
            color: "#aaa",
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    },
  });
}

// Actualizar gráfica
function updateChart() {
  if (chart) {
    chart.data.labels = historyData.labels;
    chart.data.datasets[0].data = historyData.temperature;
    chart.data.datasets[1].data = historyData.co2;
    chart.data.datasets[2].data = historyData.humidity;
    chart.update("none"); // Sin animación para mejor rendimiento
  }
}

// Obtener datos del clima
async function fetchWeatherData() {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&appid=${OPENWEATHER_API_KEY}&units=metric&lang=es`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.cod === 200) {
      updateWeatherDisplay(data);
      document.getElementById("weather-loading").style.display = "none";
      document.getElementById("weather-content").style.display = "block";
    }
  } catch (error) {
    console.error("Error al obtener datos del clima:", error);
    document.getElementById("weather-loading").textContent =
      "Error al cargar clima";
  }
}

// Actualizar display del clima
function updateWeatherDisplay(data) {
  document.getElementById("city-name").textContent = `${data.name}, ${
    data.sys.country
  }`;

  const date = new Date();
  document.getElementById("weather-date").textContent = date.toLocaleDateString(
    "es-ES",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

  document.getElementById("weather-temp-value").textContent = Math.round(
    data.main.temp
  );

  document.getElementById("weather-icon").src =
    `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

  document.getElementById("weather-description").textContent =
    data.weather[0].description;

  document.getElementById("feels-like").textContent = Math.round(
    data.main.feels_like
  );

  document.getElementById("weather-humidity").textContent = data.main.humidity;

  document.getElementById("wind-speed").textContent = (
    data.wind.speed * 3.6
  ).toFixed(1);

  document.getElementById("weather-pressure").textContent = data.main.pressure;

  document.getElementById("temp-max").textContent = Math.round(
    data.main.temp_max
  );

  document.getElementById("temp-min").textContent = Math.round(
    data.main.temp_min
  );
}

// Actualizar timestamp
function updateLastUpdate() {
  const now = new Date();
  document.getElementById("last-update").textContent =
    `Última actualización: ${now.toLocaleString("es-ES")}`;
}
