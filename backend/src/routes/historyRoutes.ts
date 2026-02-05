import express from 'express';
import {
    createHistoryEntry,
    getAllHistory,
    getHistoryById,
    deleteHistoryEntry
} from '../controllers/historyController';

const router = express.Router();

router.post('/', createHistoryEntry);
router.get('/', getAllHistory);
router.get('/:id', getHistoryById);
router.delete('/:id', deleteHistoryEntry);

export default router;
