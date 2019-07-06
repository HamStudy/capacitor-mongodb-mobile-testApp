<template>
  <div>
    <div>Test results:</div>
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
import {executeTests} from './dbTests';

function pause(ms: number) {
    return new Promise<true>((res, rej) => setTimeout(() => res(true), ms));
}

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
      res.text = (e && e.message) ? e.message : String(e);
      if (e && e.stack) {
        console.warn(e, e.stack);
      }
    }
  }

  async created() {
    await executeTests(this.runTest.bind(this));
  }
}
</script>

<style lang="scss" scoped>
.red { color: red; }
.green { color: green; }
.uppercase { text-transform: uppercase; }
.strong { font-weight: bold; }
</style>

