const multer = require('multer');
const path = require('path');

// 配置存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 使用绝对路径
    cb(null, path.join(__dirname, '../public/uploads/avatars'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(file.originalname);
    cb(null, 'avatar-' + uniqueSuffix + fileExt);
  }
});


// 文件过滤，仅允许图片
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('仅支持上传图片文件'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制文件大小为5MB
  }
});

module.exports = upload;