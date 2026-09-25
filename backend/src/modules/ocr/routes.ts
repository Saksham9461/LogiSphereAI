import {Router} from 'express';
import multer from 'multer';

export const ocrRouter = Router();
const upload = multer({dest: 'uploads/'});

ocrRouter.post('/scan-license', upload.single('image'), (_req, res) => {
  res.json({fullName: 'Raj Patel', licenseNumber: 'DL-14202300123', dateOfBirth: '15/04/1998', expiryDate: '14/04/2038'});
});
