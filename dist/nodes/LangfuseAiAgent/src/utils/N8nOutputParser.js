"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.N8nStructuredOutputParser = void 0;
exports.getOptionalOutputParser = getOptionalOutputParser;
const N8nStructuredOutputParser_1 = require("./output_parsers/N8nStructuredOutputParser");
Object.defineProperty(exports, "N8nStructuredOutputParser", { enumerable: true, get: function () { return N8nStructuredOutputParser_1.N8nStructuredOutputParser; } });
async function getOptionalOutputParser(ctx, index = 0) {
    if (ctx.getNodeParameter('hasOutputParser', 0, true) === true) {
        return (await ctx.getInputConnectionData('ai_outputParser', index));
    }
    return undefined;
}
//# sourceMappingURL=N8nOutputParser.js.map