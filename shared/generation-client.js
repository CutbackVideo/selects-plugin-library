// Paid jobs always cross the canonical run_script boundary. This panel-local
// adapter preserves old saved job IDs while the host owns scope and delivery.
export function sdkGeneration(sdk) {
  if (typeof sdk?.runScript !== "function") return null;
  const run = async (script, summary, allowCommit = false) => {
    const response = await sdk.runScript({ script, summary, allowCommit });
    if (response?.isError) throw new Error(String(response.output || "Generation request failed"));
    return response?.result;
  };
  const job = (scope, id) => `selects.generation.job(${JSON.stringify(id)},${JSON.stringify(scope.projectId)})`;
  return {
    isAvailable: () => true,
    supportsPluginFiles: () => true,
    async submit(request) {
      if (request.batch != null && request.batch !== 1) throw new Error("Submit one generation at a time.");
      const input = {
        projectId: request.scope.projectId, requestKey: request.key,
        modelId: request.modelId, input: request.input, uploads: request.uploads || {},
        outputName: request.outputName, mediaType: request.origin?.tool || "video",
        ...(request.inputMediaSeconds ? { inputMediaSeconds: request.inputMediaSeconds } : {}),
        ...(request.delivery ? { delivery: { folder: request.delivery.pluginFolder } } : {}),
      };
      const result = await run(`const job = await selects.generation.submit(${JSON.stringify(input)}); return {jobId: job.jobId};`, "Start media generation", true);
      if (!result?.jobId) throw new Error("Generation submission is unknown. Resume with the same request key.");
      return { jobIds: [result.jobId] };
    },
    list: scope => run(`return await selects.generation.jobs(${JSON.stringify(scope.projectId)});`, "Read generation progress"),
    cancel: (scope, id) => run(`await ${job(scope, id)}.cancel(); return {requested:true};`, "Cancel generation", true),
    retryDelivery: (scope, id) => run(`await ${job(scope, id)}.retryDelivery(); return {requested:true};`, "Recover generated files", true),
  };
}
