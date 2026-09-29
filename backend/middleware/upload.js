const multer = require('multer');

const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    if (!allowedTypes.includes(file.mimetype)) {
      return callback(new Error('Only PDF, JPG and PNG files are allowed'));
    }
    callback(null, true);
  },
});

module.exports = upload;
