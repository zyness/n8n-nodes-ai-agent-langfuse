import type { IExecuteFunctions, ISupplyDataFunctions } from 'n8n-workflow';
import { N8nStructuredOutputParser } from './output_parsers/N8nStructuredOutputParser';
export type N8nOutputParser = N8nStructuredOutputParser;
export { N8nStructuredOutputParser };
export declare function getOptionalOutputParser(ctx: IExecuteFunctions | ISupplyDataFunctions, index?: number): Promise<N8nOutputParser | undefined>;
