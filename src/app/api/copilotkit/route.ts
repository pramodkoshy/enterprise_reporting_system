import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
  OpenAIAdapter,
} from '@copilotkit/runtime';
import { NextRequest } from 'next/server';

const serviceAdapter = new OpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.OPENAI_MODEL || 'gpt-4o',
});

const runtime = new CopilotRuntime();

export const POST = async (req: NextRequest) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  console.log('='.repeat(80));
  console.log(`[COPILOTKIT ${requestId}] NEW REQUEST - ${new Date().toISOString()}`);
  console.log(`[COPILOTKIT ${requestId}] Method: ${req.method}`);
  console.log(`[COPILOTKIT ${requestId}] URL: ${req.url}`);
  console.log(`[COPILOTKIT ${requestId}] Headers:`, Object.fromEntries(req.headers.entries()));

  // Log request body
  try {
    const clonedReq = req.clone();
    const body = await clonedReq.json();
    console.log(`[COPILOTKIT ${requestId}] Body:`, JSON.stringify(body, null, 2).substring(0, 1000));

    // Check if this is a CopilotKit request
    if (body.messages || body.action) {
      console.log(`[COPILOTKIT ${requestId}] Detected CopilotKit request with messages/action`);
    }
  } catch (e) {
    console.log(`[COPILOTKIT ${requestId}] Could not parse body as JSON:`, e);
  }

  // Check environment
  console.log(`[COPILOTKIT ${requestId}] OPENAI_API_KEY exists: ${!!process.env.OPENAI_API_KEY}`);
  console.log(`[COPILOTKIT ${requestId}] OPENAI_API_KEY length: ${process.env.OPENAI_API_KEY?.length || 0}`);
  console.log(`[COPILOTKIT ${requestId}] OPENAI_MODEL: ${process.env.OPENAI_MODEL || 'gpt-4o (default)'}`);

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: '/api/copilotkit',
  });

  try {
    console.log(`[COPILOTKIT ${requestId}] Calling handleRequest...`);
    const response = await handleRequest(req);
    const duration = Date.now() - startTime;

    console.log(`[COPILOTKIT ${requestId}] Response status: ${response.status}`);
    console.log(`[COPILOTKIT ${requestId}] Duration: ${duration}ms`);

    // Try to log response body for debugging
    try {
      const clonedResponse = response.clone();
      const responseBody = await clonedResponse.text();
      console.log(`[COPILOTKIT ${requestId}] Response body preview:`, responseBody.substring(0, 500));
    } catch (e) {
      console.log(`[COPILOTKIT ${requestId}] Could not read response body`);
    }

    console.log(`[COPILOTKIT ${requestId}] REQUEST COMPLETE`);
    console.log('='.repeat(80));

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[COPILOTKIT ${requestId}] ERROR after ${duration}ms:`);
    console.error(`[COPILOTKIT ${requestId}] Error name:`, error instanceof Error ? error.name : typeof error);
    console.error(`[COPILOTKIT ${requestId}] Error message:`, error instanceof Error ? error.message : String(error));
    console.error(`[COPILOTKIT ${requestId}] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    console.log('='.repeat(80));

    throw error;
  }
};
