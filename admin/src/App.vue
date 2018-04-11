<template>
  <div id="app">
    <!--<img class="m24-logo" src="./assets/images/m24_on.gif">-->
    <div class="pb-5">
      <img class="m24-logo" :src="logo">
      <audio :src="sound" autoplay controls1></audio>
      <router-view name="Hello"></router-view>
    </div>

    <b-card-group deck cols="7" class="px-3">
      <b-card class="trades" title="Trades">
        <router-view name="Trades"></router-view>
      </b-card>
      <b-card class="errors" no-body header="<b>Errors</b>">
        <router-view name="Errors"></router-view>
      </b-card>

    </b-card-group>
  </div>
</template>

<script>
  import logoOn from './assets/images/m24_on.gif';
  import logoOff from './assets/images/m24_off.png';
  import soundOn from './assets/mp3/msn-online.mp3';
  import soundOff from './assets/mp3/yahoo_door.mp3';
  import appEmitter from './data';

  export default {
    name: 'app',
    data() {
      return { online: false };
    },
    computed: {
      logo() {
        return this.online ? logoOn : logoOff;
      },
      sound() {
        return this.online ? soundOn : soundOff;
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
    font-size: .8rem;
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
