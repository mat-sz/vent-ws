import { DeviceType } from './DeviceType';
import { MessageType } from './MessageType';

export interface ClientModel {
  clientId: string;
  clientName?: string;
  publicKey: string;
  isLocal: boolean;
  deviceType?: DeviceType;
}

export interface MessageModel {
  type: MessageType;
}

export interface TargetedMessageModel extends MessageModel {
  targetId: string;
}

export interface WelcomeMessageModel extends MessageModel {
  type: MessageType.WELCOME;
  clientId: string;
  suggestedClientName?: string;
  suggestedNetworkName?: string;
  remoteAddress?: string;
  localNetworkNames: string[];
  rtcConfiguration?: any;
  maxSize: number;
  noticeText?: string;
  noticeUrl?: string;
}

export interface LocalNetworksMessageModel extends MessageModel {
  type: MessageType.LOCAL_NETWORKS;
  localNetworkNames: string[];
}

export interface NetworkNameMessageModel extends MessageModel {
  type: MessageType.NETWORK_NAME;
  networkName: string;
  publicKey: string;
  deviceType?: DeviceType;
}

export interface ClientNameMessageModel extends MessageModel {
  type: MessageType.CLIENT_NAME;
  clientName: string;
}

export interface NetworkMessageModel extends MessageModel {
  type: MessageType.NETWORK;
  clients: ClientModel[];
}

export interface PingMessageModel extends MessageModel {
  type: MessageType.PING;
  timestamp: number;
}

export interface EncryptedMessageModel extends TargetedMessageModel {
  type: MessageType.ENCRYPTED;
  payload: string;
  clientId?: string;
}
