<template>

  <div>
    <div class="pb-5">
      <img class="m24-logo" :src="logo">
      <audio :src="sound" autoplay controls1></audio>

      <span class="time">Started at {{startTime}}  [{{duration}}]</span>
      <h3 class="float-right pr-3 card-title">{{msg}}</h3>
    </div>
    <b-container fluid>
      <b-tabs pills card vertical1>
        <b-tab class="trades" title="Open Trades">
          <router-view name="OpenTrades"></router-view>
        </b-tab>
        <b-tab class="trades" title="Closed Trades">
          <router-view name="ClosedTrades"></router-view>
        </b-tab>
        <b-tab class="errors" title="Errors">
          <template slot="title">
            Errors
            <b-badge pill variant="danger">{{errorsCount}}</b-badge>
          </template>
          <router-view name="Errors"></router-view>
        </b-tab>
      </b-tabs>
    </b-container>

  </div>
</template>

<script>
  export default {
    name: 'hello',
    data() {
      return {

      };
    },


  };
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  h1, h2 {
    font-weight: normal;
  }

  ul {
    list-style-type: none;
    padding: 0;
  }

  li {
    display: inline-block;
    margin: 0 10px;
  }

  a {
    color: #42b983;
  }

  .time {
    color: yellow;
    font-size: 1rem;
  }
</style>
