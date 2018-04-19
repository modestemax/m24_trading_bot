import _ from 'lodash';
import Vue from 'vue';
import Router from 'vue-router';
import Hello from '@/components/Hello';
import Trades from '@/components/Trades';
import Errors from '@/components/Errors';
// import Hello from '@/components/Hello';
// import Hello from '@/components/Hello';
// import Hello from '@/components/Hello';
// import Hello from '@/components/Hello';

Vue.use(Router);

class OpenTrades extends Trades {
  data() {
    return _.extend(super.data(), { tradeType: 'open' });
  }
}

class ClosedTrades extends Trades {
  data() {
    return _.extend(super.data(), { tradeType: 'closed' });
  }
}

export default new Router({
  routes: [
    {
      path: '/',
      name: 'M24',
      components: { Hello, OpenTrades, ClosedTrades, Errors },
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
    },
  ],
});
