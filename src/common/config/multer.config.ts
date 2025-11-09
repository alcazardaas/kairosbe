import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

/**
 * Multer configuration for file uploads
 * Used for bulk user import (CSV/Excel files)
 */
export const multerConfig: MulterOptions = {
  // Use memory storage (don't write to disk)
  storage: memoryStorage(),

  // File size limit: 10MB
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB in bytes
    files: 1, // Only allow 1 file per request
  },

  // File type validation
  fileFilter: (req, file, callback) => {
    const allowedMimetypes = [
      'text/csv',
      'application/vnd.ms-excel', // .xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    ];

    const allowedExtensions = ['.csv', '.xls', '.xlsx'];

    // Check mimetype
    if (!allowedMimetypes.includes(file.mimetype)) {
      return callback(
        new BadRequestException(
          'Invalid file type. Only CSV and Excel (.xlsx) files are supported.',
        ),
        false,
      );
    }

    // Check file extension
    const fileExtension = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExtension)) {
      return callback(
        new BadRequestException(
          'Invalid file extension. Only .csv and .xlsx files are supported.',
        ),
        false,
      );
    }

    // File is valid
    callback(null, true);
  },
};
