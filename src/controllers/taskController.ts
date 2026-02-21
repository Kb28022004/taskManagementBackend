import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { z } from 'zod';

const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().nullable().optional().transform(val => val || null),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional().default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().default('MEDIUM'),
  dueDate: z.string().nullable().optional().transform(val => (val && val !== '' ? new Date(val) : null)),
});

const updateTaskSchema = z.object({
  title: z.string().trim().min(1).optional(),
  description: z.string().nullable().optional().transform(val => val || null),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate: z.string().nullable().optional().transform(val => (val && val !== '' ? new Date(val) : null)),
});

export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, priority, search, sortBy, order, page = '1', limit = '10' } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = { userId: req.user?.id };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }

    const [tasks, total] = await prisma.$transaction([
      prisma.task.findMany({
        where,
        orderBy: {
          [sortBy as string || 'createdAt']: order === 'asc' ? 'asc' : 'desc',
        },
        skip,
        take,
      }),
      prisma.task.count({ where }),
    ]);

    res.json({
      tasks,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const getTaskById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findFirst({
      where: { id: Number(id), userId: req.user?.id },
    });

    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  console.log('Create Task Request:', { body: req.body, user: req.user });
  try {
    const { title, description, status, priority, dueDate } = createTaskSchema.parse(req.body);
    console.log('Parsed Task Data:', { title, description, status, priority, dueDate });

    if (!req.user?.id) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const newTask = await prisma.task.create({
      data: {
        title,
        description: description || null,
        status: status || 'TODO',
        priority: priority || 'MEDIUM',
        dueDate: dueDate || null,
        userId: Number(req.user.id),
      },
    });

    console.log('Task Created Successfully:', newTask.id);
    res.status(201).json(newTask);
  } catch (error) {
    console.error('Create Task Error:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
    } else {
      res.status(500).json({ message: 'Server error', error: String(error) });
    }
  }
};

export const updateTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = updateTaskSchema.parse(req.body);

    const task = await prisma.task.findFirst({
      where: { id: Number(id), userId: req.user?.id },
    });

    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    const updatedTask = await prisma.task.update({
      where: { id: Number(id) },
      data: updates,
    });

    res.json(updatedTask);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ errors: error.issues });
    } else {
      res.status(500).json({ message: 'Server error', error });
    }
  }
};

export const deleteTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const task = await prisma.task.findFirst({
      where: { id: Number(id), userId: req.user?.id },
    });

    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    await prisma.task.delete({
      where: { id: Number(id) },
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
