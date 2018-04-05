import Vue from 'vue';
import Router from 'vue-router';
import Hello from '@/components/Hello';
import Trades from '@/components/Trades';
// import Hello from '@/components/Hello';
// import Hello from '@/components/Hello';
// import Hello from '@/components/Hello';
// import Hello from '@/components/Hello';
// import Hello from '@/components/Hello';

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Hello',
      // component: Hello,
      components: { Hello, Trades },
    },
  ],
});
