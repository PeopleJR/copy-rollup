import Vue from 'vue'
import VueI18n from 'vue-i18n'
import axios from 'axios'

// 导入语言包
import enLocale from '../locales/en.json'
import zhLocale from '../locales/zh.json'
import jaLocale from '../locales/ja.json'

Vue.use(VueI18n)

// 支持的语言列表
export const supportedLocales = [
  {
    code: 'en',
    name: 'English',
    file: enLocale
  },
  {
    code: 'zh',
    name: '中文',
    file: zhLocale
  },
  {
    code: 'ja',
    name: '日本語',
    file: jaLocale
  }
]

/**
 * 从localStorage获取用户设置的语言
 * @returns {string|null} 语言代码或null
 */
export function getStoredLocale() {
  return localStorage.getItem('userLocale')
}

/**
 * 将用户语言选择保存到localStorage
 * @param {string} locale 语言代码
 */
export function setStoredLocale(locale) {
  localStorage.setItem('userLocale', locale)
}

/**
 * 从Accept-Language头部解析语言
 * @returns {string} 默认语言代码
 */
export function getBrowserLocale() {
  // 尝试使用 navigator.language
  const browserLocale = navigator.language || navigator.userLanguage || ''
  
  // 提取主要语言代码 (例如 'en-US' 变为 'en')
  const locale = browserLocale.split('-')[0]
  
  // 检查是否支持该语言
  if (isLocaleSupported(locale)) {
    return locale
  }
  
  // 回退到默认语言
  return 'en'
}

/**
 * 检查语言是否在支持列表中
 * @param {string} locale 要检查的语言代码
 * @returns {boolean} 是否支持
 */
export function isLocaleSupported(locale) {
  return supportedLocales.some(l => l.code === locale)
}

/**
 * 设置axios的Accept-Language头部
 * @param {string} locale 语言代码
 */
export function setAxiosLocale(locale) {
  axios.defaults.headers.common['Accept-Language'] = locale
}

/**
 * 确定要使用的语言
 * 优先级: localStorage > 浏览器设置 > 默认语言(en)
 * @returns {string} 语言代码
 */
export function determineLocale() {
  // 1. 尝试从localStorage获取用户设置的语言
  const storedLocale = getStoredLocale()
  if (storedLocale && isLocaleSupported(storedLocale)) {
    return storedLocale
  }
  
  // 2. 尝试从浏览器获取语言设置
  const browserLocale = getBrowserLocale()
  if (browserLocale && isLocaleSupported(browserLocale)) {
    return browserLocale
  }
  
  // 3. 使用默认语言
  return 'en'
}

/**
 * 加载语言包
 * @returns {Object} 语言包对象
 */
export function loadLocaleMessages() {
  const messages = {}
  supportedLocales.forEach(locale => {
    messages[locale.code] = locale.file
  })
  return messages
}

/**
 * 切换应用语言
 * @param {VueI18n} i18n VueI18n实例
 * @param {string} locale 目标语言代码
 */
export function changeLocale(i18n, locale) {
  if (!isLocaleSupported(locale)) {
    console.warn(`语言 ${locale} 不受支持`)
    return
  }
  
  // 设置i18n语言
  i18n.locale = locale
  
  // 设置文档语言
  document.querySelector('html').setAttribute('lang', locale)
  
  // 设置axios头部
  setAxiosLocale(locale)
  
  // 保存到localStorage
  setStoredLocale(locale)
}

// 创建VueI18n实例
const i18n = new VueI18n({
  locale: determineLocale(), // 设置默认语言
  fallbackLocale: 'en',      // 设置备用语言
  messages: loadLocaleMessages(),
  silentTranslationWarn: true  // 在开发环境下不显示警告
})

// 初始化设置
setAxiosLocale(i18n.locale)
document.querySelector('html').setAttribute('lang', i18n.locale)

export default i18n 