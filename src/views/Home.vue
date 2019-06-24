<template>
  <div>
    <div v-for="(r, index) of results" :key="index" class="test" :class="{'green': r.status === 'pass', 'red': r.status === 'fail'}">
      <div class="strong">
        <span>{{r.name}}... </span><span class="uppercase">{{r.status}}</span>
      </div>
      <div v-if="r.text">{{ r.text }}</div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

interface Test {
  name: string;
  status: 'running' | 'pass' | 'fail';
  text?: string;
}

@Component
export default class Home extends Vue {
  results: Test[] = [];

  async runTest(name: string, test: () => Promise<boolean | string>) {
    let res: Test = { name, status: 'running' };
    this.results.push(res);
    try {
      let testRes = await test();
      res.status = testRes === true ? 'pass' : 'fail';
      if (testRes && testRes !== true) {
        res.text = testRes;
      }
    } catch (e) {
      res.status = 'fail';
      res.text = e;
    }
  }

  async created() {
    let p = new Promise(() => {});
    await this.runTest('Wait 5 seconds and pass', async () => {
      return new Promise((res, rej) => {
        setTimeout(() => res(true), 5000);
      });
    });
    await this.runTest('Wait 1 seconds and fail', async () => {
      return new Promise((res, rej) => {
        setTimeout(() => rej('The system crashed and burned and is still on fire'), 5000);
      });
    });
  }
}
</script>

<style lang="scss" scoped>
.red { color: red; }
.green { color: green; }
.uppercase { text-transform: uppercase; }
.strong { font-weight: bold; font-size: 1.3em; }
</style>

