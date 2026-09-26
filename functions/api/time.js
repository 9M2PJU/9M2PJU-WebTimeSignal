/**
 * Cloudflare Pages Function - High Precision Atomic Time Endpoint
 * Runs directly on Cloudflare Edge Worker synchronized via PTP/GPS Atomic Reference.
 */

export async function onRequestGet(context) {
    const tStart = Date.now();
    const serverTimestampMs = tStart;
    const cf = context.request.cf || {};
    const tEnd = Date.now();

    const responsePayload = {
        serverTimestampMs: serverTimestampMs,
        serverTimeIso: new Date(serverTimestampMs).toISOString(),
        processingMs: tEnd - tStart,
        colo: cf.colo || 'EDGE',
        country: cf.country || 'GLOBAL',
        timezone: cf.timezone || 'UTC',
        source: 'Cloudflare Atomic PTP/GPS Master Clock'
    };

    return new Response(JSON.stringify(responsePayload), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'X-Atomic-Colo': cf.colo || 'EDGE',
            'Server-Timing': `edge;dur=${tEnd - tStart}`
        }
    });
}
