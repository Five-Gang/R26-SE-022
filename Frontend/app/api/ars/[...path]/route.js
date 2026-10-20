import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.ARS_BACKEND_URL || 'http://127.0.0.1:8001';

async function forward(request, { params }) {
  const { path } = await params;
  const target = `${BACKEND_URL.replace(/\/$/, '')}/${path.join('/')}${new URL(request.url).search}`;
  const headers = new Headers();

  for (const name of ['authorization', 'content-type', 'accept']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init = { method: request.method, headers };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  try {
    const response = await fetch(target, { ...init, cache: 'no-store' });
    const body = await response.arrayBuffer();
    const responseHeaders = new Headers();
    const contentType = response.headers.get('content-type');
    if (contentType) responseHeaders.set('content-type', contentType);

    return new NextResponse(body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Adaptive Reminder proxy request failed', {
      target,
      method: request.method,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { detail: 'Adaptive Reminder service is unavailable.' },
      { status: 503 }
    );
  }
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
