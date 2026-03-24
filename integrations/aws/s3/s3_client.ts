import { VAR_AWS_REGION } from '../../../util/variables';
import { S3Client } from '@aws-sdk/client-s3';

// Create an Amazon S3 service client object.
const s3Client = new S3Client({ region: VAR_AWS_REGION });
export { s3Client };
