<template>
  <div id="app">
    <header>
      <h1>{{ $t('app.title') }}</h1>
      <LanguageSwitcher />
      <nav>
        <router-link to="/">{{ $t('nav.home') }}</router-link> |
        <router-link to="/about">{{ $t('nav.about') }}</router-link> |
        <router-link to="/contact">{{ $t('nav.contact') }}</router-link>
      </nav>
    </header>
    <main>
      <h2>{{ $t('app.welcome') }}</h2>
      <p>{{ $t('app.description') }}</p>
      <router-view />
    </main>
  </div>
</template>

<script>
import LanguageSwitcher from '@/components/LanguageSwitcher.vue'

export default {
  name: 'App',
  components: {
    LanguageSwitcher
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

nav {
  padding: 30px;
}

nav a {
  font-weight: bold;
  color: #2c3e50;
  margin: 0 10px;
  text-decoration: none;
}

nav a.router-link-exact-active {
  color: #42b983;
}

header {
  border-bottom: 1px solid #eee;
  margin-bottom: 20px;
}

main {
  margin-top: 20px;
}
</style> 