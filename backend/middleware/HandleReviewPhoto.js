import multer from 'multer'

const storage = multer.memoryStorage();
 
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
 

const uploadReviewPhoto = multer({
  storage,
  limits: {
    fileSize: MAX_SIZE,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error('INVALID_FILE_TYPE'), false);
    }
    cb(null, true);
  },
}).single('photo');


export const handleReviewPhotoUpload = (req, res, next) => {
  uploadReviewPhoto(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'file_too_large',
          message: 'Maximum photo size is 5MB',
        });
      }
 
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({
          error: 'too_many_files',
          message: 'Only one photo is allowed',
        });
      }
 
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
          error: 'unexpected_field',
          message: "File must be sent in the 'photo' field",
        });
      }
 
      if (err.message === 'INVALID_FILE_TYPE') {
        return res.status(400).json({
          error: 'invalid_file_type',
          message: 'File type must be JPG, PNG, or WEBP',
        });
      }
 
      console.error('[handleReviewPhotoUpload] error', err);
      return res.status(400).json({ error: 'upload_error' });
    }
 
    next();
  });
};