import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDb } from '@/lib/supabase';
import { getWebhookService } from '@/lib/webhooks';
import { logger } from '@/lib/logger';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

interface DbTask {
  id: string;
  title: string;
  description: string;
  priority: string;
  due_date: string | null;
  status: string;
  remarks?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sub_tasks?: string | any; // JSON string or JSONB object of sub-tasks array
}

function getTokenFromRequest(request: NextRequest): string | null {
  // Check cookies first (web), then Authorization header (mobile)
  let token = request.cookies.get('auth-token')?.value;

  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  return token || null;
}

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const userId = decoded.userId;

    // Get tasks for the current user
    const database = getDb();
    const tasks = await database.all('tasks', { user_id: userId });

    // Parse sub_tasks and updates JSON string to array
    const parsedTasks = (tasks || []).map((task: DbTask) => {
      let subTasks = [];
      try {
        // Handle both string and already-parsed JSON
        if (task.sub_tasks) {
          if (typeof task.sub_tasks === 'string') {
            subTasks = JSON.parse(task.sub_tasks);
          } else {
            subTasks = task.sub_tasks;
          }
        }
      } catch (error) {
        logger.error('Error parsing sub_tasks', error);
        subTasks = [];
      }

      let updates = [];
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const taskUpdates = (task as any).updates;
        if (taskUpdates) {
          if (typeof taskUpdates === 'string') {
            updates = JSON.parse(taskUpdates);
          } else {
            updates = taskUpdates;
          }
        }
      } catch (error) {
        logger.error('Error parsing updates', error);
        updates = [];
      }

      return {
        ...task,
        subTasks,
        updates,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createdAt: (task as any).created_at || new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updatedAt: (task as any).updated_at || new Date().toISOString()
      };
    });

    return NextResponse.json({
      tasks: parsedTasks,
      message: 'Tasks retrieved successfully'
    });

  } catch (error) {
    logger.error('Get tasks API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const userId = decoded.userId;

    const body = await request.json();
    const { title, description, priority, due_date, status, subTasks } = body;

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Create new task
    const database = getDb();
    const taskData = {
      user_id: userId,
      title: title.trim(),
      description: description?.trim() || '',
      priority: priority || 'medium',
      due_date: due_date || null,
      status: status || 'pending',
      sub_tasks: subTasks ? JSON.stringify(subTasks) : JSON.stringify([])
    };

    const task = await database.insert('tasks', taskData);

    // Fire webhook for task created
    getWebhookService().fireEvent('task.created', {
      taskId: task.id,
      userId,
      title: title.trim(),
      priority: priority || 'medium',
      status: status || 'pending'
    });

    // Return task with parsed subTasks
    return NextResponse.json({
      task: {
        ...task,
        subTasks: subTasks || [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createdAt: (task as any).created_at || new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updatedAt: (task as any).updated_at || new Date().toISOString()
      },
      message: 'Task created successfully'
    });

  } catch (error) {
    logger.error('Create task API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const userId = decoded.userId;

    const body = await request.json();
    const { id, title, description, priority, due_date, status, remarks, subTasks } = body;

    // Convert frontend status values to database values
    const mapStatusToDb = (status: string) => {
      const statusMap: { [key: string]: string } = {
        'pending': 'pending',
        'in_progress': 'in_progress',
        'completed': 'completed',
        'blocked': 'blocked',
        'cancel': 'cancel',
        'archived': 'archived'
      };
      return statusMap[status] || status;
    };

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Verify task belongs to user
    const database = getDb();
    const existingTask = await database.get<DbTask>('tasks', { id, user_id: userId });
    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Update task
    const updateData: Record<string, unknown> = {
      title: title?.trim() || existingTask.title,
      description: description?.trim() || existingTask.description,
      priority: priority || existingTask.priority,
      due_date: due_date !== undefined ? due_date : existingTask.due_date,
      status: status ? mapStatusToDb(status) : existingTask.status,
      remarks: remarks?.trim() !== undefined ? remarks?.trim() : existingTask.remarks,
      updated_at: new Date().toISOString()
    };

    // Handle subTasks update
    if (subTasks !== undefined) {
      updateData.sub_tasks = JSON.stringify(subTasks);
    }

    const updatedTask = await database.update('tasks', updateData, { id, user_id: userId });

    // Parse existing subTasks if needed
    let existingSubTasks = [];
    try {
      if (existingTask.sub_tasks) {
        if (typeof existingTask.sub_tasks === 'string') {
          existingSubTasks = JSON.parse(existingTask.sub_tasks);
        } else {
          existingSubTasks = existingTask.sub_tasks;
        }
      }
    } catch (error) {
      logger.error('Error parsing existing sub_tasks', error);
    }

    // Fire webhook: task.completed if status changed to completed, otherwise task.updated
    const newStatus = status ? mapStatusToDb(status) : existingTask.status;
    if (newStatus === 'completed' && existingTask.status !== 'completed') {
      getWebhookService().fireEvent('task.completed', {
        taskId: id,
        userId,
        title: title?.trim() || existingTask.title,
        previousStatus: existingTask.status
      });
    } else {
      getWebhookService().fireEvent('task.updated', {
        taskId: id,
        userId,
        title: title?.trim() || existingTask.title,
        status: newStatus,
        previousStatus: existingTask.status
      });
    }

    // Return task with parsed subTasks
    return NextResponse.json({
      task: {
        ...updatedTask,
        subTasks: subTasks !== undefined ? subTasks : existingSubTasks,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        createdAt: (updatedTask as any).created_at || (existingTask as any).created_at || new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        updatedAt: (updatedTask as any).updated_at || new Date().toISOString()
      },
      message: 'Task updated successfully'
    });

  } catch (error) {
    logger.error('Update task API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded: JWTPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    const userId = decoded.userId;

    const url = new URL(request.url);
    const taskId = url.searchParams.get('id');

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Verify task belongs to user
    const database = getDb();
    const existingTask = await database.get<DbTask>('tasks', { id: taskId, user_id: userId });
    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Delete task
    await database.delete('tasks', { id: taskId, user_id: userId });

    // Fire webhook for task deleted
    getWebhookService().fireEvent('task.deleted', {
      taskId,
      userId,
      title: existingTask.title
    });

    return NextResponse.json({
      message: 'Task deleted successfully'
    });

  } catch (error) {
    logger.error('Delete task API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}