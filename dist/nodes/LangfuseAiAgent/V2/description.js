"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getToolsAgentProperties = void 0;
const sharedFields_1 = require("../src/utils/sharedFields");
const options_1 = require("../src/utils/options");
const enableStreamingOption = {
    displayName: 'Enable Streaming',
    name: 'enableStreaming',
    type: 'boolean',
    default: true,
    description: 'Whether this agent will stream the response in real-time as it generates text',
};
const getToolsAgentProperties = ({ withStreaming, }) => [
    {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        default: {},
        placeholder: 'Add Option',
        options: [
            ...options_1.commonOptions,
            (0, sharedFields_1.getBatchingOptionFields)(undefined, 1),
            enableStreamingOption,
        ],
    },
];
exports.getToolsAgentProperties = getToolsAgentProperties;
//# sourceMappingURL=description.js.map