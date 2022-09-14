import Joi from 'joi';

import {
  MessageModel,
  NetworkNameMessageModel,
  ClientNameMessageModel,
  EncryptedMessageModel,
} from '../types/Models';
import { MessageType } from '../types/MessageType';
import { DeviceType } from '../types/DeviceType';

const messageModelSchema = Joi.object({
  type: Joi.string().alphanum().required(),
})
  .unknown(true)
  .required();

const validDeviceTypes = Object.values(DeviceType);
const networkNameMessageModelSchema = Joi.object({
  type: Joi.string().equal(MessageType.NETWORK_NAME).required(),
  networkName: Joi.string().alphanum().max(10).required(),
  publicKey: Joi.string().required(),
  deviceType: Joi.string().equal(...validDeviceTypes),
}).required();

const clientNameMessageModelSchema = Joi.object({
  type: Joi.string().equal(MessageType.CLIENT_NAME).required(),
  clientName: Joi.string().max(32).required(),
}).required();

const encryptedMessageModelSchema = Joi.object({
  type: Joi.string().equal(MessageType.ENCRYPTED).required(),
  payload: Joi.string().base64().required(),
  targetId: Joi.string().uuid().required(),
}).required();

export function isMessageModel(message: any): message is MessageModel {
  return !messageModelSchema.validate(message).error;
}

export function isNetworkNameMessageModel(
  message: MessageModel | NetworkNameMessageModel
): message is NetworkNameMessageModel {
  return !networkNameMessageModelSchema.validate(message).error;
}

export function isClientNameMessageModel(
  message: MessageModel | ClientNameMessageModel
): message is ClientNameMessageModel {
  return !clientNameMessageModelSchema.validate(message).error;
}

export function isEncryptedMessageModel(
  message: MessageModel | EncryptedMessageModel
): message is EncryptedMessageModel {
  return !encryptedMessageModelSchema.validate(message).error;
}
