<template>
  <div id="app">
    <!--<img class="m24-logo" src="./assets/images/m24_on.gif">-->
    <!--<div class="pb-5">-->
    <!--<img class="m24-logo" :src="logo">-->
    <!--<audio :src="sound" autoplay controls1></audio>-->
    <!--</div>-->

    <b-container fluid>
      <b-navbar toggleable="md" type="dark" variant="info">

        <b-navbar-toggle target="nav_collapse"></b-navbar-toggle>

        <b-navbar-brand to="/">
          <b-img class="m24-logo" :src="logo"></b-img>
        </b-navbar-brand>

        <b-collapse is-nav id="nav_collapse">

          <b-navbar-nav>
            <!--<b-nav-item :to="{ name: 'open', params: { type: 'open' }}">Open</b-nav-item>-->
            <b-nav-item to="open" type="open">Open</b-nav-item>
            <b-nav-item to="closed">Closed</b-nav-item>
            <b-nav-item to="errors">Errors
              <b-badge variant="light">4</b-badge>
            </b-nav-item>
          </b-navbar-nav>

          <!-- Right aligned nav items -->
          <b-navbar-nav class="ml-auto">

            <b-nav-form>
              <b-form-input size="sm" class="mr-sm-2" type="text" placeholder="Search"/>
              <b-button size="sm" class="my-2 my-sm-0" type="submit">Search</b-button>
            </b-nav-form>

            <b-nav-item-dropdown text="Lang" right>
              <b-dropdown-item href="#">EN</b-dropdown-item>
              <b-dropdown-item href="#">ES</b-dropdown-item>
              <b-dropdown-item href="#">RU</b-dropdown-item>
              <b-dropdown-item href="#">FA</b-dropdown-item>
            </b-nav-item-dropdown>

            <b-nav-item-dropdown right>
              <!-- Using button-content slot -->
              <template slot="button-content">
                <em>User</em>
              </template>
              <b-dropdown-item href="#">Profile</b-dropdown-item>
              <b-dropdown-item href="#">Signout</b-dropdown-item>
            </b-nav-item-dropdown>
          </b-navbar-nav>

        </b-collapse>
      </b-navbar>
      <router-view></router-view>
    </b-container>
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
      return {
        msg: 'Bot Admin',
        startTime: '',
        duration: '',
        online: false,
        errorsCount: '',
        tradeResume: '',
        appDetails: '',
      };
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
        appEmitter.on('time', ({ start, duration }) => {
          me.startTime = start;
          me.duration = duration;
        });
        appEmitter.on('offline', () => {
          me.online = false;
        });
        appEmitter.on('online', () => {
          me.online = true;
        });
        appEmitter.on('error_count', (count) => {
          me.errorsCount = count;
        });
        appEmitter.on('time', ({ details }) => {
          me.appDetails = details;
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

    width: 80px;
    height: 27px;
  }

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
