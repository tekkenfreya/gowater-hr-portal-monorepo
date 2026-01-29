import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { getDb } from '@/lib/supabase';
import { randomUUID } from 'crypto';

/**
 * POST /api/tasks/updates
 * Add update/note to a task
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is authenticated
    const authService = getAuthService();
    const user = await authService.verifyToken(token);

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { taskId, updateText } = body;

    if (!taskId || !updateText) {
      return NextResponse.json(
        { error: 'Task ID and update text are required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get the current task
    const task = await db.get('tasks', { id: taskId });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Get existing updates or initialize empty array
    // Supabase JSONB fields are automatically parsed as JavaScript objects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const taskUpdates = (task as any).updates;
    const existingUpdates = Array.isArray(taskUpdates) ? taskUpdates : [];

    // Create new update object
    const newUpdate = {
      update_id: randomUUID(),
      user_id: user.id,
      user_name: user.name,
      update_text: updateText.trim(),
      created_at: new Date().toISOString()
    };

    // Add new update to the array
    const updatedUpdates = [...existingUpdates, newUpdate];

    // Update the task in database
    // Supabase JSONB columns accept JavaScript objects/arrays directly (do NOT stringify)
    await db.update('tasks',
      {
        updates: updatedUpdates,
        updated_at: new Date()
      },
      { id: taskId }
    );

    return NextResponse.json({
      success: true,
      update: newUpdate
    });
  } catch (error) {
    console.error('Add task update error:', error);
    return NextResponse.json(
      { error: 'Failed to add task update' },
      { status: 500 }
    );
  }
}
