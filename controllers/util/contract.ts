import { PutObjectCommand } from '@aws-sdk/client-s3';
import { ObjectId } from 'bson';
import mongoose from 'mongoose';

import { handleContactPersons } from './supplier';

import { IContractSupplier } from '../../models/';
import { s3Client } from '../../services/aws/s3/s3Client';
import { VAR_S3_BUCKET, VAR_ENVIRONMENT } from '../../util/variables';
import { ZContractSupplier } from '../../validators/';

const uploadFileToBucket = async (fileName: string, fileData: string) => {
  //Hacky solution to avoid collisions.
  const randString: string = Math.random().toString(36).slice(2, 7);
  const filePath: string = `${VAR_ENVIRONMENT}/${randString}_${fileName}`;
  const ret = await s3Client.send(
    new PutObjectCommand({
      Bucket: VAR_S3_BUCKET,
      Body: fileData,
      Key: filePath
    })
  );
  const fileUrl = `${VAR_S3_BUCKET}/${filePath}`;
  return filePath;
};

const handleManagers = (managers: string[]) => {
  let convertedManagers: ObjectId[] = [];
  for (const manager in managers) {
    if (mongoose.Types.ObjectId.isValid(managers[manager])) {
      convertedManagers.push(new mongoose.Types.ObjectId(managers[manager]));
    }
  }

  return convertedManagers;
};

const handleSuppliers = async (contractSuppliers: ZContractSupplier[], company?: ObjectId) => {
  let parsedContractSuppliers: IContractSupplier[] = [];

  for (const contractSupplier in contractSuppliers) {
    const contactList = await handleContactPersons(
      contractSuppliers[contractSupplier].contacts,
      company
    );
    const validation = ZContractSupplier.safeParse({
      ...contractSuppliers[contractSupplier],
      contacts: contactList
    });

    if (!validation.success) {
      continue;
    }

    parsedContractSuppliers.push({
      ...validation.data,
      supplier:
        typeof validation.data.supplier === 'string' &&
        mongoose.Types.ObjectId.isValid(validation.data.supplier)
          ? new mongoose.Types.ObjectId(validation.data.supplier)
          : undefined,
      contacts: contactList
    });
  }
  return parsedContractSuppliers;
};

export default { handleManagers, handleSuppliers, uploadFileToBucket };
