// import type { StreamEvent } from '@langchain/core/dist/tracers/event_stream';
// import type { IterableReadableStream } from '@langchain/core/dist/utils/stream';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
// import type { AIMessageChunk, MessageContentText } from '@langchain/core/messages';
import type { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import {
    AgentExecutor,
    type AgentRunnableSequence,
    createToolCallingAgent,
} from 'langchain/agents';
import type { BaseChatMemory } from 'langchain/memory';
import type { DynamicStructuredTool, Tool } from 'langchain/tools';
import omit from 'lodash/omit';
import { jsonParse, NodeOperationError, sleep } from 'n8n-workflow';
import type { IExecuteFunctions, INodeExecutionData, ISupplyDataFunctions } from 'n8n-workflow';
import assert from 'node:assert';
import { CallbackHandler } from 'langfuse-langchain';

import { getPromptInputByType } from '../../../src/utils/helpers';

import {
    getOptionalOutputParser,
    type N8nOutputParser,
} from '../../../src/utils/N8nOutputParser';

import {
    fixEmptyContentMessage,
    getAgentStepsParser,
    getChatModel,
    getOptionalMemory,
    getTools,
    prepareMessages,
    preparePrompt,
} from '../../../src/utils/common';

import { SYSTEM_MESSAGE } from '../../../src/utils/prompt';

/**
 * Creates an agent executor with the given configuration
 */
function createAgentExecutor(
    model: BaseChatModel,
    tools: Array<DynamicStructuredTool | Tool>,
    prompt: ChatPromptTemplate,
    options: { maxIterations?: number; returnIntermediateSteps?: boolean },
    outputParser?: N8nOutputParser,
    memory?: BaseChatMemory,
    fallbackModel?: BaseChatModel | null,
    langfuseHandler?: CallbackHandler
) {
    const callbacks = langfuseHandler ? [langfuseHandler] : [];

    const agent = createToolCallingAgent({
        llm: model,
        tools,
        prompt,
        streamRunnable: false,
    });

    let fallbackAgent: AgentRunnableSequence | undefined;
    if (fallbackModel) {
        fallbackAgent = createToolCallingAgent({
            llm: fallbackModel,
            tools,
            prompt,
            streamRunnable: false,
        });
    }
    const runnableAgent = RunnableSequence.from([
        fallbackAgent ? agent.withFallbacks([fallbackAgent]) : agent,
        getAgentStepsParser(outputParser, memory),
        fixEmptyContentMessage,
    ]) as AgentRunnableSequence;

    runnableAgent.singleAction = false;
    runnableAgent.streamRunnable = false;

    return AgentExecutor.fromAgentAndTools({
        agent: runnableAgent,
        memory,
        tools,
        returnIntermediateSteps: options.returnIntermediateSteps === true,
        maxIterations: options.maxIterations ?? 10,
        callbacks,
    });
}


export async function toolsAgentExecute(
    this: IExecuteFunctions | ISupplyDataFunctions,
): Promise<INodeExecutionData[][]> {
    this.logger.debug('Executing Tools Agent V2');

    const returnData: INodeExecutionData[] = [];
    const items = this.getInputData();
    const batchSize = this.getNodeParameter('options.batching.batchSize', 0, 1) as number;
    const delayBetweenBatches = this.getNodeParameter(
        'options.batching.delayBetweenBatches',
        0,
        0,
    ) as number;
    const needsFallback = this.getNodeParameter('needsFallback', 0, false) as boolean;
    const memory = await getOptionalMemory(this);
    const model = await getChatModel(this, 0);
    assert(model, 'Please connect a model to the Chat Model input');
    const fallbackModel = needsFallback ? await getChatModel(this, 1) : null;

    if (needsFallback && !fallbackModel) {
        throw new NodeOperationError(
            this.getNode(),
            'Please connect a model to the Fallback Model input or disable the fallback option',
        );
    }

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);

        const batchResults = await Promise.allSettled(
            batch.map(async (_item, batchItemIndex) => {
                const itemIndex = i + batchItemIndex;

                const input = getPromptInputByType({
                    ctx: this,
                    i: itemIndex,
                    inputKey: 'text',
                    promptTypeKey: 'promptType',
                });
                if (input === undefined) {
                    throw new NodeOperationError(this.getNode(), 'The "text" parameter is empty.');
                }

                const outputParser = await getOptionalOutputParser(this, itemIndex);
                const tools = await getTools(this, outputParser);
                const options = this.getNodeParameter('options', itemIndex, {}) as {
                    systemMessage?: string;
                    maxIterations?: number;
                    returnIntermediateSteps?: boolean;
                    passthroughBinaryImages?: boolean;
                };

                // Langfuse
                const langfuseCreds = await this.getCredentials('langfuseApi');
                const langfuseMetadata = this.getNodeParameter('langfuseMetadata', itemIndex, {}) as {
                    customMetadata?: Record<string, unknown>;
                    sessionId?: string;
                    userId?: string;
                };

                const langfuseHandler = new CallbackHandler({
                    publicKey: langfuseCreds.publicKey as string,
                    secretKey: langfuseCreds.secretKey as string,
                    baseUrl: (langfuseCreds.url as string) ?? process.env.LANGFUSE_HOST,
                    sessionId: langfuseMetadata.sessionId,
                    userId: langfuseMetadata.userId,
                    metadata: langfuseMetadata.customMetadata,
                });

                // Prepare the prompt
                const messages = await prepareMessages(this, itemIndex, {
                    systemMessage: options.systemMessage,
                    passthroughBinaryImages: options.passthroughBinaryImages ?? true,
                    outputParser,
                });
                const prompt: ChatPromptTemplate = preparePrompt(messages);

                // Create agent executor
                const executor = createAgentExecutor(
                    model,
                    tools,
                    prompt,
                    options,
                    outputParser,
                    memory,
                    fallbackModel,
                    langfuseHandler
                );

                const invokeParams = {
                    input,
                    system_message: options.systemMessage ?? SYSTEM_MESSAGE,
                    formatting_instructions:
                        'IMPORTANT: For your response to user, you MUST use the `format_final_json_response` tool with your complete answer formatted according to the required schema. Do not attempt to format the JSON manually - always use this tool. Your response will be rejected if it is not properly formatted through this tool. Only use this tool once you are ready to provide your final answer.',
                };

                // 🔑 Non-streaming invoke with Langfuse handler
                const response = await executor.invoke(invokeParams,
                    {
                        signal: this.getExecutionCancelSignal(),
                        callbacks: [langfuseHandler],
                        metadata: {
                            sessionId: langfuseMetadata.sessionId,
                            userId: langfuseMetadata.userId,
                            ...langfuseMetadata.customMetadata,
                        },
                    });

                // parse output if parser exists
                if (memory && outputParser) {
                    const parsedOutput = jsonParse<{ output: Record<string, unknown> }>(
                        response.output as string,
                    );
                    response.output = parsedOutput?.output ?? parsedOutput;
                }

                return {
                    json: omit(response, 'system_message', 'formatting_instructions', 'input', 'chat_history', 'agent_scratchpad'),
                    pairedItem: { item: itemIndex },
                };
            }),
        );

        batchResults.forEach((result) => {
            if (result.status === 'fulfilled') {
                returnData.push(result.value);
            } else {
                const error = result.reason as Error;
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message } });
                } else {
                    throw new NodeOperationError(this.getNode(), error);
                }
            }
        });

        if (i + batchSize < items.length && delayBetweenBatches > 0) {
            await sleep(delayBetweenBatches);
        }
    }

    return [returnData];
}