import express from 'express';
import { uploadHandler, uploadFileHandler } from '../controllers/landRecordController.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

/**
 * @openapi
 * /api/land-records/upload:
 *   post:
 *     summary: Upload bulk land record JSON (raw JSON body)
 *     tags:
 *       - LandRecords
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: The JSON structure matching the frontend sample
 *     responses:
 *       200:
 *         description: Processing successful
 *       400:
 *         description: Validation errors
 *       500:
 *         description: Server error
 */
router.post('/upload', uploadHandler);

/**
 * @openapi
 * /api/land-records/upload-file:
 *   post:
 *     summary: Upload bulk land record JSON file
 *     tags:
 *       - LandRecords
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: JSON file containing land record data
 *     responses:
 *       200:
 *         description: File uploaded and processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 stats:
 *                   type: object
 *                   properties:
 *                     nondhs:
 *                       type: number
 *                     nondhDetails:
 *                       type: number
 *                     totalOwners:
 *                       type: number
 *                     skippedNondhDetails:
 *                       type: number
 *                 landRecordId:
 *                   type: string
 *       400:
 *         description: Invalid file or JSON structure
 *       500:
 *         description: Server error
 */
router.post('/upload-file', upload.single('file'), uploadFileHandler);

export default router;