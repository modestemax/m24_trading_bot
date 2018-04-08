<template>
  <div id="app">
    <!--<img class="m24-logo" src="./assets/images/m24_on.gif">-->
    <div class="pb-5">
      <img class="m24-logo" :src="logo">
      <router-view name="Hello"></router-view>
    </div>

    <b-card-group class="px-3">
      <b-card class="trades" title="Trades">
        <router-view name="Trades"></router-view>
      </b-card>
      <b-card class="errors" title="Errors">
        <router-view name="Errors"></router-view>
      </b-card>

    </b-card-group>
  </div>
</template>

<script>
  import logoOn from './assets/images/m24_on.gif';
  import logoOff from './assets/images/m24_off.png';
  import appEmitter from './data';

  export default {
    name: 'app',
    data() {
      return { online: true };
    },
    computed: {
      logo() {
        return this.online ? logoOn : logoOff;
      },
    },
    mounted() {
      const me = this;
      this.$nextTick(() => {
        appEmitter.on('offline', () => {
          me.online = false;
        });
        appEmitter.on('online', () => {
          me.online = true;
        });
      });
    },
  };
</script>

<style>
  #app {
    font-family: 'Avenir', Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #ffffff;
    padding-top: 5px;
    width: 100%;
    bottom: 0;
  }

  .m24-logo {
    height: 40px;
    width: 120px;
    float: left;
  }

  body {
    background-color: black;
  }

  .trades {
    background: #559929;
    /*opacity: .5;*/
  }

  .errors {
    background: #ff1d0052;
    opacity: .8;
  }
</style>
