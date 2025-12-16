import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import ejs from 'ejs';
import path from 'path';

import { User } from '../../../models/';
import { getVerificationLink } from '../../../util/signing';
import { Logger } from '../../../util/logging';
import { WithID } from '../../../util/types';

const sesClient = new SESClient({ region: 'eu-central-1' });

const logger = new Logger('SES Email');

const createSendEmailCommand = (
  htmlMessage: string,
  plainTextMessage: string,
  subject: string,
  emails: string[],
  fromAddress: string = 'support@domain.com'
) => {
  return new SendEmailCommand({
    Destination: {
      ToAddresses: emails
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: htmlMessage
        },
        Text: {
          Charset: 'UTF-8',
          Data: plainTextMessage
        }
      },
      Subject: {
        Charset: 'UTF-8',
        Data: subject
      }
    },
    Source: fromAddress,
    ReplyToAddresses: [fromAddress]
  });
};

const createEmailContent = async ({
  type,
  email,
  name,
  hardDelete
}: {
  type: string;
  email: string;
  name?: string;
  hardDelete?: boolean;
}) => {
  let htmlMessage, plainTextMessage;
  let link: string = '';

  switch (type) {
    case 'delete':
      link = getVerificationLink({ type: 'delete', email, hardDelete });
      htmlMessage = await ejs.renderFile(
        path.join(__dirname, '../../../templates/delete.html.ejs'),
        {
          link: link,
          name: name,
          deleteAction: hardDelete ? 'delete' : 'deactivate'
        }
      );
      plainTextMessage = await ejs.renderFile(
        path.join(__dirname, '../../../templates/delete.txt.ejs'),
        {
          link: link,
          name: name,
          deleteAction: hardDelete ? 'delete' : 'deactivate'
        }
      );
      break;
    case 'invitation':
      link = getVerificationLink({ type: 'invitation', email, extended: true });
      htmlMessage = await ejs.renderFile(
        path.join(__dirname, '../../../templates/invite.html.ejs'),
        {
          link: link
        }
      );
      plainTextMessage = await ejs.renderFile(
        path.join(__dirname, '../../../templates/invite.txt.ejs'),
        {
          link: link
        }
      );
      break;
    case 'reset':
      link = getVerificationLink({ type: 'reset', email });
      htmlMessage = await ejs.renderFile(
        path.join(__dirname, '../../../templates/reset.html.ejs'),
        {
          link: link,
          name: name
        }
      );
      plainTextMessage = await ejs.renderFile(
        path.join(__dirname, '../../../templates/reset.txt.ejs'),
        {
          link: link,
          name: name
        }
      );
      break;
    case 'signup':
      link = getVerificationLink({ type: 'signup', email });
      console.log('link', link);
      htmlMessage = await ejs.renderFile(
        path.join(__dirname, '../../../templates/verify.html.ejs'),
        {
          link: link,
          name: name
        }
      );
      plainTextMessage = await ejs.renderFile(
        path.join(__dirname, '../../../templates/verify.txt.ejs'),
        {
          link: link,
          name: name
        }
      );
      break;
    default:
      htmlMessage = await ejs.renderFile(
        path.join(__dirname, '../../../templates/notification.html.ejs'),
        { name: name }
      );
      plainTextMessage = await ejs.renderFile(
        path.join(__dirname, '../../../templates/notification.txt.ejs'),
        { name: name }
      );
  }

  return { htmlMessage, plainTextMessage };
};

const createInvitationEmail = async (email: string) => {
  const { htmlMessage, plainTextMessage } = await createEmailContent({
    type: 'invitation',
    email
  });
  const sendEmailCommand = createSendEmailCommand(
    htmlMessage,
    plainTextMessage,
    'Welcome to Grayn',
    [email]
  );
  return await sesClient.send(sendEmailCommand);
};

const createNotificationEmail = async (email: string, name: string) => {
  const { htmlMessage, plainTextMessage } = await createEmailContent({
    type: 'notification',
    email,
    name
  });
  const sendEmailCommand = createSendEmailCommand(
    htmlMessage,
    plainTextMessage,
    'Your Grayn account has been updated',
    [email]
  );
  return await sesClient.send(sendEmailCommand);
};

const createResetEmail = async (email: string, name: string) => {
  const { htmlMessage, plainTextMessage } = await createEmailContent({
    type: 'reset',
    email,
    name
  });
  const sendEmailCommand = createSendEmailCommand(
    htmlMessage,
    plainTextMessage,
    'Reset your Grayn password',
    [email]
  );
  return await sesClient.send(sendEmailCommand);
};

const createVerifyDeleteEmail = async (email: string, name: string, hardDelete: boolean) => {
  const { htmlMessage, plainTextMessage } = await createEmailContent({
    type: 'delete',
    email,
    name,
    hardDelete
  });
  const sendEmailCommand = createSendEmailCommand(
    htmlMessage,
    plainTextMessage,
    `${hardDelete ? 'Delete' : 'Disable'} your Grayn account`,
    [email]
  );
  return await sesClient.send(sendEmailCommand);
};

const createVerificationEmail = async (email: string, name: string) => {
  const { htmlMessage, plainTextMessage } = await createEmailContent({
    type: 'signup',
    email,
    name
  });
  const sendEmailCommand = createSendEmailCommand(
    htmlMessage,
    plainTextMessage,
    'Please verify your email',
    [email]
  );
  return await sesClient.send(sendEmailCommand);
};

export const sendInvitationEmail = async (user: WithID<User>) => {
  try {
    const result = await createInvitationEmail(user.email);
    console.log(result);
    return true;
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return false;
  }
};

export const sendNotificationEmail = async (user: WithID<User>) => {
  try {
    const result = await createNotificationEmail(user.email, user.firstName || '');
    console.log(result);
    return true;
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return false;
  }
};

export const sendResetPasswordEmail = async (user: WithID<User>) => {
  try {
    const result = await createResetEmail(user.email, user.firstName || '');
    console.log(result);
    return true;
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return false;
  }
};

export const sendVerificationEmail = async (user: WithID<User>) => {
  try {
    const result = await createVerificationEmail(user.email, user.firstName || '');
    console.log(result);
    return true;
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return false;
  }
};

export const sendVerifyDeleteMail = async (user: WithID<User>, hardDelete: boolean) => {
  try {
    const result = await createVerifyDeleteEmail(user.email, user.firstName || '', hardDelete);
    console.log(result);
    return true;
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return false;
  }
};
