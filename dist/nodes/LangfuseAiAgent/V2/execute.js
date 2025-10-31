"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolsAgentExecute = toolsAgentExecute;
const runnables_1 = require("@langchain/core/runnables");
const agents_1 = require("langchain/agents");
const omit_1 = __importDefault(require("lodash/omit"));
const n8n_workflow_1 = require("n8n-workflow");
const node_assert_1 = __importDefault(require("node:assert"));
const langfuse_langchain_1 = require("langfuse-langchain");
const helpers_1 = require("../src/utils/helpers");
const N8nOutputParser_1 = require("../src/utils/N8nOutputParser");
const common_1 = require("../src/utils/common");
const prompt_1 = require("../src/utils/prompt");
function createAgentExecutor(model, tools, prompt, options, outputParser, memory, fallbackModel, langfuseHandler) {
    var _a;
    const callbacks = langfuseHandler ? [langfuseHandler] : [];
    const agent = (0, agents_1.createToolCallingAgent)({
        llm: model,
        tools,
        prompt,
        streamRunnable: false,
    });
    let fallbackAgent;
    if (fallbackModel) {
        fallbackAgent = (0, agents_1.createToolCallingAgent)({
            llm: fallbackModel,
            tools,
            prompt,
            streamRunnable: false,
        });
    }
    const runnableAgent = runnables_1.RunnableSequence.from([
        fallbackAgent ? agent.withFallbacks([fallbackAgent]) : agent,
        (0, common_1.getAgentStepsParser)(outputParser, memory),
        common_1.fixEmptyContentMessage,
    ]);
    runnableAgent.singleAction = false;
    runnableAgent.streamRunnable = false;
    return agents_1.AgentExecutor.fromAgentAndTools({
        agent: runnableAgent,
        memory,
        tools,
        returnIntermediateSteps: options.returnIntermediateSteps === true,
        maxIterations: (_a = options.maxIterations) !== null && _a !== void 0 ? _a : 10,
        callbacks,
    });
}
async function processEventStream(ctx, eventStream, itemIndex, returnIntermediateSteps = false) {
    var _a;
    const agentResult = {
        output: '',
    };
    if (returnIntermediateSteps) {
        agentResult.intermediateSteps = [];
    }
    ctx.sendChunk('begin', itemIndex);
    for await (const event of eventStream) {
        switch (event.event) {
            case 'on_chat_model_stream':
                const chunk = (_a = event.data) === null || _a === void 0 ? void 0 : _a.chunk;
                if (chunk === null || chunk === void 0 ? void 0 : chunk.content) {
                    const chunkContent = chunk.content;
                    let chunkText = '';
                    if (Array.isArray(chunkContent)) {
                        for (const message of chunkContent) {
                            chunkText += message === null || message === void 0 ? void 0 : message.text;
                        }
                    }
                    else if (typeof chunkContent === 'string') {
                        chunkText = chunkContent;
                    }
                    ctx.sendChunk('item', itemIndex, chunkText);
                    agentResult.output += chunkText;
                }
                break;
            case 'on_chat_model_end':
                if (returnIntermediateSteps && event.data) {
                    const chatModelData = event.data;
                    const output = chatModelData.output;
                    if ((output === null || output === void 0 ? void 0 : output.tool_calls) && output.tool_calls.length > 0) {
                        for (const toolCall of output.tool_calls) {
                            agentResult.intermediateSteps.push({
                                action: {
                                    tool: toolCall.name,
                                    toolInput: toolCall.args,
                                    log: output.content ||
                                        `Calling ${toolCall.name} with input: ${JSON.stringify(toolCall.args)}`,
                                    messageLog: [output],
                                    toolCallId: toolCall.id,
                                    type: toolCall.type,
                                },
                            });
                        }
                    }
                }
                break;
            case 'on_tool_end':
                if (returnIntermediateSteps && event.data && agentResult.intermediateSteps.length > 0) {
                    const toolData = event.data;
                    const matchingStep = agentResult.intermediateSteps.find((step) => !step.observation && step.action.tool === event.name);
                    if (matchingStep) {
                        matchingStep.observation = toolData.output;
                    }
                }
                break;
            default:
                break;
        }
    }
    ctx.sendChunk('end', itemIndex);
    return agentResult;
}
async function toolsAgentExecute() {
    this.logger.debug('Executing Tools Agent V2');
    const returnData = [];
    const items = this.getInputData();
    const batchSize = this.getNodeParameter('options.batching.batchSize', 0, 1);
    const delayBetweenBatches = this.getNodeParameter('options.batching.delayBetweenBatches', 0, 0);
    const needsFallback = this.getNodeParameter('needsFallback', 0, false);
    const memory = await (0, common_1.getOptionalMemory)(this);
    const model = await (0, common_1.getChatModel)(this, 0);
    (0, node_assert_1.default)(model, 'Please connect a model to the Chat Model input');
    const fallbackModel = needsFallback ? await (0, common_1.getChatModel)(this, 1) : null;
    if (needsFallback && !fallbackModel) {
        throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Please connect a model to the Fallback Model input or disable the fallback option');
    }
    const enableStreaming = this.getNodeParameter('options.enableStreaming', 0, true);
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchPromises = batch.map(async (_item, batchItemIndex) => {
            var _a, _b, _c, _d;
            const itemIndex = i + batchItemIndex;
            const input = (0, helpers_1.getPromptInputByType)({
                ctx: this,
                i: itemIndex,
                inputKey: 'text',
                promptTypeKey: 'promptType',
            });
            if (input === undefined) {
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'The "text" parameter is empty.');
            }
            const outputParser = await (0, N8nOutputParser_1.getOptionalOutputParser)(this, itemIndex);
            const tools = await (0, common_1.getTools)(this, outputParser);
            const options = this.getNodeParameter('options', itemIndex, {});
            const wrappedTools = [];
            for (const t of tools) {
                if ('tools' in t && Array.isArray(t.tools)) {
                    const innerTools = t.tools;
                    wrappedTools.push(...innerTools);
                    continue;
                }
                wrappedTools.push(t);
            }
            const toolsFinal = wrappedTools;
            const langfuseCreds = await this.getCredentials('langfuseCustomApi');
            const rawMetadata = this.getNodeParameter('langfuseMetadata', itemIndex, {});
            let parsedCustomMetadata;
            if (typeof rawMetadata.customMetadata === 'string') {
                try {
                    parsedCustomMetadata = JSON.parse(rawMetadata.customMetadata);
                }
                catch (e) {
                    this.logger.warn('Invalid JSON in Langfuse metadata, ignoring customMetadata.');
                }
            }
            else {
                parsedCustomMetadata = rawMetadata.customMetadata;
            }
            const langfuseMetadata = {
                customMetadata: parsedCustomMetadata,
                sessionId: rawMetadata.sessionId,
                userId: rawMetadata.userId,
            };
            const langfuseHandler = new langfuse_langchain_1.CallbackHandler({
                publicKey: langfuseCreds.publicKey,
                secretKey: langfuseCreds.secretKey,
                baseUrl: (_a = langfuseCreds.url) !== null && _a !== void 0 ? _a : process.env.LANGFUSE_HOST,
                sessionId: langfuseMetadata.sessionId,
                userId: langfuseMetadata.userId,
                metadata: langfuseMetadata.customMetadata,
            });
            const messages = await (0, common_1.prepareMessages)(this, itemIndex, {
                systemMessage: options.systemMessage,
                passthroughBinaryImages: (_b = options.passthroughBinaryImages) !== null && _b !== void 0 ? _b : true,
                outputParser,
            });
            const prompt = (0, common_1.preparePrompt)(messages);
            const executor = createAgentExecutor(model, toolsFinal, prompt, options, outputParser, memory, fallbackModel, langfuseHandler);
            const invokeParams = {
                input,
                system_message: (_c = options.systemMessage) !== null && _c !== void 0 ? _c : prompt_1.SYSTEM_MESSAGE
            };
            const executeOptions = {
                signal: this.getExecutionCancelSignal(),
                callbacks: [langfuseHandler],
                metadata: {
                    sessionId: langfuseMetadata.sessionId,
                    userId: langfuseMetadata.userId,
                    ...langfuseMetadata.customMetadata,
                },
            };
            const isStreamingAvailable = 'isStreaming' in this ? (_d = this.isStreaming) === null || _d === void 0 ? void 0 : _d.call(this) : undefined;
            if ('isStreaming' in this &&
                enableStreaming &&
                isStreamingAvailable &&
                this.getNode().typeVersion >= 2.1) {
                const chatHistory = await (memory === null || memory === void 0 ? void 0 : memory.chatHistory.getMessages());
                const eventStream = executor.streamEvents({
                    ...invokeParams,
                    chat_history: chatHistory !== null && chatHistory !== void 0 ? chatHistory : undefined,
                }, {
                    version: 'v2',
                    ...executeOptions,
                });
                return await processEventStream(this, eventStream, itemIndex, options.returnIntermediateSteps);
            }
            else {
                return await executor.invoke(invokeParams, executeOptions);
            }
        });
        const batchResults = await Promise.allSettled(batchPromises);
        const outputParser = await (0, N8nOutputParser_1.getOptionalOutputParser)(this, 0);
        batchResults.forEach((result, index) => {
            var _a;
            const itemIndex = i + index;
            if (result.status === 'rejected') {
                const error = result.reason;
                if (this.continueOnFail()) {
                    returnData.push({
                        json: { error: error.message },
                        pairedItem: { item: itemIndex },
                    });
                    return;
                }
                else {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), error);
                }
            }
            const response = result.value;
            if (memory && outputParser) {
                const parsedOutput = (0, n8n_workflow_1.jsonParse)(response.output);
                response.output = (_a = parsedOutput === null || parsedOutput === void 0 ? void 0 : parsedOutput.output) !== null && _a !== void 0 ? _a : parsedOutput;
            }
            const itemResult = {
                json: (0, omit_1.default)(response, 'system_message', 'input', 'chat_history', 'agent_scratchpad'),
                pairedItem: { item: itemIndex },
            };
            returnData.push(itemResult);
        });
        if (i + batchSize < items.length && delayBetweenBatches > 0) {
            await (0, n8n_workflow_1.sleep)(delayBetweenBatches);
        }
    }
    return [returnData];
}
//# sourceMappingURL=execute.js.map