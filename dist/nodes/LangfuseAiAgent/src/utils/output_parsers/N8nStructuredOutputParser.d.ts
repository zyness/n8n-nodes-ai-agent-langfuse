import type { Callbacks } from '@langchain/core/callbacks/manager';
import { StructuredOutputParser } from 'langchain/output_parsers';
import type { ISupplyDataFunctions } from 'n8n-workflow';
import { z } from 'zod';
export declare class N8nStructuredOutputParser extends StructuredOutputParser<any> {
    private context;
    constructor(context: ISupplyDataFunctions, zodSchema: z.ZodSchema<object>);
    lc_namespace: string[];
    parse(text: string, _callbacks?: Callbacks, errorMapper?: (error: Error) => Error): Promise<object>;
    static fromZodJsonSchema(zodSchema: z.ZodSchema<object>, nodeVersion: number, context: ISupplyDataFunctions): Promise<N8nStructuredOutputParser>;
    getSchema(): any;
}
