<template>
  <div class="trades">
    <b-table striped hover :items="tradesList" :fields="fields"></b-table>
  </div>

</template>

<script>
  // import Trade from '@/components/Trade';
  import _ from 'lodash';
  import appEmitter from '../data';

  const time = st => (new Date(st)).toTimeString().split(':').slice(0, 2)
    .join('H ');
  const fix = v => `${(+v).toFixed(2)}%`;
  export default {
    name: 'trades',
    data() {
      return {
        trades: [],
        fields: ['time', 'symbol', 'minGain', 'gainOrLoss', 'maxGain','tradeDuration'],
      };
    },
    // components: { Trade },
    mounted() {
      const me = this;
      this.$nextTick(() => {
        appEmitter.on('trades', (trades) => {
          me.trades = _.Values(trades, t => (_.extend(t, {
            time: time(t.timestamp),
            minGain: fix(t.minGain),
            gainOrLoss: fix(t.gainOrLoss),
            maxGain: fix(t.maxGain),
          })));
        });
      });
    },
  };
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  h1, h2 {
    font-weight: normal;
  }

  ul {
    list-style-type: none;
    padding: 0;
  }

  li {
    display: inline-block;
    margin: 0 10px;
  }

  a {
    color: #42b983;
  }
</style>
