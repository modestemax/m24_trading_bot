<template>
  <div class="errors">
    <div v-for="(error, index) in  errors" :key="index">
      <span class="error">{{error.time}}</span>
      <span class="error">{{error.error}}</span>
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
    computed: {
      time() {
        return (new Date())
          .toTimeString()
          .split(':')
          .slice(0, 2)
          .join('H ');
      },
    },
    mounted() {
      const me = this;
      this.$nextTick(() => {
        appEmitter.on('error', (error) => {
          me.errors.unshift({ time: me.time, error });
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
