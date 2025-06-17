import { NextResponse } from 'next/server';

// GET request handler
export async function GET(request: Request) {
  return NextResponse.json({
    message: 'Hello from the API!',
    status: 'success',
    timestamp: new Date().toISOString()
  }, { status: 200 });
}

// POST request handler (optional, to show how to handle data)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({
      message: 'Data received successfully',
      receivedData: body,
      status: 'success'
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({
      message: 'Invalid request body',
      status: 'error'
    }, { status: 400 });
  }
}