<template>
  <div id="app">
    <!--<img class="m24-logo" src="./assets/images/m24_on.gif">-->
    <img class="m24-logo" :src="logo">
    <router-view name="Hello"></router-view>
    <router-view name="Trades"></router-view>
  </div>
</template>

<script>
  import logoOn from './assets/images/m24_on.gif';
  import logoOff from './assets/images/m24_off.png';

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
</style>
