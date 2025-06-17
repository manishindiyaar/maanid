import { NextResponse } from 'next/server';

export async function POST() {
  try {
    return NextResponse.json({ 
      message: 'This is a server-side API. Use the client-side resetLocalStorage() function to reset localStorage.',
      success: true 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to reset state' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'To reset local storage, use a POST request or the client-side function.',
    help: 'Add a <script> tag to your page with: function resetLocalStorage() { localStorage.removeItem("setup_complete_state"); localStorage.removeItem("schema_setup_completed"); localStorage.removeItem("dashboard_flow_state"); }'
  });
} 