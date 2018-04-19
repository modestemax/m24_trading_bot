<template>
  <div id="app">
    <!--<img class="m24-logo" src="./assets/images/m24_on.gif">-->
    <!--<div class="pb-5">-->
    <!--<img class="m24-logo" :src="logo">-->
    <!--<audio :src="sound" autoplay controls1></audio>-->
    <!--</div>-->

    <b-container fluid>
      <router-view></router-view>
    </b-container>
  </div>
</template>

<script>
  export default {
    name: 'app',
    data() {
      return {};
    },
  };
</script>

<style scoped>
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

  /*.m24-logo {*/
  /*height: 40px;*/
  /*width: 120px;*/
  /*float: left;*/
  /*}*/

  body {
    background-color: black;
  }

  /*.trades {*/
  /*background: #559929;*/
  /*!*opacity: .5;*!*/
  /*}*/

  /*.errors {*/
  /*!*background: #000000;*!*/
  /*!*opacity: .8;*!*/
  /*}*/
</style>
