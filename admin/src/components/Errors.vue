<template>
  <b-list-group class="container-fluid">
    <b-list-group-item class="row" v-for="(error, index) in  errors" :key="index" :class="[error.view?'black':'danger']"
                       @click="error.view=true;reload()">
      <span cols="3" class="col error">{{error.time}}</span>
      <span cols="9" class="col errors">{{error.error}}</span>
    </b-list-group-item>
  </b-list-group>
</template>

<script>
  import _ from 'lodash';
  import appEmitter from '../data';

  export default {
    name: 'Errors',
    data() {
      return {
        errors: [],
      };
    },
    computed: {},
    methods: {
      reload() {
        this.errors = [].concat(this.errors);
        this.countErrors();
      },
      countErrors() {
        const unViewErrors = _.filter(this.errors, e => !e.view);
        appEmitter.emit('error_count', unViewErrors.length);
      },
    },
    mounted() {
      const me = this;
      this.$nextTick(() => {
        appEmitter.on('error', (error) => {
          me.errors.unshift(error);
          me.errors = me.errors.slice(0, 100);
          me.countErrors();
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

  .danger {
    background: rgba(193, 8, 11, 0.97);
  }

  .black {
    background: #000000;
  }
</style>
