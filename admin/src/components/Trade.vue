<template>
  <tr>
    <th>{{time}}</th>
    <th>{{trade.symbol}}</th>
    <th>{{trade.minGain}}</th>
    <th>{{gainOrLoss}}</th>
    <th>{{trade.maxGain}}</th>
  </tr>
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
