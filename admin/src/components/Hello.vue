<template>
  <div>
    <span class="time">Started at {{startTime}}  [{{duration}}]</span>
    <h3 class="float-right pr-3 card-title">{{msg}}</h3>
  </div>
</template>

<script>
  import appEmitter from '../data';

  export default {
    name: 'hello',
    data() {
      return {
        msg: 'Bot Admin', startTime: '', duration: '',
      };
    },
    mounted() {
      const me = this;
      this.$nextTick(() => {
        appEmitter.on('time', ({ start, duration }) => {
          me.startTime = start;
          me.duration = duration;
        });
      });
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
