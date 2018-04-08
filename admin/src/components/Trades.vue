<template>
  <div class="trades">
      <Trade v-for="(trade, symbol) in  trades" :key="symbol" :trade="trade">  </Trade>
  </div>

</template>

<script>
  import Trade from '@/components/Trade';
  import appEmitter from '../data';

  export default {
    name: 'trades',
    data() {
      return {
        msg: 'Welcome to Your Vue.js App',
        trades: {},
      };
    },
    components: { Trade },
    mounted() {
      const me = this;
      this.$nextTick(() => {
        appEmitter.on('trades', (trades) => {
          me.trades = trades;
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
