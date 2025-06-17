import { NextResponse } from 'next/server';
import { toggleAutopilotStatus } from '@/lib/autopilot/state';

// POST: Toggle autopilot status
export async function POST() {
  try {
    // Toggle the autopilot status using in-memory state
    const newStatus = toggleAutopilotStatus();
    
    console.log(`Autopilot status set to: ${newStatus}`);
    
    return NextResponse.json({ 
      success: true, 
      active: newStatus 
    });
  } catch (error) {
    console.error('Error toggling autopilot status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to toggle autopilot status' },
      { status: 500 }
    );
  }
} 