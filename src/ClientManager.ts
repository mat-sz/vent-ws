import { Client } from './types/Client';
import { rtcConfiguration } from './utils/rtcConfiguration';
import {
  isNetworkNameMessageModel,
  isClientNameMessageModel,
  isEncryptedMessageModel,
} from './utils/validation';
import {
  ClientModel,
  LocalNetworksMessageModel,
  MessageModel,
  NetworkMessageModel,
  TargetedMessageModel,
  WelcomeMessageModel,
} from './types/Models';
import { MessageType } from './types/MessageType';

export const maxClientNameLength = 32;
export const maxSize = parseInt(process.env.WS_MAX_SIZE || '65536');
export const noticeText = process.env.NOTICE_TEXT;
export const noticeUrl = process.env.NOTICE_URL;

export class ClientManager {
  private clients: Client[] = [];

  constructor() {
    this.sendNetworkMessage = this.sendNetworkMessage.bind(this);
  }

  addClient(client: Client) {
    const localNetworkNames = this.getLocalNetworkNames(client);

    this.clients.push(client);

    client.send(
      JSON.stringify({
        type: MessageType.WELCOME,
        clientId: client.clientId,
        suggestedClientName: client.clientName,
        suggestedNetworkName: localNetworkNames[0],
        remoteAddress: client.remoteAddress,
        localNetworkNames,
        rtcConfiguration: rtcConfiguration(client.clientId),
        maxSize,
        noticeText,
        noticeUrl,
      } as WelcomeMessageModel)
    );
  }

  handleMessage(client: Client, message: MessageModel) {
    client.lastSeen = new Date();

    if (isNetworkNameMessageModel(message)) {
      client.publicKey = message.publicKey;
      client.deviceType = message.deviceType;
      this.setNetworkName(client, message.networkName.toUpperCase());
    } else if (isClientNameMessageModel(message)) {
      client.clientName = message.clientName;
      this.setNetworkName(client, client.networkName);
    } else if (isEncryptedMessageModel(message)) {
      this.sendMessage(client.clientId, message);
    }
  }

  sendMessage(fromClientId: string, message: TargetedMessageModel) {
    if (!message.targetId || message.targetId === fromClientId) {
      return;
    }

    const data = JSON.stringify({
      ...message,
      clientId: fromClientId,
    });

    const targets = this.clients.filter(c => c.clientId === message.targetId);
    targets.forEach(client => client.send(data));
  }

  sendLocalNetworksMessage(client: Client) {
    const localClients = this.getLocalClients(client);
    const localNetworkNames = this.getLocalNetworkNames(client);

    const localNetworksMessage = JSON.stringify({
      type: MessageType.LOCAL_NETWORKS,
      localNetworkNames,
    } as LocalNetworksMessageModel);

    localClients.forEach(client => {
      try {
        client.send(localNetworksMessage);
      } catch {}
    });
  }

  sendNetworkMessage(networkName: string) {
    const networkClients = this.clients.filter(
      client => client.networkName === networkName
    );

    const sortedClients = networkClients.sort(
      (a, b) => b.firstSeen.getTime() - a.firstSeen.getTime()
    );

    networkClients.forEach(client => {
      try {
        const clients: ClientModel[] = sortedClients
          .filter(otherClient => !!otherClient.publicKey)
          .map(otherClient => {
            return {
              clientId: otherClient.clientId,
              clientName: otherClient.clientName,
              publicKey: otherClient.publicKey,
              isLocal: otherClient.remoteAddress === client.remoteAddress,
              deviceType: otherClient.deviceType,
            } as ClientModel;
          });

        const networkMessage = JSON.stringify({
          type: MessageType.NETWORK,
          clients,
        } as NetworkMessageModel);

        client.send(networkMessage);
      } catch {}
    });
  }

  setNetworkName(client: Client, networkName?: string) {
    const previousNetworkName = client.networkName;
    client.networkName = networkName;

    if (previousNetworkName && previousNetworkName !== networkName) {
      this.sendNetworkMessage(previousNetworkName);
    }

    if (networkName) {
      this.sendNetworkMessage(networkName);
    }

    this.sendLocalNetworksMessage(client);
  }

  getLocalClients(client: Client) {
    return this.clients
      .filter(c => c.remoteAddress === client.remoteAddress && c.networkName)
      .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
  }

  getLocalNetworkNames(client: Client): string[] {
    const localClients = this.getLocalClients(client);
    const networkNames = new Set<string>();

    for (const client of localClients) {
      if (client.networkName) {
        networkNames.add(client.networkName);
      }
    }

    return [...networkNames.values()];
  }

  pingClients() {
    const pingMessage = JSON.stringify({
      type: MessageType.PING,
      timestamp: new Date().getTime(),
    });

    this.clients.forEach(client => {
      if (client.readyState !== 1) return;

      try {
        client.send(pingMessage);
      } catch {
        this.removeClient(client);
        client.close();
      }
    });
  }

  removeClient(client: Client) {
    this.setNetworkName(client, undefined);
    this.clients = this.clients.filter(c => c !== client);
  }

  removeBrokenClients() {
    this.clients = this.clients.filter(client => {
      if (client.readyState <= 1) {
        return true;
      } else {
        this.setNetworkName(client, undefined);
        return false;
      }
    });
  }

  removeInactiveClients() {
    const minuteAgo = new Date(Date.now() - 1000 * 20);

    this.clients.forEach(client => {
      if (client.readyState !== 1) return;

      if (client.lastSeen < minuteAgo) {
        this.removeClient(client);
        client.close();
      }
    });
  }
}
