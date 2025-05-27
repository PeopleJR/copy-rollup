<template>
  <div class="contact">
    <h1>{{ $t('contact.title') }}</h1>
    <form @submit.prevent="submitForm">
      <div class="form-group">
        <label for="email">{{ $t('contact.email') }}</label>
        <input type="email" id="email" v-model="email" required>
      </div>
      
      <div class="form-group">
        <label for="message">{{ $t('contact.message') }}</label>
        <textarea id="message" v-model="message" rows="5" required></textarea>
      </div>
      
      <button type="submit">{{ $t('contact.submit') }}</button>
    </form>
  </div>
</template>

<script>
export default {
  name: 'Contact',
  data() {
    return {
      email: '',
      message: ''
    }
  },
  methods: {
    submitForm() {
      // 这里可以添加表单提交逻辑
      alert(`Form submitted with email: ${this.email}`);
      this.email = '';
      this.message = '';
    }
  }
}
</script>

<style scoped>
.contact {
  max-width: 500px;
  margin: 0 auto;
  text-align: left;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input, textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #3aa876;
}
</style> 