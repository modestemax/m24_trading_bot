import Vue from 'vue';
import Router from 'vue-router';
import HelloWorld from '@/components/HelloWorld';

const HelloWorld1 = HelloWorld;

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: '/',
      name: 'HelloWorld',
      components: { HelloWorld, HelloWorld1 },
    },
  ],
});
