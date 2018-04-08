<template>
  <div>
    <span class="time pr-1"> {{time}}</span>
    <span class="symbol pr-1"> {{trade.symbol}}</span>
    <span class="price pr-1"> {{trade.price}}</span>
    <span class="gainOrLoss pr-1"> {{gainOrLoss}}</span>
  </div>
</template>

<script>
  export default {
    name: 'trade',
    props: ['trade'],
    data() {
      return {
      };
    },
    computed: {
      time() {
        return (new Date(this.trade.timestamp))
          .toTimeString()
          .split(':')
          .slice(0, 2)
          .join('H ');
      },
      gainOrLoss() {
        return `${(+this.trade.gainOrLoss).toFixed(2)}%`;
      },
    },
  };
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .time {

  }
</style>
