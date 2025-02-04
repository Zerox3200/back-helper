import multer, { diskStorage } from 'multer';
import { nanoid } from 'nanoid';
import fs from 'fs';

// Multer upload setup with folder based on fieldname
export const upload = ({ folder }) => {
  const storage = diskStorage({
    destination: (req, file, cb) => {
      const destination = `uploads/${folder}/${file.fieldname}`;
      // Create directory if it doesn't exist
      fs.mkdirSync(destination, { recursive: true });
      cb(null, destination);
    },
    filename: (req, file, cb) => {
      // Generate unique filename using nanoid
      cb(null, nanoid() + '-' + file.originalname);
    },
  });

  const multerupload = multer({ storage });
  return multerupload;
};

