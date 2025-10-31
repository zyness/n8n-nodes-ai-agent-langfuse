import type { IDisplayOptions, INodeProperties } from 'n8n-workflow';
export declare const metadataFilterField: INodeProperties;
export declare function getTemplateNoticeField(templateId: number): INodeProperties;
export declare function getBatchingOptionFields(displayOptions: IDisplayOptions | undefined, defaultBatchSize?: number): INodeProperties;
type AllowedConnectionTypes = 'ai_agent' | 'ai_chain' | 'ai_document' | 'ai_vectorStore' | 'ai_retriever';
export declare function getConnectionHintNoticeField(connectionTypes: AllowedConnectionTypes[]): INodeProperties;
export {};
