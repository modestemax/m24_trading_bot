// import _ from 'lodash';
import Vue from 'vue';
import Router from 'vue-router';
// import Hello from '@/components/Hello';
import Trades from '@/components/Trades';
import Errors from '@/components/Errors';

Vue.use(Router);

// class OpenTrades extends Trades {
//   // data() {
//   //   // return _.extend(super.data(), { tradeType: 'open' });
//   //   return {};
//   // }
// }
//
// class ClosedTrades extends Trades {
//   // data() {
//   //   // return _.extend(super.data(), { tradeType: 'closed' });
//   //   return {};
//   // }
// }

// const OpenTrades = Trades;
// const ClosedTrades = Trades;

export default new Router({
  routes: [
    {
      path: '/',
      alias: '/open',
      name: 'open',
      component: Trades,
      // props: true,
      // props: { type1: true },
      props: { type: 'open' },
    },
    {
      name: 'openz',
      path: 'openz',
      component: Errors,
      props: { type: 'open' },
    },
    //
    // path: '/open',
    // name: 'open',
    // component: { Hello, OpenTrades, ClosedTrades, Errors },
    // components: { Hello, OpenTrades, ClosedTrades, Errors },
    // component: Hello,
    // children: [
    //   {
    //     path: 'open',
    //     component: Trades,
    //     props: { tradeType: 'open' },
    //   },
    //   {
    //     path: 'closed',
    //     component: Trades,
    //     props: { tradeType: 'closed' },
    //   },
    // ],

  ],
});
