import { Router } from 'express';
import { upload } from '../middleware/upload';
import { createInspection, getInspections, getInspectionById } from '../controllers/inspectionController';
import { authenticate, authorizeRoles } from '../middleware/auth'; 

const router = Router();

// Ensure authenticate is applied (disabled for local testing)
// router.use(authenticate);

router.post('/', upload.array('images', 5), createInspection);
router.get('/', getInspections);
router.get('/:id', getInspectionById);

export default router;
