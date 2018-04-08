<template>
  <div class="errors">
    <div v-for="(error, index) in  errors" :key="index">
      <span class="error">{{error}}</span>
    </div>
  </div>
</template>

<script>
  import appEmitter from '../data';

  export default {
    name: 'hello',
    data() {
      return {
        errors: [],
      };
    },
    mounted() {
      const me = this;
      this.$nextTick(() => {
        appEmitter.on('error', (error) => {
          me.errors.push(error);
        });
      });
    },
  };
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .errors {
    padding-top: 50px;
  }
</style>
