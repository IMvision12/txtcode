import { Router } from 'express';
import { getPopularModels, searchModels } from '../services/huggingface';

const router = Router();

router.get('/popular', async (req, res) => {
  try {
    const models = await getPopularModels();
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    const models = await searchModels(query as string);
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: 'Failed to search models' });
  }
});

export default router;
