<template>
  <div class="trades">
    <!--<div>-->
    <!--<b-alert show dismissible>-->
    <!--Dismissible Alert! Click the close button over there <b>&rArr;</b>-->
    <!--</b-alert>-->
    <!--</div>-->
    <b-table striped hover small dark head-variant="dark" responsive :items="trades" :fields="fields" caption-top
             :sort-by.sync="sortBy"
             :sort-desc.sync="sortDesc">
      <template slot="table-caption">
        {{tradeType}} Trades {{resume}}
      </template>
      <template slot="commands" slot-scope="row">
        <!-- we use @click.stop here to prevent emitting of a 'row-clicked' event  -->
        <b-button size1="sm" @click.stop="row.toggleDetails" class="" style="height: 16px;">
          <!--<b-button size1="sm" @click.stop="item._showDetails=!item._showDetails" class="" style="height: 16px;">-->
          {{ /*row.detailsShowing ? 'Hide' : 'Show'*/}}
        </b-button>

      </template>
      <template slot="row-details" slot-scope="row">
        <b-card>
          <b-row class="mb-2">
            <!--<b-col sm="3" class="text-sm-right"><b>Go Manual</b></b-col>-->
            <b-col>
              <b-button size="sm" @click="row.toggleDetails">Go Manual</b-button>
            </b-col>
          </b-row>
          <b-row class="mb-2">
            <b-col>
              <b-button size="sm" @click="row.toggleDetails">Sell Now</b-button>
            </b-col>
          </b-row>
          <b-button size="sm" @click="row.toggleDetails">End</b-button>
        </b-card>
      </template>
    </b-table>
  </div>

</template>

<script>
  /* eslint no-underscore-dangle: "off" */
  // import Trade from '@/components/Trade';
  import _ from 'lodash';
  import moment from 'moment';
  import startSound from '../assets/mp3/echoed-ding.mp3';
  import endSound from '../assets/mp3/plucky.mp3';
  import appEmitter, {formatTime, fixed8, fixed2} from '../data'; // eslint-disable-line object-curly-spacing


  export default {
    name: 'trades',
    props: ['type'],
    data() {
      return {
        sound: null,
        allTrades: [],
        sortBy: 'maxGain',
        sortDesc: true,
        fields: [
          { key: 'id', formatter: (id, k, item) => id.replace(item.symbol, ''), sortable: true, label: '#' },
          { key: 'time', formatter: value => formatTime(value), sortable: true },
          { key: 'symbol', sortable: true },
          { key: 'buyPrice', formatter: fixed8 },
          { key: 'sellPrice', formatter: fixed8 },
          { key: 'lastPrice', formatter: fixed8 },
          { key: 'minGain', formatter: fixed2, sortable: true },
          { key: 'gainOrLoss', formatter: fixed2, sortable: true },
          { key: 'maxGain', formatter: fixed2, sortable: true },
          { key: 'target', formatter: fixed2, sortable: true },
          { key: 'tradeDuration', formatter: (v, k, item) => moment.duration(Date.now() - item.time).humanize() },
          // {
          //   key: 'update',
          // formatter: update => update ? `+${update}` : '',
          // sortable: true, // eslint-disable-line no-confusing-arrow
          // },
          {
            key: 'rating',
            formatter: (rating) => {
              if (rating > 0.5) return 'Strong Buy';
              if (rating > 0) return 'Buy';
              if (+rating === 0) return '';
              if (rating < 0.5) return 'Strong Sell';
              if (rating < 0) return ' Sell';
              return '';
            },
            sortable: true, // eslint-disable-line no-confusing-arrow
          },
          'commands',
        ],
      };
    },
    // components: { Trade },
    mounted() {
      this.allTrades = appEmitter.allTrades || [];// eslint-disable-line no-alert
      this.$nextTick(() => {
        this.listenToEvents();
      });
    },
    computed: {
      trades() {
        return _.filter(this.allTrades, { type: this.type });
      },
      tradeType() {
        // this.listenToEvents();
        return _.startCase(this.type);
      },
      resume() {
        if (this.type === 'closed') {
          const all = this.trades.length;
          const win = _(this.trades).filter(t => t._moon_).reject(t => t._moon_ === 'danger').value().length;
          const lost = _(this.trades).filter(t => t._moon_).filter(t => t._moon_ === 'danger').value().length;
          const gain = (win + lost) && ((win - lost) / (win + lost)).toFixed(2);
          if (gain) {
            return `Win: ${win} Lost: ${lost} All: ${all} Gain: ${gain}%`;
          }
        }
        return '';
      },
    },
    watch: {
      type() {
        // this.listenToEvents();
      },
      trades(newTrades, oldTrades) {
        this.emitSound(newTrades, oldTrades);
        this.setColor();
      },
    },
    methods: {
      setColor() {
        _.forEach(this.trades, item => Object.assign(item, {
          _cellVariants: { gainOrLoss: item.gainOrLoss < 0 ? 'danger' : 'success' },
          _rowVariant: (() => {
            let moon;
            if (item.maxGain >= item.target) moon = 'info';
            else if (item.maxGain >= 1) moon = 'success';
            else if (item.minGain <= -2) moon = 'danger';
            return moon;
          })(),
        }));
      },
      emitSound(newTrades, oldTrades) {
        const start = newTrades.length > oldTrades.length;
        const end = newTrades.length < oldTrades.length;
        if (start) {
          this.sound = startSound;
        } else if (end) {
          this.sound = endSound;
        } else {
          this.sound = null;
        }
      },
      addTrades({ trades }) {
        // if (!trades.allTrades || !trades.allTrades.length) {

        this.allTrades = _.map(trades, (t) => {
          const tr = _.find(this.allTrades, { id: t.id });
          if (tr) {
            return _.extend(tr, t);
          }
          return _.extend({ _showDetails: false }, t);
        });
        appEmitter.allTrades = this.allTrades;
        // }
      },
      listenToEvents() {
        appEmitter.on('trades', this.addTrades);
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
