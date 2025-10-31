"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgentStepsParser = void 0;
exports.getOutputParserSchema = getOutputParserSchema;
exports.extractBinaryMessages = extractBinaryMessages;
exports.fixEmptyContentMessage = fixEmptyContentMessage;
exports.handleAgentFinishOutput = handleAgentFinishOutput;
exports.handleParsedStepOutput = handleParsedStepOutput;
exports.getChatModel = getChatModel;
exports.getOptionalMemory = getOptionalMemory;
exports.getTools = getTools;
exports.prepareMessages = prepareMessages;
exports.preparePrompt = preparePrompt;
const messages_1 = require("@langchain/core/messages");
const prompts_1 = require("@langchain/core/prompts");
const tools_1 = require("langchain/tools");
const n8n_workflow_1 = require("n8n-workflow");
const zod_1 = require("zod");
const helpers_1 = require("./helpers");
function getOutputParserSchema(outputParser) {
    var _a;
    const schema = (_a = outputParser.getSchema()) !== null && _a !== void 0 ? _a : zod_1.z.object({ text: zod_1.z.string() });
    return schema;
}
async function extractBinaryMessages(ctx, itemIndex) {
    var _a, _b, _c;
    const binaryData = (_c = (_b = (_a = ctx.getInputData()) === null || _a === void 0 ? void 0 : _a[itemIndex]) === null || _b === void 0 ? void 0 : _b.binary) !== null && _c !== void 0 ? _c : {};
    const binaryMessages = await Promise.all(Object.values(binaryData)
        .filter((data) => data.mimeType.startsWith('image/'))
        .map(async (data) => {
        let binaryUrlString;
        if (data.id) {
            const binaryBuffer = await ctx.helpers.binaryToBuffer(await ctx.helpers.getBinaryStream(data.id));
            binaryUrlString = `data:${data.mimeType};base64,${Buffer.from(binaryBuffer).toString(n8n_workflow_1.BINARY_ENCODING)}`;
        }
        else {
            binaryUrlString = data.data.includes('base64')
                ? data.data
                : `data:${data.mimeType};base64,${data.data}`;
        }
        return {
            type: 'image_url',
            image_url: {
                url: binaryUrlString,
            },
        };
    }));
    return new messages_1.HumanMessage({
        content: [...binaryMessages],
    });
}
function fixEmptyContentMessage(steps) {
    if (!Array.isArray(steps))
        return steps;
    steps.forEach((step) => {
        if ('messageLog' in step && step.messageLog !== undefined) {
            if (Array.isArray(step.messageLog)) {
                step.messageLog.forEach((message) => {
                    if ('content' in message && Array.isArray(message.content)) {
                        message.content.forEach((content) => {
                            if (content.input === '') {
                                content.input = {};
                            }
                        });
                    }
                });
            }
        }
    });
    return steps;
}
function handleAgentFinishOutput(steps) {
    var _a;
    const agentFinishSteps = steps;
    if (agentFinishSteps.returnValues) {
        const isMultiOutput = Array.isArray((_a = agentFinishSteps.returnValues) === null || _a === void 0 ? void 0 : _a.output);
        if (isMultiOutput) {
            const multiOutputSteps = agentFinishSteps.returnValues.output;
            const isTextOnly = multiOutputSteps.every((output) => 'text' in output);
            if (isTextOnly) {
                agentFinishSteps.returnValues.output = multiOutputSteps
                    .map((output) => output.text)
                    .join('\n')
                    .trim();
            }
            return agentFinishSteps;
        }
    }
    return agentFinishSteps;
}
function handleParsedStepOutput(output, memory) {
    return {
        returnValues: memory ? { output: JSON.stringify(output) } : output,
        log: 'Final response formatted',
    };
}
const getAgentStepsParser = (outputParser, memory) => async (steps) => {
    if (Array.isArray(steps)) {
        const responseParserTool = steps.find((step) => step.tool === 'format_final_json_response');
        if (responseParserTool && outputParser) {
            const toolInput = responseParserTool.toolInput;
            const parserInput = toolInput instanceof Object ? JSON.stringify(toolInput) : toolInput;
            const returnValues = (await outputParser.parse(parserInput));
            return handleParsedStepOutput(returnValues, memory);
        }
    }
    if (outputParser && typeof steps === 'object' && steps.returnValues) {
        const finalResponse = steps.returnValues;
        let parserInput;
        if (finalResponse instanceof Object) {
            if ('output' in finalResponse) {
                try {
                    parserInput = JSON.stringify({ output: (0, n8n_workflow_1.jsonParse)(finalResponse.output) });
                }
                catch (error) {
                    parserInput = finalResponse.output;
                }
            }
            else {
                parserInput = JSON.stringify(finalResponse);
            }
        }
        else {
            parserInput = finalResponse;
        }
        const returnValues = (await outputParser.parse(parserInput));
        return handleParsedStepOutput(returnValues, memory);
    }
    return handleAgentFinishOutput(steps);
};
exports.getAgentStepsParser = getAgentStepsParser;
async function getChatModel(ctx, index = 0) {
    const connectedModels = await ctx.getInputConnectionData('ai_languageModel', 0);
    let model;
    if (Array.isArray(connectedModels) && index !== undefined) {
        if (connectedModels.length <= index) {
            return undefined;
        }
        const reversedModels = [...connectedModels].reverse();
        model = reversedModels[index];
    }
    else {
        model = connectedModels;
    }
    if (!(0, helpers_1.isChatInstance)(model) || !model.bindTools) {
        throw new n8n_workflow_1.NodeOperationError(ctx.getNode(), 'Tools Agent requires Chat Model which supports Tools calling');
    }
    return model;
}
async function getOptionalMemory(ctx) {
    return (await ctx.getInputConnectionData('ai_memory', 0));
}
async function getTools(ctx, outputParser) {
    const tools = (await (0, helpers_1.getConnectedTools)(ctx, true, false));
    if (outputParser) {
        const schema = getOutputParserSchema(outputParser);
        const structuredOutputParserTool = new tools_1.DynamicStructuredTool({
            schema,
            name: 'format_final_json_response',
            description: 'Use this tool to format your final response to the user in a structured JSON format. This tool validates your output against a schema to ensure it meets the required format. ONLY use this tool when you have completed all necessary reasoning and are ready to provide your final answer. Do not use this tool for intermediate steps or for asking questions. The output from this tool will be directly returned to the user.',
            func: async () => '',
        });
        tools.push(structuredOutputParserTool);
    }
    return tools;
}
async function prepareMessages(ctx, itemIndex, options) {
    var _a, _b, _c;
    const useSystemMessage = (_a = options.systemMessage) !== null && _a !== void 0 ? _a : ctx.getNode().typeVersion < 1.9;
    const messages = [];
    if (useSystemMessage) {
        messages.push(['system', '{system_message}']);
    }
    messages.push(['placeholder', '{chat_history}'], ['human', '{input}']);
    const hasBinaryData = ((_c = (_b = ctx.getInputData()) === null || _b === void 0 ? void 0 : _b[itemIndex]) === null || _c === void 0 ? void 0 : _c.binary) !== undefined;
    if (hasBinaryData && options.passthroughBinaryImages) {
        const binaryMessage = await extractBinaryMessages(ctx, itemIndex);
        if (binaryMessage.content.length !== 0) {
            messages.push(binaryMessage);
        }
        else {
            ctx.logger.debug('Not attaching binary message, since its content was empty');
        }
    }
    messages.push(['placeholder', '{agent_scratchpad}']);
    return messages;
}
function preparePrompt(messages) {
    return prompts_1.ChatPromptTemplate.fromMessages(messages);
}
//# sourceMappingURL=common.js.map