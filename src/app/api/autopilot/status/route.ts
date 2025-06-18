import { NextResponse } from 'next/server';
import { getAutopilotStatus, setAutopilotStatus } from '../../../../lib/autopilot/state';

export const dynamic = 'force-dynamic';


// GET: Get current autopilot status
export async function GET() {
  const isActive = getAutopilotStatus();
  return NextResponse.json({ 
    success: true,
    active: isActive 
  });
}

// POST: Update autopilot status
export async function POST(request: Request) {
  try {
    const { active } = await request.json();
    
    if (typeof active !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Active status must be a boolean' },
        { status: 400 }
      );
    }
    
    const newStatus = setAutopilotStatus(active);
    
    return NextResponse.json({ 
      success: true, 
      active: newStatus 
    });
  } catch (error) {
    console.error('Error updating autopilot status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update autopilot status' },
      { status: 500 }
    );
  }
} 
