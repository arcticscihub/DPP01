import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Readable } from 'stream';

import db from '../db';
import { deleteFileFromS3 } from '../util/document';

import { s3Client } from '../../services/aws/s3/s3Client';
import { Logger } from '../../util/logging';
import { VAR_S3_BUCKET } from '../../util/variables';

const logger = new Logger('Contract');

export const deleteDocument = async (req: Request, res: Response) => {
  logger.initReq = req;
  if (!req.params.documentID && !req.params.contractID) {
    logger.debugMessage(`Could not delete document Missing ID`, req);
    return res.status(422).json({ message: `Could not delete document Missing ID`, code: 422 });
  }

  if (
    typeof req.params.documentID !== 'string' ||
    !mongoose.Types.ObjectId.isValid(req.params.documentID) ||
    typeof req.params.contractID !== 'string' ||
    !mongoose.Types.ObjectId.isValid(req.params.contractID)
  ) {
    logger.debugMessage(`Could not delete contact - One or more invalid IDs`, req);
    res.status(422).json({
      message: `Could not delete contact - One or more invalid IDs`,
      code: 422
    });
  }
  const documentID = new mongoose.Types.ObjectId(req.params.documentID);
  const contractID = new mongoose.Types.ObjectId(req.params.contractID);
  const file = await db.contract.getFile(contractID, documentID);
  if (!file) {
    logger.debugMessage('Could not delete document - trouble finding file in mongodb', req);
    return res.status(400).json({
      message: 'Could not delete document',
      code: 404
    });
  }
  logger.debugMessage(`Found file with path ${file.fullPath}`, req);
  logger.debugMessage(`Deleting document with ID ${req.params.documentID}`, req);
  if (!(await deleteFileFromS3(file.fullPath))) {
    logger.debugMessage('Could not delete document - trouble deleting in s3', req);
    return res.status(400).json({
      message: 'Could not delete document',
      code: 404
    });
  }
  const result = await db.contract.deleteFile(contractID, documentID);
  if (!result) {
    logger.debugMessage(`Could not delete contact - ID ${documentID} not found`, req);
    return res.status(404).json({
      message: 'Could not delete document',
      code: 404
    });
  }
  logger.debugMessage(`Document with ID ${req.params.documentID} deleted successfully`, req);
  return res.status(205).json({
    message: 'Document deleted successfully',
    code: 205
  });
};

export const getDocument = async (req: Request, res: Response) => {
  logger.initReq = req;
  const path: string = req.params.documentPath;
  const command = new GetObjectCommand({
    Bucket: VAR_S3_BUCKET,
    Key: path
  });
  const streamToString = (stream: Readable): Promise<string> =>
    new Promise((resolve, reject) => {
      const chunks: Uint8Array[] = [];
      stream.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });

  try {
    logger.debugMessage('Looking up file in S3');
    const { Body } = await s3Client.send(command);
    // The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.
    const fileData = await streamToString(Body as Readable);

    res.writeHead(200, {
      'Content-Disposition': `attachment; filename="tbd"`,
      'Content-Type': 'pdf'
    });

    res.end(fileData);
    logger.debugMessage('File retrieved successfully');
    return res.send();
  } catch (err) {
    console.error(err);
  }
};

export default {
  deleteDocument,
  getDocument
};
