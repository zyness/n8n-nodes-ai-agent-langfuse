"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LangfuseAiAgent = void 0;
class LangfuseAiAgent {
    constructor() {
        this.name = 'langfuseAiAgentApi';
        this.icon = 'file:LangfuseAiAgent.icon.svg';
        this.displayName = 'Langfuse API';
        this.documentationUrl = 'https://langfuse.com/docs/api#authentication';
        this.properties = [
            {
                displayName: 'Langfuse Base URL',
                name: 'url',
                type: 'string',
                default: 'https://cloud.langfuse.com',
                description: 'The base URL for your Langfuse instance',
            },
            {
                displayName: 'Public Key',
                name: 'publicKey',
                type: 'string',
                typeOptions: { password: true },
                required: true,
                default: '',
                description: 'Langfuse public API key (used as username for Basic Auth)',
            },
            {
                displayName: 'Secret Key',
                name: 'secretKey',
                type: 'string',
                typeOptions: {
                    password: true,
                },
                required: true,
                default: '',
                description: 'Langfuse secret API key (used as password for Basic Auth)',
            },
        ];
        this.authenticate = {
            type: 'generic',
            properties: {
                auth: {
                    username: '={{$credentials.publicKey}}',
                    password: '={{$credentials.secretKey}}',
                },
            },
        };
        this.test = {
            request: {
                baseURL: '={{$credentials.url}}',
                url: '/api/public/projects',
                method: 'GET',
            },
        };
    }
}
exports.LangfuseAiAgent = LangfuseAiAgent;
//# sourceMappingURL=LangfuseAiAgent.credentials.js.map