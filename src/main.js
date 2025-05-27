import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import i18n from './plugins/i18n' // 导入i18n插件

Vue.config.productionTip = false

new Vue({
  router,
  store,
  i18n, // 添加i18n实例
  render: h => h(App)
}).$mount('#app') 