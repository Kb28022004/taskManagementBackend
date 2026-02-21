import express from 'express';
import { authenticateToken } from '../middlewares/authMiddleware';
import { getTasks, getTaskById, createTask, updateTask, deleteTask } from '../controllers/taskController';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getTasks);
router.get('/:id', getTaskById);
router.post('/', createTask);
router.put('/:id', updateTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);

export default router;
