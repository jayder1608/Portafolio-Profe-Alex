<template>
  <div class="app">
    <header class="search-bar" :style="{ borderColor: mainTypeColor }">
      <input
        v-model="pokemonName"
        placeholder="Buscar Pokémon"
        :style="{ borderColor: mainTypeColor }"
        @keyup.enter="fetchPokemon(pokemonName)"
      />
      <button
        @click="fetchPokemon(pokemonName)"
        :style="{ backgroundColor: mainTypeColor }"
      >
        Buscar
      </button>
    </header>

    <main v-if="pokemon" class="container">
      <section class="card-left" :style="{ background: backgroundGradient }">
        <h1>{{ pokemon.name.toUpperCase() }}</h1>
        <div class="image-container">
          <img
            :src="isShiny ? pokemon.sprites.front_shiny : pokemon.sprites.front_default"
            :alt="pokemon.name"
            @mouseenter="isShiny = true"
            @mouseleave="isShiny = false"
          />
          <button
            v-if="cryUrl"
            class="cry-button"
            @click="playCry"
            :style="{ backgroundColor: mainTypeColor }"
          >
            🔊
          </button>
        </div>
        <p><strong>Altura:</strong> {{ pokemon.height / 10 }} m</p>
        <p><strong>Peso:</strong> {{ pokemon.weight / 10 }} kg</p>
      </section>

      <section class="card-center">
        <p class="dex-number" :style="{ color: mainTypeColor }">
          #{{ pokemon.id }}
        </p>
        <h3>Tipo(s)</h3>
        <div class="types">
          <span
            v-for="t in pokemon.types"
            :key="t.type.name"
            class="type-badge"
            :style="{ backgroundColor: typeColors[t.type.name] || '#888' }"
          >
            {{ t.type.name }}
          </span>
        </div>

        <h3>Debilidades</h3>
        <div v-if="weaknesses.length" class="weaknesses">
          <span
            v-for="w in weaknesses"
            :key="w"
            class="weak-badge"
            :style="{ backgroundColor: typeColors[w] || '#999' }"
          >
            {{ w }}
          </span>
        </div>
      </section>

      <section class="card-right">
        <h2>Estadísticas</h2>
        <div class="stats-container">
          <div v-for="(stat, index) in pokemon.stats" :key="stat.stat.name" class="stat">
            <div class="stat-row">
              <span class="stat-name">{{ stat.stat.name.toUpperCase() }}</span>
              <span class="stat-value">{{ stat.base_stat }}/255</span>
            </div>
            <div class="stat-bar">
              <div
                class="bar"
                :style="{
                  width: (stat.base_stat / 255) * 100 + '%',
                  background: backgroundGradient,
                  animationDelay: (index * 0.2) + 's'
                }"
              ></div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <p v-else class="loading">Cargando Pokémon...</p>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";

const pokemon = ref(null);
const pokemonName = ref("");
const isShiny = ref(false);
const weaknesses = ref([]);
const cryUrl = ref(null);
const audio = ref(null);

const typeColors = {
  normal: "#A8A77A",
  fire: "#EE8130",
  water: "#6390F0",
  electric: "#F7D02C",
  grass: "#7AC74C",
  ice: "#96D9D6",
  fighting: "#C22E28",
  poison: "#A33EA1",
  ground: "#E2BF65",
  flying: "#A98FF3",
  psychic: "#F95587",
  bug: "#A6B91A",
  rock: "#B6A136",
  ghost: "#735797",
  dragon: "#6F35FC",
  dark: "#705746",
  steel: "#B7B7CE",
  fairy: "#D685AD",
};

const fetchPokemon = async (nameOrId) => {
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${nameOrId}`);
    if (!res.ok) throw new Error("Pokémon no encontrado");
    const data = await res.json();
    pokemon.value = data;
    await getWeaknesses(data.types);
    cryUrl.value = data.cries?.latest || data.cries?.legacy || null;
    if (cryUrl.value) {
      audio.value = new Audio(cryUrl.value);
    }
  } catch {
    pokemon.value = null;
    cryUrl.value = null;
  }
};

const playCry = () => {
  if (audio.value) {
    audio.value.currentTime = 0;
    audio.value.play();
  }
};

const getWeaknesses = async (types) => {
  const allWeaknesses = new Set();
  for (const t of types) {
    const res = await fetch(t.type.url);
    const data = await res.json();
    data.damage_relations.double_damage_from.forEach((weak) =>
      allWeaknesses.add(weak.name)
    );
  }
  weaknesses.value = [...allWeaknesses];
};

const mainTypeColor = computed(() => {
  if (!pokemon.value) return "#999";
  return typeColors[pokemon.value.types[0].type.name] || "#999";
});

const backgroundGradient = computed(() => {
  if (!pokemon.value) return "#333";
  const types = pokemon.value.types.map((t) => t.type.name);
  const colors = types.map((t) => typeColors[t] || "#555");
  if (colors.length === 1) return colors[0];
  return `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
});

