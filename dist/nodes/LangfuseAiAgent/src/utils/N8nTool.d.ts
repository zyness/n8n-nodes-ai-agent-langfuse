import type { DynamicStructuredToolInput } from '@langchain/core/tools';
import { DynamicStructuredTool, DynamicTool } from '@langchain/core/tools';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { ZodObject } from 'zod';
export declare const prepareFallbackToolDescription: (toolDescription: string, schema: ZodObject<any>) => string;
export declare class N8nTool extends DynamicStructuredTool<any> {
    private context;
    constructor(context: ISupplyDataFunctions, fields: DynamicStructuredToolInput<any>);
    asDynamicTool(): DynamicTool;
}
