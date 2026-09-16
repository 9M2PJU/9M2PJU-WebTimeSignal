/**
 * Cloudflare Pages Function - High Precision Atomic Time Endpoint
 * Runs directly on Cloudflare Edge Worker synchronized via PTP/GPS Atomic Reference.
 */

export async function onRequestGet(context) {
    const serverTimestampMs = Date.now();
    const cf = context.request.cf || {};

    const responsePayload = {
        serverTimestampMs: serverTimestampMs,
        serverTimeIso: new Date(serverTimestampMs).toISOString(),
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
            'X-Atomic-Colo': cf.colo || 'EDGE'
        }
    });
}
