"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LangfuseAiAgent = void 0;
const descriptions_1 = require("./src/utils/descriptions");
const description_1 = require("./V2/description");
const execute_1 = require("./V2/execute");
const utils_1 = require("./V2/utils");
class LangfuseAiAgent {
    constructor() {
        this.description = {
            displayName: 'AI Agent with Langfuse',
            name: 'langfuseAiAgent',
            icon: { light: 'file:LangfuseAiAgentLight.icon.svg', dark: 'file:LangfuseAiAgentDark.icon.svg' },
            group: ['transform'],
            description: 'Generates an action plan and executes it. Can use external tools.',
            defaults: {
                name: 'AI Agent with Langfuse',
            },
            version: 2,
            codex: {
                categories: ['AI'],
                subcategories: {
                    AI: ['Agents', 'Root Nodes'],
                },
                resources: {
                    primaryDocumentation: [
                        {
                            url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/',
                        },
                    ],
                },
            },
            inputs: `={{
				((hasOutputParser, needsFallback) => {
					${utils_1.getInputs.toString()};
					return getInputs(true, hasOutputParser, needsFallback);
				})(
					!!$parameter.hasOutputParser, 
					!!$parameter.needsFallback   
					)
			}}`,
            outputs: ['main'],
            credentials: [
                { name: 'langfuseAiAgentApi', required: true },
            ],
            properties: [
                {
                    displayName: 'Tip: Get a feel for agents with our quick <a href="https://docs.n8n.io/advanced-ai/intro-tutorial/" target="_blank">tutorial</a> or see an <a href="/workflows/templates/1954" target="_blank">example</a> of how this node works',
                    name: 'aiAgentStarterCallout',
                    type: 'callout',
                    default: '',
                },
                {
                    displayName: 'Get started faster with our',
                    name: 'preBuiltAgentsCallout',
                    type: 'callout',
                    typeOptions: {
                        calloutAction: {
                            label: 'pre-built agents',
                            icon: 'bot',
                            type: 'openPreBuiltAgentsCollection',
                        },
                    },
                    default: '',
                },
                descriptions_1.promptTypeOptions,
                {
                    ...descriptions_1.textFromPreviousNode,
                    displayOptions: {
                        show: {
                            promptType: ['auto'],
                        },
                    },
                },
                {
                    ...descriptions_1.textInput,
                    displayOptions: {
                        show: {
                            promptType: ['define'],
                        },
                    },
                },
                {
                    displayName: 'Require Specific Output Format',
                    name: 'hasOutputParser',
                    type: 'boolean',
                    default: false,
                    noDataExpression: true,
                },
                {
                    displayName: `Connect an <a data-action='openSelectiveNodeCreator' data-action-parameter-connectiontype='ai_outputParser'>output parser</a> on the canvas to specify the output format you require`,
                    name: 'notice',
                    type: 'notice',
                    default: '',
                    displayOptions: {
                        show: {
                            hasOutputParser: [true],
                        },
                    },
                },
                {
                    displayName: 'Enable Fallback Model',
                    name: 'needsFallback',
                    type: 'boolean',
                    default: false,
                    noDataExpression: true,
                    displayOptions: {
                        show: {
                            '@version': [{ _cnd: { gte: 2.1 } }],
                        },
                    },
                },
                {
                    displayName: 'Connect an additional language model on the canvas to use it as a fallback if the main model fails',
                    name: 'fallbackNotice',
                    type: 'notice',
                    default: '',
                    displayOptions: {
                        show: {
                            needsFallback: [true],
                        },
                    },
                },
                {
                    displayName: 'Langfuse Metadata',
                    name: 'langfuseMetadata',
                    type: 'collection',
                    default: {},
                    options: [
                        {
                            displayName: 'Custom Metadata (JSON)',
                            name: 'customMetadata',
                            type: 'json',
                            default: `{
	"project": "example-project",
	"env": "dev",
	"workflow": "main-flow"
}`,
                            description: 'Optional. Pass extra metadata to be attached to Langfuse traces.',
                        },
                        {
                            displayName: 'Session ID',
                            name: 'sessionId',
                            type: 'string',
                            default: 'default-session-id',
                            description: 'Used in Langfuse trace grouping (langfuse_session_id)',
                        },
                        {
                            displayName: 'User ID',
                            name: 'userId',
                            type: 'string',
                            default: '',
                            description: 'Optional: for trace attribution (langfuse_user_id)',
                        },
                    ],
                },
                ...(0, description_1.getToolsAgentProperties)({ withStreaming: true }),
            ],
            hints: [
                {
                    message: 'You are using streaming responses. Make sure to set the response mode to "Streaming Response" on the connected trigger node.',
                    type: 'warning',
                    location: 'outputPane',
                    whenToDisplay: 'afterExecution',
                    displayCondition: '={{ $parameter["enableStreaming"] === true }}',
                },
            ],
        };
    }
    async execute() {
        return await execute_1.toolsAgentExecute.call(this);
    }
}
exports.LangfuseAiAgent = LangfuseAiAgent;
//# sourceMappingURL=LangfuseAiAgent.node.js.map