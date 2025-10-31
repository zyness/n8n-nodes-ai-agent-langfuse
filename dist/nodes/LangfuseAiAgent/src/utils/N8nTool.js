"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.N8nTool = exports.prepareFallbackToolDescription = void 0;
const tools_1 = require("@langchain/core/tools");
const output_parsers_1 = require("langchain/output_parsers");
const n8n_workflow_1 = require("n8n-workflow");
const zod_1 = require("zod");
const getSimplifiedType = (schema) => {
    if (schema instanceof zod_1.ZodObject) {
        return 'object';
    }
    else if (schema instanceof zod_1.ZodNumber) {
        return 'number';
    }
    else if (schema instanceof zod_1.ZodBoolean) {
        return 'boolean';
    }
    else if (schema instanceof zod_1.ZodNullable || schema instanceof zod_1.ZodOptional) {
        return getSimplifiedType(schema.unwrap());
    }
    return 'string';
};
const getParametersDescription = (parameters) => parameters
    .map(([name, schema]) => { var _a; return `${name}: (description: ${(_a = schema.description) !== null && _a !== void 0 ? _a : ''}, type: ${getSimplifiedType(schema)}, required: ${!schema.isOptional()})`; })
    .join(',\n ');
const prepareFallbackToolDescription = (toolDescription, schema) => {
    let description = `${toolDescription}`;
    const toolParameters = Object.entries(schema.shape);
    if (toolParameters.length) {
        description += `
Tool expects valid stringified JSON object with ${toolParameters.length} properties.
Property names with description, type and required status:
${getParametersDescription(toolParameters)}
ALL parameters marked as required must be provided`;
    }
    return description;
};
exports.prepareFallbackToolDescription = prepareFallbackToolDescription;
class N8nTool extends tools_1.DynamicStructuredTool {
    constructor(context, fields) {
        super(fields);
        this.context = context;
    }
    asDynamicTool() {
        const { name, func, schema, context, description } = this;
        const parser = new output_parsers_1.StructuredOutputParser(schema);
        const wrappedFunc = async function (query) {
            let parsedQuery;
            try {
                parsedQuery = await parser.parse(query);
            }
            catch (e) {
                let dataFromModel;
                try {
                    dataFromModel = (0, n8n_workflow_1.jsonParse)(query, { acceptJSObject: true });
                }
                catch (error) {
                    if (Object.keys(schema.shape).length === 1) {
                        const parameterName = Object.keys(schema.shape)[0];
                        dataFromModel = { [parameterName]: query };
                    }
                    else {
                        throw new n8n_workflow_1.NodeOperationError(context.getNode(), `Input is not a valid JSON: ${error.message}`);
                    }
                }
                parsedQuery = schema.parse(dataFromModel);
            }
            try {
                const result = await func(parsedQuery);
                return result;
            }
            catch (e) {
                const { index } = context.addInputData('ai_tool', [[{ json: { query } }]]);
                void context.addOutputData('ai_tool', index, e);
                return e.toString();
            }
        };
        return new tools_1.DynamicTool({
            name,
            description: (0, exports.prepareFallbackToolDescription)(description, schema),
            func: wrappedFunc,
        });
    }
}
exports.N8nTool = N8nTool;
//# sourceMappingURL=N8nTool.js.map