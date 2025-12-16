import { s3Client } from '../../services/aws/s3/s3Client';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { VAR_S3_BUCKET } from '../../util/variables';

export const deleteFileFromS3 = async (filePath: string) => {
  try {
    const response = await s3Client.send(
      new DeleteObjectCommand({
        Bucket: VAR_S3_BUCKET,
        Key: filePath
      })
    );
    return response;
  } catch (err) {
    console.error(err);
    return null;
  }
};
