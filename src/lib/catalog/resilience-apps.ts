import type { GooglePlayStatus, TestingType } from "@prisma/client";

export type CatalogApp = {
  name: string;
  packageName: string;
  playStoreUrl: string;
  googlePlayStatus: GooglePlayStatus;
  testingType: TestingType;
  testerTarget: number;
  createCampaign: boolean;
};

export const RESILIENCE_APPS: CatalogApp[] = [
  {
    name: "AI Phone Doctor",
    packageName: "com.aiphonedoctor.app",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.aiphonedoctor.app",
    googlePlayStatus: "CLOSED_TESTING",
    testingType: "CLOSED",
    testerTarget: 12,
    createCampaign: true,
  },
  {
    name: "Color Match Rush",
    packageName: "com.colormatchrush.game",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.colormatchrush.game",
    googlePlayStatus: "CLOSED_TESTING",
    testingType: "CLOSED",
    testerTarget: 12,
    createCampaign: true,
  },
  {
    name: "NET360 Preparation",
    packageName: "com.net360prep.app",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.net360prep.app",
    googlePlayStatus: "PRODUCTION",
    testingType: "CLOSED",
    testerTarget: 12,
    createCampaign: false,
  },
  {
    name: "Park Spot",
    packageName: "com.parkspotapp.mobile",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.parkspotapp.mobile",
    googlePlayStatus: "CLOSED_TESTING",
    testingType: "CLOSED",
    testerTarget: 12,
    createCampaign: true,
  },
  {
    name: "Price Alerts – Smart Shopping",
    packageName: "com.pricealerts.app",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.pricealerts.app",
    googlePlayStatus: "CLOSED_TESTING",
    testingType: "CLOSED",
    testerTarget: 12,
    createCampaign: true,
  },
  {
    name: "She360 – Women Empowerment",
    packageName: "com.she360.app",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.she360.app",
    googlePlayStatus: "CLOSED_TESTING",
    testingType: "CLOSED",
    testerTarget: 12,
    createCampaign: true,
  },
  {
    name: "Wisdom Quest",
    packageName: "com.wisdomquest.app",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.wisdomquest.app",
    googlePlayStatus: "CLOSED_TESTING",
    testingType: "CLOSED",
    testerTarget: 12,
    createCampaign: true,
  },
];
