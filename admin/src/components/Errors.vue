<template>
  <b-list-group>
    <b-list-group-item class="danger" v-for="(error, index) in  errors" :key="index">
      <span class="error">{{error.time}}</span><br/>
      <div class="errors">{{error.error}}</div><br/>
    <span>---------</span>
    </b-list-group-item>
  </b-list-group>
</template>

<script>
  import appEmitter from '../data';

  const time = () => (new Date()).toTimeString().split(':').slice(0, 2)
    .join('H ');

  export default {
    name: 'Errors',
    data() {
      return {
        errors: [],
      };
    },
    computed: {},
    mounted() {
      const me = this;
      this.$nextTick(() => {
        appEmitter.on('error', (error) => {
          me.errors.unshift({ time: time(), error });
        });
      });
    },
  };
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .errors {
    text-align: left;
  }
  .danger{
    background: rgba(193, 8, 11, 0.97);
  }
</style>
