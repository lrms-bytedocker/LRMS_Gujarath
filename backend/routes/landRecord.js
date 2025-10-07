// src/routes/landRecord.js
import express from 'express';
import { uploadHandler } from '../controllers/landRecordController.js';

const router = express.Router();

/**
 * @openapi
 * /api/land-records/upload:
 *   post:
 *     summary: Upload bulk land record JSON
 *     tags:
 *       - LandRecords
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: The JSON structure matching the frontend sample (basicInfo, yearSlabs, panipatraks, nondhs, nondhDetails)
 *     responses:
 *       200:
 *         description: Processing successful
 *       400:
 *         description: Validation errors
 *       500:
 *         description: Server error
 */
router.post('/upload', uploadHandler);

export default router;