onMounted(() => {
  const randomId = Math.floor(Math.random() * 898) + 1;
  fetchPokemon(randomId);
});
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  background-color: #222;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  overflow-x: hidden;
}

* {
  box-sizing: border-box;
}
</style>

<style scoped>
.app {
  width: 100%;
  min-height: 100vh;
  background-color: #222;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 20px;
  position: relative;
}

.search-bar {
  width: 100%;
  max-width: 400px;
  display: flex;
  gap: 8px;
  border: 2px solid #fff;
  border-radius: 12px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.05);
  margin-bottom: 30px;
}

.search-bar input {
  flex: 1;
  padding: 8px 12px;
  border: 2px solid #fff;
  border-radius: 8px;
  outline: none;
  background: transparent;
  color: white;
  font-size: 16px;
}

.search-bar input::placeholder {
  color: rgba(255, 255, 255, 0.7);
}

.search-bar button {
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: opacity 0.2s;
}

.search-bar button:hover {
  opacity: 0.9;
}

.container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 25px;
  width: 100%;
  max-width: 1200px;
  align-items: start;
  justify-items: center;
  margin: 0 auto;
}

.card-left,
.card-center,
.card-right {
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  width: 100%;
  max-width: 380px;
  min-height: 450px;
}

.card-left {
  text-align: center;
  position: relative;
}

.card-left h1 {
  margin-top: 0;
  font-size: 1.8rem;
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
}

.image-container {
  position: relative;
  display: inline-block;
  margin: 15px 0;
}

.card-left img {
  width: 180px;
  height: 180px;
  transition: transform 0.3s;
  filter: drop-shadow(0 0 8px rgba(0, 0, 0, 0.3));
}

.card-left img:hover {
  transform: scale(1.1);
}

.cry-button {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: white;
  cursor: pointer;
  transition: transform 0.2s;
}

.cry-button:hover {
  transform: scale(1.1);
}

.card-left p {
  margin: 8px 0;
  font-size: 1.1rem;
}

.card-center {
  text-align: center;
  background: rgba(255, 255, 255, 0.05);
  justify-content: flex-start;
}

.dex-number {
  font-size: 4rem;
  font-weight: 900;
  margin: 10px 0;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.card-center h3 {
  margin: 15px 0 10px;
  font-size: 1.3rem;
}

.types,
.weaknesses {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 10px;
}

.type-badge,
.weak-badge {
  padding: 6px 12px;
  border-radius: 10px;
  text-transform: capitalize;
  color: white;
  font-weight: bold;
  font-size: 0.9rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.card-right {
  background: rgba(255, 255, 255, 0.05);
  justify-content: flex-start;
}

.card-right h2 {
  text-align: center;
  font-size: 1.6rem;
  margin-top: 0;
  margin-bottom: 20px;
}

.stats-container {
  width: 100%;
}

.stat {
  margin: 12px 0;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
  font-weight: bold;
  font-size: 0.95rem;
  margin-bottom: 6px;
}

.stat-bar {
  width: 100%;
  height: 16px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  overflow: hidden;
}

.bar {
  height: 100%;
  border-radius: 8px;
  transform-origin: left;
  animation: fillBar 1s ease forwards;
}

@keyframes fillBar {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}

.loading {
  font-size: 1.5rem;
  margin-top: 50px;
  text-align: center;
  width: 100%;
}

/* Responsive adjustments */
@media (max-width: 1024px) {
  .container {
    grid-template-columns: 1fr;
    max-width: 600px;
  }
  
  .card-left, .card-center, .card-right {
    max-width: 100%;
  }
  
  .dex-number {
    font-size: 3.5rem;
  }
}

@media (max-width: 768px) {
  .app {
    padding: 15px;
  }
  
  .search-bar {
    max-width: 100%;
  }
  
  .card-left img {
    width: 150px;
    height: 150px;
  }
  
  .dex-number {
    font-size: 3rem;
  }
  
  .card-left h1 {
    font-size: 1.6rem;
  }
}

@media (max-width: 480px) {
  .app {
    padding: 10px;
  }
  
  .card-left, .card-center, .card-right {
    padding: 15px;
    min-height: 400px;
  }
  
  .card-left img {
    width: 130px;
    height: 130px;
  }
  
  .dex-number {
    font-size: 2.5rem;
  }
  
  .type-badge, .weak-badge {
    font-size: 0.8rem;
    padding: 5px 10px;
  }
}
</style>