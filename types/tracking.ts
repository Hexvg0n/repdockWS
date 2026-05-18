export type TrackingEvent = {
  date: string;
  icon: string;
  location: string;
  status: string;
};

export type TrackingData = {
  consigneeName: string;
  country: string;
  date: string;
  details: TrackingEvent[];
  lastStatus: string;
  referenceNo: string;
  source: string;
  trackingNumber: string;
};
