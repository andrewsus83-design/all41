export { inngest } from "./inngest";
export { graphAiEdges } from "./graphAiEdges";
export { runDueInstances } from "./runDueInstances";
export { dailyOps } from "./dailyOpsFunction";

import { graphAiEdges } from "./graphAiEdges";
import { runDueInstances } from "./runDueInstances";
import { dailyOps } from "./dailyOpsFunction";

export const functions = [graphAiEdges, runDueInstances, dailyOps];
