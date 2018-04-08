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

export default new Router({
  routes: [
    {
      path: '/',
      name: 'M24',
      // component: Hello,
      components: { Hello, Trades, Errors },
    },
  ],
});
