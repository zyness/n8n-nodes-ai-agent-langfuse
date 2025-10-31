"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.N8nStructuredOutputParser = void 0;
const output_parsers_1 = require("langchain/output_parsers");
const get_1 = __importDefault(require("lodash/get"));
const n8n_workflow_1 = require("n8n-workflow");
const zod_1 = require("zod");
const helpers_1 = require("../helpers");
const STRUCTURED_OUTPUT_KEY = '__structured__output';
const STRUCTURED_OUTPUT_OBJECT_KEY = '__structured__output__object';
const STRUCTURED_OUTPUT_ARRAY_KEY = '__structured__output__array';
class N8nStructuredOutputParser extends output_parsers_1.StructuredOutputParser {
    constructor(context, zodSchema) {
        super(zodSchema);
        this.context = context;
        this.lc_namespace = ['langchain', 'output_parsers', 'structured'];
    }
    async parse(text, _callbacks, errorMapper) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const { index } = this.context.addInputData(n8n_workflow_1.NodeConnectionTypes.AiOutputParser, [
            [{ json: { action: 'parse', text } }],
        ]);
        try {
            const jsonString = text.includes('```') ? text.split(/```(?:json)?/)[1] : text;
            const json = JSON.parse(jsonString.trim());
            const parsed = await this.schema.parseAsync(json);
            let result = ((_c = (_b = (_a = (0, get_1.default)(parsed, [STRUCTURED_OUTPUT_KEY, STRUCTURED_OUTPUT_OBJECT_KEY])) !== null && _a !== void 0 ? _a : (0, get_1.default)(parsed, [STRUCTURED_OUTPUT_KEY, STRUCTURED_OUTPUT_ARRAY_KEY])) !== null && _b !== void 0 ? _b : (0, get_1.default)(parsed, STRUCTURED_OUTPUT_KEY)) !== null && _c !== void 0 ? _c : parsed);
            result = (0, helpers_1.unwrapNestedOutput)(result);
            (0, helpers_1.logAiEvent)(this.context, 'ai-output-parsed', { text, response: result });
            this.context.addOutputData(n8n_workflow_1.NodeConnectionTypes.AiOutputParser, index, [
                [{ json: { action: 'parse', response: result } }],
            ]);
            return result;
        }
        catch (e) {
            const nodeError = new n8n_workflow_1.NodeOperationError(this.context.getNode(), "Model output doesn't fit required format", {
                description: "To continue the execution when this happens, change the 'On Error' parameter in the root node's settings",
            });
            if (e instanceof SyntaxError) {
                nodeError.context.outputParserFailReason = 'Invalid JSON in model output';
            }
            else if ((typeof text === 'string' && text.trim() === '{}') ||
                (e instanceof zod_1.z.ZodError &&
                    ((_d = e.issues) === null || _d === void 0 ? void 0 : _d[0]) &&
                    ((_e = e.issues) === null || _e === void 0 ? void 0 : _e[0].code) === 'invalid_type' &&
                    ((_g = (_f = e.issues) === null || _f === void 0 ? void 0 : _f[0].path) === null || _g === void 0 ? void 0 : _g[0]) === 'output' &&
                    ((_h = e.issues) === null || _h === void 0 ? void 0 : _h[0].expected) === 'object' &&
                    ((_j = e.issues) === null || _j === void 0 ? void 0 : _j[0].received) === 'undefined')) {
                nodeError.context.outputParserFailReason = 'Model output wrapper is an empty object';
            }
            else if (e instanceof zod_1.z.ZodError) {
                nodeError.context.outputParserFailReason =
                    'Model output does not match the expected schema';
            }
            (0, helpers_1.logAiEvent)(this.context, 'ai-output-parsed', {
                text,
                response: (_k = e.message) !== null && _k !== void 0 ? _k : e,
            });
            this.context.addOutputData(n8n_workflow_1.NodeConnectionTypes.AiOutputParser, index, nodeError);
            if (errorMapper) {
                throw errorMapper(e);
            }
            throw nodeError;
        }
    }
    static async fromZodJsonSchema(zodSchema, nodeVersion, context) {
        let returnSchema;
        if (nodeVersion === 1) {
            returnSchema = zod_1.z.object({
                [STRUCTURED_OUTPUT_KEY]: zod_1.z
                    .object({
                    [STRUCTURED_OUTPUT_OBJECT_KEY]: zodSchema.optional(),
                    [STRUCTURED_OUTPUT_ARRAY_KEY]: zod_1.z.array(zodSchema).optional(),
                })
                    .describe(`Wrapper around the output data. It can only contain ${STRUCTURED_OUTPUT_OBJECT_KEY} or ${STRUCTURED_OUTPUT_ARRAY_KEY} but never both.`)
                    .refine((data) => {
                    return (Boolean(data[STRUCTURED_OUTPUT_OBJECT_KEY]) !==
                        Boolean(data[STRUCTURED_OUTPUT_ARRAY_KEY]));
                }, {
                    message: 'One and only one of __structured__output__object and __structured__output__array should be present.',
                    path: [STRUCTURED_OUTPUT_KEY],
                }),
            });
        }
        else if (nodeVersion < 1.3) {
            returnSchema = zod_1.z.object({
                output: zodSchema.optional(),
            });
        }
        else {
            returnSchema = zod_1.z.object({
                output: zodSchema,
            });
        }
        return new N8nStructuredOutputParser(context, returnSchema);
    }
    getSchema() {
        return this.schema;
    }
}
exports.N8nStructuredOutputParser = N8nStructuredOutputParser;
//# sourceMappingURL=N8nStructuredOutputParser.js.map