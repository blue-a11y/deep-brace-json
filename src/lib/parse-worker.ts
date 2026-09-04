import type { ParseRequest } from './background-parse';
import { createLargeSample } from './large-sample';
import { parseInput } from './parse';

// 每个请求独占 Worker，完成或取消后由调用方释放；不接触 Store 或持久化。
self.onmessage = (event: MessageEvent<ParseRequest>) => {
  if (typeof event.data === 'string') {
    self.postMessage(parseInput(event.data));
  } else {
    const sampleInput = createLargeSample(event.data.sample);
    self.postMessage({ sampleInput, result: parseInput(sampleInput) });
  }
};
