const {
    BedrockAgentRuntimeClient,
    InvokeAgentCommand,
} = require("@aws-sdk/client-bedrock-agent-runtime");
const { v4: uuidv4 } = require("uuid");

const client = new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION });

async function invokeAgent(inputText, sessionId) {
    const command = new InvokeAgentCommand({
        agentId: process.env.AGENT_ID,
        agentAliasId: process.env.AGENT_ALIAS_ID,
        sessionId: sessionId || uuidv4(),
        inputText,
    });

    const response = await client.send(command);

    let completion = "";
    for await (const event of response.completion) {
        if (event.chunk && event.chunk.bytes) {
            completion += Buffer.from(event.chunk.bytes).toString("utf-8");
        }
    }
    return completion;
}

module.exports = { invokeAgent };
