<template>
  <div class="trades">
    <!--<div>-->
    <!--<b-alert show dismissible>-->
    <!--Dismissible Alert! Click the close button over there <b>&rArr;</b>-->
    <!--</b-alert>-->
    <!--</div>-->
    <b-table striped hover :items="trades" :fields="fields"></b-table>
  </div>

</template>

<script>
  // import Trade from '@/components/Trade';
  import _ from 'lodash';
  import startSound from '../assets/mp3/echoed-ding.mp3';
  import endSound from '../assets/mp3/plucky.mp3';
  import appEmitter from '../data';


  export default {
    name: 'trades',
    data() {
      return {
        sound: null,
        trades: [],
        fields: ['time', 'symbol', 'buyPrice', 'sellPrice', 'lastPrice', 'minGain', 'gainOrLoss', 'maxGain', 'target', 'tradeDuration', 'update'],
      };
    },
    // components: { Trade },
    mounted() {
      this.$nextTick(() => {
        this.listenToEvents();
      });
    },
    methods: {
      addTrade(trade) {
        this.trades = this.trades.concat(trade).sort(t => t.timestamp);
      },
      endTrade(trade) {
        this.trades.splice(_.findIndex(this.trades, t => t.symbol === trade.symbol), 1);
      },

      changeTrade(trade) {
        const oldTrade = _.find(this.trades, t => t.symbol === trade.symbol);
        _.extend(oldTrade, trade);
        this.trades = [].concat(this.trades);
      },

      addTrades({ trades, start, end }) {
        const me = this;
        me.sound = start ? startSound : null;
        me.sound = me.sound || (end ? endSound : null);
        // debugger;
        if (_.values(trades) > _.values(me.trades)) {
          me.sound = startSound;
        } else if (_.values(trades) < _.values(me.trades)) {
          me.sound = endSound;
        } else {
          me.sound = null;
        }
        me.trades = _.values(trades);
      },
      listenToEvents() {
        appEmitter.on('trades', this.addTrades);
        appEmitter.on('trade_start', this.addTrade);
        // appEmitter.on('trade_end', this.endTrade);
        appEmitter.on('trade_change', this.changeTrade);
      },
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
<style>

  .trades tr.table-success, .trades tr.table-danger, .trades tr.table-info, .trades tr.table-warning {
    color: #000;
  }
</style>
