// eslint-disable-next-line @typescript-eslint/no-var-requires
const sdkClient = require("@modelcontextprotocol/sdk/client");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sdkStdio = require("@modelcontextprotocol/sdk/client/stdio.js");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sdkHttp = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

export const Client = sdkClient.Client;
export const StdioClientTransport = sdkStdio.StdioClientTransport;
export const StreamableHTTPClientTransport = sdkHttp.StreamableHTTPClientTransport;
