"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConnectedTools = void 0;
exports.getMetadataFiltersValues = getMetadataFiltersValues;
exports.isBaseChatMemory = isBaseChatMemory;
exports.isBaseChatMessageHistory = isBaseChatMessageHistory;
exports.isChatInstance = isChatInstance;
exports.isToolsInstance = isToolsInstance;
exports.getPromptInputByType = getPromptInputByType;
exports.getSessionId = getSessionId;
exports.logAiEvent = logAiEvent;
exports.serializeChatHistory = serializeChatHistory;
exports.escapeSingleCurlyBrackets = escapeSingleCurlyBrackets;
exports.unwrapNestedOutput = unwrapNestedOutput;
exports.hasLongSequentialRepeat = hasLongSequentialRepeat;
const agents_1 = require("langchain/agents");
const n8n_workflow_1 = require("n8n-workflow");
const N8nTool_1 = require("./N8nTool");
function hasMethods(obj, ...methodNames) {
    return methodNames.every((methodName) => typeof obj === 'object' &&
        obj !== null &&
        methodName in obj &&
        typeof obj[methodName] === 'function');
}
function getMetadataFiltersValues(ctx, itemIndex) {
    const options = ctx.getNodeParameter('options', itemIndex, {});
    if (options.metadata) {
        const { metadataValues: metadata } = options.metadata;
        if (metadata.length > 0) {
            return metadata.reduce((acc, { name, value }) => ({ ...acc, [name]: value }), {});
        }
    }
    if (options.searchFilterJson) {
        return ctx.getNodeParameter('options.searchFilterJson', itemIndex, '', {
            ensureType: 'object',
        });
    }
    return undefined;
}
function isBaseChatMemory(obj) {
    return hasMethods(obj, 'loadMemoryVariables', 'saveContext');
}
function isBaseChatMessageHistory(obj) {
    return hasMethods(obj, 'getMessages', 'addMessage');
}
function isChatInstance(model) {
    var _a;
    const namespace = (_a = model === null || model === void 0 ? void 0 : model.lc_namespace) !== null && _a !== void 0 ? _a : [];
    return namespace.includes('chat_models');
}
function isToolsInstance(model) {
    var _a;
    const namespace = (_a = model === null || model === void 0 ? void 0 : model.lc_namespace) !== null && _a !== void 0 ? _a : [];
    return namespace.includes('tools');
}
function getPromptInputByType(options) {
    const { ctx, i, promptTypeKey, inputKey } = options;
    const promptType = ctx.getNodeParameter(promptTypeKey, i, 'define');
    let input;
    if (promptType === 'auto') {
        input = ctx.evaluateExpression('{{ $json["chatInput"] }}', i);
    }
    else {
        input = ctx.getNodeParameter(inputKey, i);
    }
    if (input === undefined) {
        throw new n8n_workflow_1.NodeOperationError(ctx.getNode(), 'No prompt specified', {
            description: "Expected to find the prompt in an input field called 'chatInput' (this is what the chat trigger node outputs). To use something else, change the 'Prompt' parameter",
        });
    }
    return input;
}
function getSessionId(ctx, itemIndex, selectorKey = 'sessionIdType', autoSelect = 'fromInput', customKey = 'sessionKey') {
    var _a;
    let sessionId = '';
    const selectorType = ctx.getNodeParameter(selectorKey, itemIndex);
    if (selectorType === autoSelect) {
        if ('getBodyData' in ctx) {
            const bodyData = (_a = ctx.getBodyData()) !== null && _a !== void 0 ? _a : {};
            sessionId = bodyData.sessionId;
        }
        else {
            sessionId = ctx.evaluateExpression('{{ $json.sessionId }}', itemIndex);
            if (!sessionId || sessionId === undefined) {
                try {
                    const chatTrigger = ctx.getChatTrigger();
                    if (chatTrigger) {
                        sessionId = ctx.evaluateExpression(`{{ $('${chatTrigger.name}').first().json.sessionId }}`, itemIndex);
                    }
                }
                catch (error) { }
            }
        }
        if (sessionId === '' || sessionId === undefined) {
            throw new n8n_workflow_1.NodeOperationError(ctx.getNode(), 'No session ID found', {
                description: "Expected to find the session ID in an input field called 'sessionId' (this is what the chat trigger node outputs). To use something else, change the 'Session ID' parameter",
                itemIndex,
            });
        }
    }
    else {
        sessionId = ctx.getNodeParameter(customKey, itemIndex, '');
        if (sessionId === '' || sessionId === undefined) {
            throw new n8n_workflow_1.NodeOperationError(ctx.getNode(), 'Key parameter is empty', {
                description: "Provide a key to use as session ID in the 'Key' parameter or use the 'Connected Chat Trigger Node' option to use the session ID from your Chat Trigger",
                itemIndex,
            });
        }
    }
    return sessionId;
}
function logAiEvent(executeFunctions, event, data) {
    try {
        executeFunctions.logAiEvent(event, data ? (0, n8n_workflow_1.jsonStringify)(data) : undefined);
    }
    catch (error) {
        executeFunctions.logger.debug(`Error logging AI event: ${event}`);
    }
}
function serializeChatHistory(chatHistory) {
    return chatHistory
        .map((chatMessage) => {
        if (chatMessage._getType() === 'human') {
            return `Human: ${chatMessage.content}`;
        }
        else if (chatMessage._getType() === 'ai') {
            return `Assistant: ${chatMessage.content}`;
        }
        else {
            return `${chatMessage.content}`;
        }
    })
        .join('\n');
}
function escapeSingleCurlyBrackets(text) {
    if (text === undefined)
        return undefined;
    let result = text;
    result = result
        .replace(/(?<!{){{{(?!{)/g, '{{{{')
        .replace(/(?<!})}}}(?!})/g, '}}}}')
        .replace(/(?<!{){(?!{)/g, '{{')
        .replace(/(?<!})}(?!})/g, '}}');
    return result;
}
const getConnectedTools = async (ctx, enforceUniqueNames, convertStructuredTool = true, escapeCurlyBrackets = false) => {
    var _a, _b;
    const connectedTools = ((_a = (await ctx.getInputConnectionData('ai_tool', 0))) !== null && _a !== void 0 ? _a : []).flatMap((toolOrToolkit) => {
        if (toolOrToolkit instanceof agents_1.Toolkit) {
            return toolOrToolkit.getTools();
        }
        return toolOrToolkit;
    });
    if (!enforceUniqueNames)
        return connectedTools;
    const seenNames = new Set();
    const finalTools = [];
    for (const tool of connectedTools) {
        const { name } = tool;
        if (seenNames.has(name)) {
            throw new n8n_workflow_1.NodeOperationError(ctx.getNode(), `You have multiple tools with the same name: '${name}', please rename them to avoid conflicts`);
        }
        seenNames.add(name);
        if (escapeCurlyBrackets) {
            tool.description = (_b = escapeSingleCurlyBrackets(tool.description)) !== null && _b !== void 0 ? _b : tool.description;
        }
        if (convertStructuredTool && tool instanceof N8nTool_1.N8nTool) {
            finalTools.push(tool.asDynamicTool());
        }
        else {
            finalTools.push(tool);
        }
    }
    return finalTools;
};
exports.getConnectedTools = getConnectedTools;
function unwrapNestedOutput(output) {
    if ('output' in output &&
        Object.keys(output).length === 1 &&
        typeof output.output === 'object' &&
        output.output !== null &&
        'output' in output.output &&
        Object.keys(output.output).length === 1) {
        return output.output;
    }
    return output;
}
function hasLongSequentialRepeat(text, threshold = 1000) {
    try {
        if (text === null ||
            typeof text !== 'string' ||
            text.length === 0 ||
            threshold <= 0 ||
            text.length < threshold) {
            return false;
        }
        const iterator = text[Symbol.iterator]();
        let prev = iterator.next();
        if (prev.done) {
            return false;
        }
        let count = 1;
        for (const char of iterator) {
            if (char === prev.value) {
                count++;
                if (count >= threshold) {
                    return true;
                }
            }
            else {
                count = 1;
                prev = { value: char, done: false };
            }
        }
        return false;
    }
    catch (error) {
        return false;
    }
}
//# sourceMappingURL=helpers.js.map