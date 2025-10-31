"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolDescription = exports.textFromPreviousNode = exports.textInput = exports.promptTypeOptions = exports.inputSchemaField = exports.buildInputSchemaField = exports.jsonSchemaExampleField = exports.buildJsonSchemaExampleNotice = exports.buildJsonSchemaExampleField = exports.schemaTypeField = void 0;
exports.schemaTypeField = {
    displayName: 'Schema Type',
    name: 'schemaType',
    type: 'options',
    noDataExpression: true,
    options: [
        {
            name: 'Generate From JSON Example',
            value: 'fromJson',
            description: 'Generate a schema from an example JSON object',
        },
        {
            name: 'Define Using JSON Schema',
            value: 'manual',
            description: 'Define the JSON schema manually',
        },
    ],
    default: 'fromJson',
    description: 'How to specify the schema for the function',
};
const buildJsonSchemaExampleField = (props) => ({
    displayName: 'JSON Example',
    name: 'jsonSchemaExample',
    type: 'json',
    default: `{
	"some_input": "some_value"
}`,
    noDataExpression: true,
    typeOptions: {
        rows: 10,
    },
    displayOptions: {
        show: {
            ...props === null || props === void 0 ? void 0 : props.showExtraProps,
            schemaType: ['fromJson'],
        },
    },
    description: 'Example JSON object to use to generate the schema',
});
exports.buildJsonSchemaExampleField = buildJsonSchemaExampleField;
const buildJsonSchemaExampleNotice = (props) => ({
    displayName: "All properties will be required. To make them optional, use the 'JSON Schema' schema type instead",
    name: 'notice',
    type: 'notice',
    default: '',
    displayOptions: {
        show: {
            ...props === null || props === void 0 ? void 0 : props.showExtraProps,
            schemaType: ['fromJson'],
        },
    },
});
exports.buildJsonSchemaExampleNotice = buildJsonSchemaExampleNotice;
exports.jsonSchemaExampleField = (0, exports.buildJsonSchemaExampleField)();
const buildInputSchemaField = (props) => ({
    displayName: 'Input Schema',
    name: 'inputSchema',
    type: 'json',
    default: `{
"type": "object",
"properties": {
	"some_input": {
		"type": "string",
		"description": "Some input to the function"
		}
	}
}`,
    noDataExpression: false,
    typeOptions: {
        rows: 10,
    },
    displayOptions: {
        show: {
            ...props === null || props === void 0 ? void 0 : props.showExtraProps,
            schemaType: ['manual'],
        },
    },
    description: 'Schema to use for the function',
    hint: 'Use <a target="_blank" href="https://json-schema.org/">JSON Schema</a> format (<a target="_blank" href="https://json-schema.org/learn/miscellaneous-examples.html">examples</a>). $refs syntax is currently not supported.',
});
exports.buildInputSchemaField = buildInputSchemaField;
exports.inputSchemaField = (0, exports.buildInputSchemaField)();
exports.promptTypeOptions = {
    displayName: 'Source for Prompt (User Message)',
    name: 'promptType',
    type: 'options',
    options: [
        {
            name: 'Connected Chat Trigger Node',
            value: 'auto',
            description: "Looks for an input field called 'chatInput' that is coming from a directly connected Chat Trigger",
        },
        {
            name: 'Define Below',
            value: 'define',
            description: 'Use an expression to reference data in previous nodes or enter static text',
        },
    ],
    default: 'auto',
};
exports.textInput = {
    displayName: 'Prompt (User Message)',
    name: 'text',
    type: 'string',
    required: true,
    default: '',
    placeholder: 'e.g. Hello, how can you help me?',
    typeOptions: {
        rows: 2,
    },
};
exports.textFromPreviousNode = {
    displayName: 'Prompt (User Message)',
    name: 'text',
    type: 'string',
    required: true,
    default: '={{ $json.chatInput }}',
    typeOptions: {
        rows: 2,
    },
    disabledOptions: { show: { promptType: ['auto'] } },
};
exports.toolDescription = {
    displayName: 'Description',
    name: 'toolDescription',
    type: 'string',
    default: 'AI Agent that can call other tools',
    required: true,
    typeOptions: { rows: 2 },
    description: 'Explain to the LLM what this tool does, a good, specific description would allow LLMs to produce expected results much more often',
};
//# sourceMappingURL=descriptions.js.map