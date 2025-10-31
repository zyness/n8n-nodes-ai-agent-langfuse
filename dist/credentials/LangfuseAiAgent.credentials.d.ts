import { ICredentialType, INodeProperties, IAuthenticateGeneric, ICredentialTestRequest } from 'n8n-workflow';
export declare class LangfuseAiAgent implements ICredentialType {
    name: string;
    icon: "file:LangfuseAiAgent.icon.svg";
    displayName: string;
    documentationUrl: string;
    properties: INodeProperties[];
    authenticate: IAuthenticateGeneric;
    test: ICredentialTestRequest;
}
