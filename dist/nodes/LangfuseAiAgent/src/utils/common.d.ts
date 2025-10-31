import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, type BaseMessagePromptTemplateLike } from '@langchain/core/prompts';
import type { AgentAction, AgentFinish } from 'langchain/agents';
import type { ToolsAgentAction } from 'langchain/dist/agents/tool_calling/output_parser';
import type { BaseChatMemory } from 'langchain/memory';
import { DynamicStructuredTool, type Tool } from 'langchain/tools';
import type { IExecuteFunctions, ISupplyDataFunctions } from 'n8n-workflow';
import type { ZodObject } from 'zod';
import { type N8nOutputParser } from './N8nOutputParser';
export declare function getOutputParserSchema(outputParser: N8nOutputParser): ZodObject<any, any, any, any>;
export declare function extractBinaryMessages(ctx: IExecuteFunctions | ISupplyDataFunctions, itemIndex: number): Promise<HumanMessage>;
export declare function fixEmptyContentMessage(steps: AgentFinish | ToolsAgentAction[]): AgentFinish | ToolsAgentAction[];
export declare function handleAgentFinishOutput(steps: AgentFinish | AgentAction[]): AgentFinish | AgentAction[];
export declare function handleParsedStepOutput(output: Record<string, unknown>, memory?: BaseChatMemory): {
    returnValues: Record<string, unknown>;
    log: string;
};
export declare const getAgentStepsParser: (outputParser?: N8nOutputParser, memory?: BaseChatMemory) => (steps: AgentFinish | AgentAction[]) => Promise<AgentFinish | AgentAction[]>;
export declare function getChatModel(ctx: IExecuteFunctions | ISupplyDataFunctions, index?: number): Promise<BaseChatModel | undefined>;
export declare function getOptionalMemory(ctx: IExecuteFunctions | ISupplyDataFunctions): Promise<BaseChatMemory | undefined>;
export declare function getTools(ctx: IExecuteFunctions | ISupplyDataFunctions, outputParser?: N8nOutputParser): Promise<Array<DynamicStructuredTool | Tool>>;
export declare function prepareMessages(ctx: IExecuteFunctions | ISupplyDataFunctions, itemIndex: number, options: {
    systemMessage?: string;
    passthroughBinaryImages?: boolean;
    outputParser?: N8nOutputParser;
}): Promise<BaseMessagePromptTemplateLike[]>;
export declare function preparePrompt(messages: BaseMessagePromptTemplateLike[]): ChatPromptTemplate;
