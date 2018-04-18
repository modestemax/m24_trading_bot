<template>
  <b-list-group class="container-fluid">
    <b-list-group-item class="row" v-for="(error, index) in  errors" :key="index" :class="[error.view?'black':'danger']"
                       @click="error.view=true;reload()" @click.ctrl="errors.splice(index,1)">
      <strong cols="3" class="col error">{{error.timeframe}}</strong>
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
        this.errors = _.sortBy(this.errors, e => e.view);
        this.countErrors();
      },
      countErrors() {
        const count = _(this.errors).filter(e => !e.view).sumBy('count');
        appEmitter.emit('error_count', count);
      },
    },
    mounted() {
      const me = this;
      this.$nextTick(() => {
        appEmitter.on('error', (error) => {
          const sameError = _.find(me.errors, { error: error.error });
          if (sameError) {
            sameError.count++;
            sameError.timeframes.push(sameError.time);
            sameError.timeframe = `${_.first(sameError.timeframes)} - ${_.last(sameError.timeframes)} [${sameError.count}]`;
          } else {
            me.errors.push({
              time: error.time,
              error: error.error,
              count: 1,
              timeframe: error.time,
              timeframes: [error.time],
            });
          }

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
