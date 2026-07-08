// Kampanya / push modelleri — MobileCampaignManager.swift birebir.

export interface MobilePopupPayload {
  id: string;
  title?: string;
  body?: string;
  imageUrl?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  dismissLabel?: string;
}

export interface MobileNotificationItem {
  id: string;
  title?: string;
  body?: string;
  url?: string;
}

/** GET campaigns/popup — popup açıkça null gelebilir. */
export interface CampaignPopupResponse {
  popup: MobilePopupPayload | null;
}

/** GET campaigns/notifications. */
export interface CampaignNotificationsResponse {
  notifications: MobileNotificationItem[];
}

/** POST campaigns/device gövdesi — pushToken "" olabilir. */
export interface DeviceRegistrationRequest {
  deviceId: string;
  pushToken: string;
}

/** POST campaigns/device yanıtı — hatalar yutulur. */
export interface DeviceRegistrationResponse {
  ok: boolean;
}
