import { Router } from 'express';
import { upload } from '../middleware/upload';
import { createInspection, getInspections, getInspectionById, updateInspectionReview, updateDeclarations, reviewFinding } from '../controllers/inspectionController';
import { authenticate, authorizeRoles } from '../middleware/auth'; 

const router = Router();

// Ensure authenticate is applied
router.use(authenticate);

router.post('/', upload.array('images', 5), createInspection);
router.get('/', getInspections);
router.get('/:id', getInspectionById);
router.patch('/:id/review', authorizeRoles('ADMIN', 'SUPERVISOR', 'INSPECTOR'), updateInspectionReview);
router.patch('/:id/declarations', authorizeRoles('ADMIN', 'SUPERVISOR', 'INSPECTOR'), updateDeclarations);
router.post('/:id/findings/:findingId/review', authorizeRoles('ADMIN', 'SUPERVISOR', 'INSPECTOR'), reviewFinding);

export default router;
