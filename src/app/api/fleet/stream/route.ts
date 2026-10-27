import { NextRequest } from 'next/server';
import { fleetEvents } from '@/lib/server/events';


export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      try {
        controller.enqueue(
          encoder.encode(`event: connected\ndata: ${JSON.stringify({ time: Date.now() })}\n\n`)
        );
      } catch {
        // Stream closed
      }

      const onChange = (data?: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(
              `event: sync\ndata: ${JSON.stringify(data || { time: Date.now() })}\n\n`
            )
          );
        } catch {
          // Stream closed
        }
      };

      fleetEvents.on('change', onChange);

      // Heartbeat ping every 15s to keep connection alive
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(interval);
        }
      }, 15000);

      req.signal.addEventListener('abort', () => {
        fleetEvents.off('change', onChange);
        clearInterval(interval);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
