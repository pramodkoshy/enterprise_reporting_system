/**
 * Bull Board UI Route Handler
 * Provides the Bull Board UI for monitoring BullMQ queues
 */

import { NextRequest, NextResponse } from 'next/server';
import { getQueue } from '@/lib/queue';

export const dynamic = 'force-dynamic';

/**
 * GET handler - Serve the Bull Board HTML
 */
export async function GET(request: NextRequest) {
  const queue = getQueue();

  // Get queue statistics
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  // Return HTML with embedded Bull Board UI
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Queue Management - Bull Board</title>
  <script src="https://cdn.jsdelivr.net/npm/@bull-board/ui@6.16.2/dist/bull-board-ui.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    #app { height: 100vh; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    // Initialize Bull Board with direct API calls to our backend
    const API_BASE = '/api/admin/queues';

    // Fetch queue data from our API
    async function fetchQueueStats() {
      const response = await fetch(\`\${API_BASE}/stats\`);
      return response.json();
    }

    // For now, show a simple interface that links to the actual Bull Board
    window.location.href = '/bull-board';
  </script>
</body>
</html>
  `;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
