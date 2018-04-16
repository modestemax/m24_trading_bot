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

  const time = st => (new Date(st)).toTimeString().split(':').slice(0, 2)
    .join('H');
  const fix = v => `${(+v).toFixed(2)}%`;


  export default {
    name: 'trades',
    data() {
      return {
        sound: null,
        trades: [],
        fields: ['time', 'symbol', 'minGain', 'gainOrLoss', 'maxGain', 'tradeDuration'],
      };
    },
    // components: { Trade },
    mounted() {
      this.$nextTick(() => {
        this.listenToEvents();
      });
    },
    addTrade(trade) {
      const t = trade;
      this.trades = this.trades.concat(_.extend(t, {
        time: time(t.timestamp),
        minGain: fix(t.minGain),
        gainOrLoss: fix(t.gainOrLoss),
        maxGain: fix(t.maxGain),
        stopPercent: fix(t.stopPercent),
      }));
    },
    endTrade(trade) {
      this.trades.splice(_.findIndex(this.trades, t => t.symbol === trade.symbol), 1);
    },

    changeTrade(trade) {
      this.endTrade(trade);
      this.addTrade(trade);
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
      me.trades = _.values(trades).map(t => _.extend(t, {
        time: time(t.timestamp),
        minGain: fix(t.minGain),
        gainOrLoss: fix(t.gainOrLoss),
        maxGain: fix(t.maxGain),
        stopPercent: fix(t.stopPercent),
      }));
    },
    listenToEvents() {
      appEmitter.on('trades', this.addTrades);
      appEmitter.on('trade_start', this.addTrade);
      appEmitter.on('trade_end', this.endTrade);
      appEmitter.on('trade_change', this.changeTrade);
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
