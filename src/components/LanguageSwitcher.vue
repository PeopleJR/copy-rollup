<template>
  <div class="language-switcher">
    <label for="language-select">{{ $t('app.switchLanguage') }}:</label>
    <select 
      id="language-select" 
      v-model="currentLocale" 
      @change="changeLocale"
      class="language-select"
    >
      <option 
        v-for="locale in supportedLocales" 
        :key="locale.code" 
        :value="locale.code"
      >
        {{ locale.name }}
      </option>
    </select>
  </div>
</template>

<script>
import { supportedLocales, changeLocale } from '@/plugins/i18n'

export default {
  name: 'LanguageSwitcher',
  data() {
    return {
      supportedLocales,
      currentLocale: this.$i18n.locale
    }
  },
  methods: {
    changeLocale() {
      // 切换语言并持久化
      changeLocale(this.$i18n, this.currentLocale)
    }
  }
}
</script>

<style scoped>
.language-switcher {
  display: flex;
  align-items: center;
  margin: 10px 0;
}

.language-select {
  margin-left: 10px;
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #ccc;
}

label {
  margin-right: 5px;
}
</style> 